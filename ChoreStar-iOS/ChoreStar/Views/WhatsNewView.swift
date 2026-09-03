import SwiftUI

/// iOS release notes. Bump `latestVersion` and prepend an entry when shipping
/// user-facing features — the sheet auto-shows once per version on the dashboard.
enum Changelog {
    static let latestVersion = "2.1"

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
            version: "2.1",
            date: "September 2026",
            title: "Allowance in Your Money",
            features: [
                Feature(
                    icon: "💰",
                    title: "More Currencies, Including the Gulf",
                    description: "Pick Saudi Riyal, UAE Dirham, and dozens more in Settings > Rewards & Currency. Rewards and allowance use that symbol everywhere on iPhone."
                ),
                Feature(
                    icon: "🌍",
                    title: "Family Time Zone",
                    description: "Set your city's time zone in the same screen. In the Gulf, Weekdays and Weekends on a new chore mean Sunday–Thursday and Friday–Saturday."
                ),
            ]
        ),
        Entry(
            version: "2.0",
            date: "September 2026",
            title: "Somewhere for the Money to Go",
            features: [
                Feature(
                    icon: "🎯",
                    title: "Goals",
                    description: "Kids pick what they are saving for, right on their screen, and watch the bar fill as their unspent allowance grows. When it is full you get a nudge to pay it out. Set or change goals from a child's page."
                ),
                Feature(
                    icon: "🛍️",
                    title: "The Reward Store",
                    description: "Price the things money cannot buy: screen time, picking dinner, staying up late. Kids see what they can afford and ask with a tap; you say yes or no from Needs Your OK on Home, and the price comes off their balance. Settings > Reward Store to set it up."
                ),
                Feature(
                    icon: "📅",
                    title: "Chores on Their Own Days",
                    description: "Pick the days a chore is due: Every day, Weekdays, Weekends, or any mix. Today's list, the week grid, and the widget only show what is due, and a day with nothing due never breaks a streak."
                ),
                Feature(
                    icon: "🔥",
                    title: "Kids See Their Streak and Badges",
                    description: "The kid dashboard now shows their day streak, this week's earnings, and how many badges they have unlocked. Tap the badges row for the full cabinet and what to earn next."
                ),
                Feature(
                    icon: "🎨",
                    title: "Kid Mode Wears Your Theme",
                    description: "The kid screen, the celebration, the confetti, the widgets, and the Live Activity all follow the seasonal or accent theme you picked. Halloween arrives in October on its own."
                ),
                Feature(
                    icon: "✅",
                    title: "Approve Chores First (Optional)",
                    description: "Turn it on in Settings and kids' ticks wait in a Needs Your OK list before they count. Approve from the alert on your phone, or send one back. Any chore can also ask for a photo."
                ),
            ]
        ),
        Entry(
            version: "1.7",
            date: "August 2026",
            title: "Feel Progress Without Opening the App",
            features: [
                Feature(
                    icon: "🔔",
                    title: "Smarter Activity Alerts",
                    description: "Tap a push when a kid finishes chores or a routine and jump straight to their page. Turn alerts on or off in Settings."
                ),
                Feature(
                    icon: "📱",
                    title: "Widget Deep Links",
                    description: "Tap Today's Progress (or a child on the medium widget) to open the right place in ChoreStar."
                ),
                Feature(
                    icon: "🔒",
                    title: "Lock Screen Widget",
                    description: "A new rectangular Lock Screen widget shows who's ahead on today's chores."
                ),
            ]
        ),
        Entry(
            version: "1.1",
            date: "July 2026",
            title: "The Big Catch-Up",
            features: [
                Feature(
                    icon: "🧒",
                    title: "Kid Login on Any Device",
                    description: "Kids can now sign in on their own iPad or iPhone with just the family code and their PIN, no parent account needed."
                ),
                Feature(
                    icon: "📊",
                    title: "Insights Charts",
                    description: "The Stats tab now shows your family's weekly completion trend and a per-child comparison chart."
                ),
                Feature(
                    icon: "🏆",
                    title: "10 Achievement Badges",
                    description: "The full badge collection from the web app (with rarity tiers and progress bars) is now on iOS."
                ),
                Feature(
                    icon: "💡",
                    title: "Smart Chore Suggestions",
                    description: "Adding a chore now suggests age-appropriate, seasonal ideas tailored to each child."
                ),
                Feature(
                    icon: "👑",
                    title: "Premium in the App",
                    description: "Upgrade to ChoreStar Premium right from Settings, monthly or annual."
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
