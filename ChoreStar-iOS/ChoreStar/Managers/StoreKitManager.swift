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
    private var purchaseIntentsTask: Task<Void, Never>?

    private init() {
        updatesTask = Task { [weak self] in
            await self?.listenForTransactions()
        }
        purchaseIntentsTask = Task { [weak self] in
            await self?.listenForPurchaseIntents()
        }
    }

    deinit {
        updatesTask?.cancel()
        purchaseIntentsTask?.cancel()
    }

    /// App Store promoted in-app purchases. When someone taps a promoted
    /// subscription on the product page (or in search), StoreKit delivers the
    /// intent here and we run the purchase. Without this listener the tap is
    /// dropped, and App Store Connect will not let the promotion be enabled.
    private func listenForPurchaseIntents() async {
        for await intent in PurchaseIntent.intents {
            _ = await purchase(intent.product)
        }
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
            // Stamp the purchase with the profile id so App Store Server
            // Notifications can map every later renewal, refund, or expiry to
            // this family server-side (/api/apple/notifications).
            var options: Set<Product.PurchaseOption> = []
            if let uid = SupabaseManager.shared.debugUserId, let token = UUID(uuidString: uid) {
                options.insert(.appAccountToken(token))
            }
            let result = try await product.purchase(options: options)

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

    enum EntitlementSync {
        /// This Apple ID has no active ChoreStar subscription.
        case none
        /// The server confirmed it; Premium is on.
        case premium
        /// The subscription was bought by a different ChoreStar account.
        case otherAccount
        /// Couldn't reach the server to confirm.
        case unreachable
    }

    /// What to tell the parent after Restore Purchases.
    static func restoreMessage(_ result: EntitlementSync) -> String {
        switch result {
        case .premium: return String(localized: "Purchases restored. Premium is on.")
        case .none: return String(localized: "No ChoreStar subscription was found for this Apple ID.")
        case .otherAccount: return String(localized: "This Apple ID's subscription couldn't be applied to this ChoreStar account.")
        case .unreachable: return String(localized: "Couldn't restore right now. Check your connection and try again.")
        }
    }

    /// Restore Purchases: re-syncs with the App Store, then confirms with the
    /// server, so the button can say what happened instead of nothing.
    func restorePurchases() async -> EntitlementSync {
        do {
            try await AppStore.sync()
        } catch {
            lastError = "Restore failed: \(error.localizedDescription)"
            return .unreachable
        }
        return await syncEntitlement()
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

    /// Checks current entitlements and has the server confirm an upgrade.
    @discardableResult
    func syncEntitlement() async -> EntitlementSync {
        var signed: String?

        for await entitlement in Transaction.currentEntitlements {
            guard case .verified(let transaction) = entitlement,
                  ProductID.all.contains(transaction.productID) else { continue }
            signed = entitlement.jwsRepresentation
            break
        }

        guard let signed else { return .none }

        let manager = SupabaseManager.shared
        // Upgrade-only: never downgrade. Cancellations are handled server-side:
        // /api/apple/notifications for Apple billing, Stripe's webhook for web.
        // The server saves the upgrade (and the original transaction id the
        // notifications map by); the app only mirrors the answer.
        switch await manager.verifyAppleEntitlement(signedTransaction: signed) {
        case .none: return .unreachable
        case .some(false): return .otherAccount
        case .some(true):
            await MainActor.run {
                if manager.subscriptionType == "free" {
                    manager.subscriptionType = "premium"
                }
            }
            return .premium
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
