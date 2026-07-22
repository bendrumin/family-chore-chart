import Foundation
import StoreKit

/// StoreKit 2 purchases for ChoreStar Premium.
///
/// Entitlement sync is upgrade-only: a verified App Store transaction can move
/// `profiles.subscription_type` from "free" to "premium"/"lifetime", but this
/// manager never downgrades — web subscriptions run through Stripe, and its
/// webhook stays the source of truth for cancellations.
@MainActor
final class StoreKitManager: ObservableObject {
    static let shared = StoreKitManager()

    enum ProductID {
        static let monthly = "com.chorestar.premium.monthly"
        static let annual = "com.chorestar.premium.annual"
        static let lifetime = "com.chorestar.premium.lifetime"
        static let all: [String] = [monthly, annual, lifetime]
    }

    @Published var products: [Product] = []
    @Published var isLoadingProducts = false
    @Published var purchaseInProgress = false
    @Published var lastError: String?

    private var updatesTask: Task<Void, Never>?

    private init() {
        updatesTask = Task { [weak self] in
            await self?.listenForTransactions()
        }
    }

    deinit {
        updatesTask?.cancel()
    }

    func loadProducts() async {
        guard products.isEmpty, !isLoadingProducts else { return }
        isLoadingProducts = true
        defer { isLoadingProducts = false }

        do {
            let loaded = try await Product.products(for: ProductID.all)
            products = loaded.sorted { $0.price < $1.price }
            lastError = nil
        } catch {
            lastError = "Couldn't load plans. Please try again later."
        }
    }

    /// Runs a purchase. Returns true if the user now has an active entitlement.
    func purchase(_ product: Product) async -> Bool {
        guard !purchaseInProgress else { return false }
        purchaseInProgress = true
        defer { purchaseInProgress = false }

        do {
            let result = try await product.purchase()

            switch result {
            case .success(let verification):
                guard case .verified(let transaction) = verification else {
                    lastError = "Purchase couldn't be verified."
                    return false
                }
                await transaction.finish()
                await syncEntitlement()
                return true

            case .userCancelled:
                return false

            case .pending:
                lastError = "Purchase is pending approval."
                return false

            @unknown default:
                return false
            }
        } catch {
            lastError = "Purchase failed: \(error.localizedDescription)"
            return false
        }
    }

    func restorePurchases() async {
        do {
            try await AppStore.sync()
            await syncEntitlement()
        } catch {
            lastError = "Restore failed: \(error.localizedDescription)"
        }
    }

    /// Checks current entitlements and pushes an upgrade to the profile if needed.
    func syncEntitlement() async {
        var entitledType: String?

        for await entitlement in Transaction.currentEntitlements {
            guard case .verified(let transaction) = entitlement,
                  ProductID.all.contains(transaction.productID) else { continue }

            if transaction.productID == ProductID.lifetime {
                entitledType = "lifetime"
                break
            }
            entitledType = "premium"
        }

        guard let entitledType = entitledType else { return }

        let manager = SupabaseManager.shared
        // Upgrade-only: lifetime beats premium, premium beats free; never downgrade
        let current = manager.subscriptionType
        let shouldUpdate = (current == "free") || (current == "premium" && entitledType == "lifetime")
        if shouldUpdate {
            await manager.updateSubscriptionType(entitledType)
        }
    }

    private func listenForTransactions() async {
        for await update in Transaction.updates {
            if case .verified(let transaction) = update {
                await transaction.finish()
                await syncEntitlement()
            }
        }
    }
}
