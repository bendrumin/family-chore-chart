import SwiftUI

/// Stands in for a Premium-only feature when the family is not entitled to it
/// (Entitlements.canUse). Names the feature plainly and opens the paywall.
struct PremiumFeatureGate: View {
    let feature: GatedFeature
    @State private var showingPaywall = false

    private var title: String {
        switch feature {
        case .themes: return "Premium themes"
        case .sharing: return "Family sharing is part of Premium"
        case .export: return "Export reports come with Premium"
        case .analytics: return "Advanced stats come with Premium"
        }
    }

    private var body_: String {
        switch feature {
        case .themes: return "Ocean, Sunset, Forest, Aurora, Coral, and Lavender come with Premium. The seasonal themes stay free."
        case .sharing: return "Invite a co-parent or guardian with their own login to the same family."
        case .export: return "PDF family reports and CSV data for spreadsheets."
        case .analytics: return "Completion trends, per-child comparisons, and streak history. Today's chores and this week's totals on Home stay free."
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .top, spacing: 12) {
                Image(systemName: "crown.fill")
                    .font(.title2)
                    .foregroundColor(.choreStarAccent)
                    .accessibilityHidden(true)
                VStack(alignment: .leading, spacing: 6) {
                    Text(title)
                        .font(.title3.weight(.bold))
                        .foregroundColor(.choreStarTextPrimary)
                    Text(body_)
                        .font(.subheadline)
                        .foregroundColor(.choreStarTextSecondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            .accessibilityElement(children: .combine)
            Button {
                showingPaywall = true
            } label: {
                HStack {
                    Image(systemName: "crown.fill")
                        .accessibilityHidden(true)
                    Text("See Premium")
                        .fontWeight(.bold)
                }
                .frame(maxWidth: .infinity, minHeight: 44)
                .padding(.vertical, 6)
                .background(Color.choreStarFill)
                .foregroundColor(.white)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            }
        }
        .padding(20)
        .background(Color.choreStarCardBackground)
        .cornerRadius(16)
        .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(Color.choreStarPrimary.opacity(0.25), lineWidth: 1))
        .sheet(isPresented: $showingPaywall) { PaywallView() }
    }
}
