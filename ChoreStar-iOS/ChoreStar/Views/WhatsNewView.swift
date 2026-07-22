import SwiftUI

/// iOS release notes. Bump `latestVersion` and prepend an entry when shipping
/// user-facing features — the sheet auto-shows once per version on the dashboard.
enum Changelog {
    static let latestVersion = "1.1"

    struct Feature: Identifiable {
        let icon: String
        let title: String
        let description: String
        var id: String { title }
    }

    struct Entry: Identifiable {
        let version: String
        let date: String
        let title: String
        let features: [Feature]
        var id: String { version }
    }

    static let entries: [Entry] = [
        Entry(
            version: "1.1",
            date: "July 2026",
            title: "The Big Catch-Up",
            features: [
                Feature(
                    icon: "🧒",
                    title: "Kid Login on Any Device",
                    description: "Kids can now sign in on their own iPad or iPhone with just the family code and their PIN — no parent account needed."
                ),
                Feature(
                    icon: "📊",
                    title: "Insights Charts",
                    description: "The Stats tab now shows your family's weekly completion trend and a per-child comparison chart."
                ),
                Feature(
                    icon: "🏆",
                    title: "10 Achievement Badges",
                    description: "The full badge collection from the web app — with rarity tiers and progress bars — is now on iOS."
                ),
                Feature(
                    icon: "💡",
                    title: "Smart Chore Suggestions",
                    description: "Adding a chore now suggests age-appropriate, seasonal ideas tailored to each child."
                ),
                Feature(
                    icon: "👑",
                    title: "Premium in the App",
                    description: "Upgrade to ChoreStar Premium right from Settings — monthly, annual, or lifetime."
                ),
                Feature(
                    icon: "📱",
                    title: "Better on iPad",
                    description: "Chores, routines, and stats now use multi-column layouts that make the most of the big screen."
                ),
            ]
        ),
    ]
}

struct WhatsNewView: View {
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    ForEach(Changelog.entries) { entry in
                        VStack(alignment: .leading, spacing: 16) {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(entry.title)
                                    .font(.title2)
                                    .fontWeight(.bold)
                                    .foregroundColor(.choreStarTextPrimary)

                                Text("Version \(entry.version) · \(entry.date)")
                                    .font(.caption)
                                    .foregroundColor(.choreStarTextSecondary)
                            }

                            ForEach(entry.features) { feature in
                                HStack(alignment: .top, spacing: 14) {
                                    Text(feature.icon)
                                        .font(.title2)

                                    VStack(alignment: .leading, spacing: 4) {
                                        Text(feature.title)
                                            .font(.headline)
                                            .foregroundColor(.choreStarTextPrimary)

                                        Text(feature.description)
                                            .font(.subheadline)
                                            .foregroundColor(.choreStarTextSecondary)
                                            .fixedSize(horizontal: false, vertical: true)
                                    }
                                }
                                .padding(14)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .background(Color.choreStarCardBackground)
                                .cornerRadius(14)
                            }
                        }
                    }

                    Button(action: { dismiss() }) {
                        Text("Awesome!")
                            .font(.headline)
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(Color.choreStarGradient)
                            .cornerRadius(16)
                    }
                    .padding(.top, 8)
                }
                .frame(maxWidth: 560)
                .frame(maxWidth: .infinity)
                .padding(24)
            }
            .background(Color.choreStarBackground)
            .navigationTitle("What's New")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

#Preview {
    WhatsNewView()
}
