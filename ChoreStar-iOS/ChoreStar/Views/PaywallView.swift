import SwiftUI
import StoreKit

struct PaywallView: View {
    @EnvironmentObject var manager: SupabaseManager
    @StateObject private var store = StoreKitManager.shared
    @Environment(\.dismiss) var dismiss

    @State private var selectedProductID: String?
    @State private var showingSuccess = false

    private var selectedProduct: Product? {
        store.products.first { $0.id == selectedProductID }
            ?? store.products.first { $0.id == StoreKitManager.ProductID.annual }
            ?? store.products.first
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // Hero
                    VStack(spacing: 12) {
                        Image(systemName: "crown.fill")
                            .font(.system(size: 48))
                            .foregroundStyle(
                                LinearGradient(colors: [.yellow, .orange], startPoint: .topLeading, endPoint: .bottomTrailing)
                            )

                        Text("ChoreStar Premium")
                            .font(.system(size: 30, weight: .bold, design: .rounded))
                            .foregroundColor(.choreStarTextPrimary)

                        Text("Everything your family needs to make chores fun")
                            .font(.subheadline)
                            .foregroundColor(.choreStarTextSecondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding(.top, 16)

                    // Features
                    VStack(alignment: .leading, spacing: 14) {
                        premiumFeature(icon: "infinity", text: "Unlimited children & chores")
                        premiumFeature(icon: "paintbrush.fill", text: "Premium themes")
                        premiumFeature(icon: "chart.bar.fill", text: "Full insights & analytics")
                        premiumFeature(icon: "heart.fill", text: "Support an indie family app")
                    }
                    .padding(20)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color.choreStarCardBackground)
                    .cornerRadius(16)

                    // Plans
                    if store.isLoadingProducts {
                        ProgressView("Loading plans…")
                            .padding(.vertical, 30)
                    } else if store.products.isEmpty {
                        VStack(spacing: 8) {
                            Text("Plans aren't available right now.")
                                .font(.subheadline)
                                .foregroundColor(.choreStarTextSecondary)
                            Text("You can also upgrade at chorestar.app")
                                .font(.caption)
                                .foregroundColor(.choreStarTextSecondary)
                        }
                        .padding(.vertical, 20)
                    } else {
                        VStack(spacing: 12) {
                            ForEach(store.products, id: \.id) { product in
                                planCard(product)
                            }
                        }
                    }

                    // Purchase button
                    if let product = selectedProduct {
                        Button {
                            Task {
                                let success = await store.purchase(product)
                                if success {
                                    showingSuccess = true
                                }
                            }
                        } label: {
                            HStack {
                                if store.purchaseInProgress {
                                    ProgressView().tint(.white)
                                } else {
                                    Image(systemName: "crown.fill")
                                }
                                Text("Continue")
                                    .fontWeight(.bold)
                            }
                            .font(.headline)
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(Color.choreStarGradient)
                            .cornerRadius(16)
                        }
                        .disabled(store.purchaseInProgress)
                    }

                    if let error = store.lastError {
                        Text(error)
                            .font(.caption)
                            .foregroundColor(.red)
                            .multilineTextAlignment(.center)
                    }

                    Button("Restore Purchases") {
                        Task { await store.restorePurchases() }
                    }
                    .font(.subheadline)
                    .foregroundColor(.choreStarPrimary)

                    Text("Subscriptions renew automatically until cancelled in Settings. Web subscriptions are managed at chorestar.app.")
                        .font(.caption2)
                        .foregroundColor(.choreStarTextSecondary)
                        .multilineTextAlignment(.center)
                        .padding(.bottom, 20)
                }
                .frame(maxWidth: 560)
                .frame(maxWidth: .infinity)
                .padding(.horizontal, 24)
            }
            .background(Color.choreStarBackground)
            .navigationTitle("Premium")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
        }
        .task {
            await store.loadProducts()
        }
        .alert("Welcome to Premium! 🎉", isPresented: $showingSuccess) {
            Button("Let's Go!") { dismiss() }
        } message: {
            Text("Your family now has unlimited children, chores, and premium themes.")
        }
    }

    private func planCard(_ product: Product) -> some View {
        let isSelected = product.id == selectedProduct?.id
        let isAnnual = product.id == StoreKitManager.ProductID.annual

        return Button {
            selectedProductID = product.id
        } label: {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 8) {
                        Text(product.displayName.isEmpty ? planFallbackName(product.id) : product.displayName)
                            .font(.headline)
                            .foregroundColor(.choreStarTextPrimary)

                        if isAnnual {
                            Text("BEST VALUE")
                                .font(.caption2)
                                .fontWeight(.bold)
                                .foregroundColor(.white)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 3)
                                .background(Color.choreStarSuccess)
                                .cornerRadius(8)
                        }
                    }

                    Text(planPeriodText(product))
                        .font(.caption)
                        .foregroundColor(.choreStarTextSecondary)
                }

                Spacer()

                Text(product.displayPrice)
                    .font(.title3)
                    .fontWeight(.bold)
                    .foregroundColor(.choreStarTextPrimary)

                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .font(.title3)
                    .foregroundColor(isSelected ? .choreStarPrimary : .choreStarTextSecondary.opacity(0.4))
            }
            .padding(16)
            .background(Color.choreStarCardBackground)
            .cornerRadius(16)
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .strokeBorder(isSelected ? Color.choreStarPrimary : Color.clear, lineWidth: 2)
            )
        }
        .buttonStyle(PlainButtonStyle())
    }

    private func planFallbackName(_ productID: String) -> String {
        switch productID {
        case StoreKitManager.ProductID.monthly: return "Monthly"
        case StoreKitManager.ProductID.annual: return "Annual"
        case StoreKitManager.ProductID.lifetime: return "Lifetime"
        default: return "Premium"
        }
    }

    private func planPeriodText(_ product: Product) -> String {
        if product.id == StoreKitManager.ProductID.lifetime {
            return "One-time purchase, forever"
        }
        if let period = product.subscription?.subscriptionPeriod {
            switch period.unit {
            case .year: return "Billed yearly"
            case .month: return "Billed monthly"
            case .week: return "Billed weekly"
            case .day: return "Billed daily"
            @unknown default: return "Subscription"
            }
        }
        return "Subscription"
    }

    private func premiumFeature(icon: String, text: String) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.subheadline)
                .foregroundColor(.choreStarPrimary)
                .frame(width: 24)

            Text(text)
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundColor(.choreStarTextPrimary)
        }
    }
}

#Preview {
    PaywallView()
        .environmentObject(SupabaseManager.shared)
}
