import Foundation
import StoreKit

/// StoreKit 2 purchases for ChoreStar Premium.
///
/// Entitlement sync is upgrade-only: a verified App Store transaction can move
/// `profiles.subscription_type` from "free" to "premium", but this manager
/// never downgrades — web subscriptions run through Stripe, and its webhook
/// stays the source of truth for cancellations.
@MainActor
final class StoreKitManager: ObservableObject {
    static let shared = StoreKitManager()

    enum ProductID {
        static let monthly = "com.chorestar.premium.monthly"
        /// NOT "com.chorestar.premium.annual". That id was created in a second
        /// subscription group by mistake during the 1.0 submission; deleting it
        /// burned the id permanently — Apple reserves deleted product ids
        /// forever. The replacement must be created in App Store Connect INSIDE
        /// the existing "ChoreStar Premium" group (subs can't move between
        /// groups). PaywallView only renders products that actually load.
        static let annual = "com.chorestar.premium.yearly"
        // A one-time "lifetime" non-consumable was withdrawn before it ever
        // sold (App Review queried the $149.99 price; nobody had purchased it).
        // Premium is subscription-only now. Deleting the product id in App
        // Store Connect burns it permanently, so it can never be revived.
        static let all: [String] = [monthly, annual]
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

    /**
     Whether this Apple ID has an active AUTO-RENEWING ChoreStar subscription.

     Used by account deletion to pick honest copy. We can cancel a Stripe
     subscription server-side; no developer can cancel an Apple one — only the
     user can, in Settings → Apple ID → Subscriptions.
     */
    func hasActiveAppleSubscription() async -> Bool {
        for await entitlement in Transaction.currentEntitlements {
            guard case .verified(let transaction) = entitlement,
                  ProductID.all.contains(transaction.productID) else { continue }
            return true
        }
        return false
    }

    /// Checks current entitlements and pushes an upgrade to the profile if needed.
    func syncEntitlement() async {
        var isEntitled = false

        for await entitlement in Transaction.currentEntitlements {
            guard case .verified(let transaction) = entitlement,
                  ProductID.all.contains(transaction.productID) else { continue }
            isEntitled = true
            break
        }

        guard isEntitled else { return }

        let manager = SupabaseManager.shared
        // Upgrade-only: never downgrade. Stripe's webhook owns cancellations.
        if manager.subscriptionType == "free" {
            await manager.updateSubscriptionType("premium")
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
