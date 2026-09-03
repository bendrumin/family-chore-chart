import SwiftUI

/// First-run wizard for brand-new families. Shown once, from MainTabs, when a
/// parent signs in with no children yet. Walks through the three things a new
/// family needs to know — add kids, create chores/routines, hand the phone to
/// the kid — and lands on the Family tab to add the first child.
struct OnboardingView: View {
    @EnvironmentObject var manager: SupabaseManager
    @EnvironmentObject var themeManager: ThemeManager

    /// Called exactly once when the wizard closes. `true` means the user
    /// tapped the final call-to-action and wants to add their first child.
    let onFinish: (_ goToFamily: Bool) -> Void

    @State private var page = 0
    private let pageCount = 5

    /// Rewards page state. Saved when the user moves past that page, so a family
    /// picks how earning works for THEIR household instead of inheriting a default.
    @State private var rewardMode = "flat"
    @State private var dailyAmountText = "1.00"
    private let rewardsPageIndex = 2

    var body: some View {
        ZStack {
            themeManager.gradient
                .ignoresSafeArea()

            VStack(spacing: 0) {
                HStack {
                    Spacer()
                    Button("Skip") {
                        onFinish(false)
                    }
                    .font(.headline)
                    .foregroundColor(.white.opacity(0.8))
                    .padding()
                }

                TabView(selection: $page) {
                    welcomePage.tag(0)
                    familyPage.tag(1)
                    rewardsPage.tag(2)
                    choresPage.tag(3)
                    kidLoginPage.tag(4)
                }
                .tabViewStyle(.page(indexDisplayMode: .always))
                .indexViewStyle(.page(backgroundDisplayMode: .always))

                Button(action: advance) {
                    Text(page == pageCount - 1 ? "Add Your First Child" : "Next")
                        .font(.headline)
                        .foregroundColor(themeManager.accentColor)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.white)
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 8)

                Button("I'll explore on my own") {
                    onFinish(false)
                }
                .font(.subheadline)
                .foregroundColor(.white.opacity(0.7))
                .padding(.bottom, 24)
                .opacity(page == pageCount - 1 ? 1 : 0)
                .animation(.easeInOut(duration: 0.2), value: page)
            }
        }
        .interactiveDismissDisabled()
    }

    private func advance() {
        if page == rewardsPageIndex {
            saveRewards()
        }
        if page < pageCount - 1 {
            withAnimation { page += 1 }
        } else {
            onFinish(true)
        }
    }

    private var dailyCents: Int {
        let cleaned = dailyAmountText.replacingOccurrences(of: ",", with: ".").filter { "0123456789.".contains($0) }
        guard let dollars = Double(cleaned), dollars >= 0 else { return 100 }
        return Int((dollars * 100).rounded())
    }

    private func saveRewards() {
        let mode = rewardMode
        let cents = dailyCents
        let existing = manager.familySettings
        Task {
            _ = await manager.updateFamilyRewards(
                rewardMode: mode,
                dailyRewardCents: cents,
                weeklyBonusCents: existing?.weeklyBonusCents ?? 0,
                currencyCode: existing?.currencyCode ?? "USD",
                timezone: Self.resolvedTimezone(stored: existing?.timezone)
            )
        }
    }

    private static func resolvedTimezone(stored: String?) -> String {
        if let stored, stored != "UTC", !stored.isEmpty, TimeZone(identifier: stored) != nil {
            return stored
        }
        return TimeZone.current.identifier
    }

    // MARK: - Pages

    private var welcomePage: some View {
        OnboardingPage(
            emoji: "⭐️",
            title: "Welcome to ChoreStar!",
            subtitle: "Make chores fun for the whole family",
            rows: [
                ("checkmark.circle.fill", "Kids check off chores and earn rewards"),
                ("sparkles", "Confetti, badges, and celebrations keep them going"),
                ("dollarsign.circle.fill", "Allowance adds up automatically")
            ]
        )
    }

    private var familyPage: some View {
        OnboardingPage(
            emoji: "👨‍👩‍👧‍👦",
            title: "Add Your Kids",
            subtitle: "Everyone gets their own avatar",
            rows: [
                ("person.crop.circle.badge.plus", "Add each child on the Family tab"),
                ("camera.fill", "Snap a photo or pick a fun avatar"),
                ("lock.circle.fill", "Set a 4-digit PIN so kids can log in themselves")
            ]
        )
    }

    private var rewardsPage: some View {
        let symbol = manager.familySettings?.currencySymbol ?? "$"
        return VStack(spacing: 24) {
            Spacer()

            Text("💰")
                .font(.system(size: 80))

            VStack(spacing: 8) {
                Text("How Should Rewards Work?")
                    .font(.system(.largeTitle, design: .rounded).weight(.bold))
                    .foregroundColor(.white)
                    .multilineTextAlignment(.center)

                Text("Every household is different. Pick what fits yours.")
                    .font(.title3)
                    .foregroundColor(.white.opacity(0.9))
                    .multilineTextAlignment(.center)
            }
            .padding(.horizontal, 24)

            VStack(alignment: .leading, spacing: 16) {
                Picker("Reward mode", selection: $rewardMode) {
                    Text("One daily amount").tag("flat")
                    Text("Per chore").tag("per_chore")
                }
                .pickerStyle(.segmented)
                .colorMultiply(.white)

                if rewardMode == "flat" {
                    Text("Kids earn a set amount for each day they finish all their chores.")
                        .font(.subheadline)
                        .foregroundColor(.white)
                        .fixedSize(horizontal: false, vertical: true)

                    HStack(spacing: 8) {
                        Text(symbol)
                            .font(.title2.weight(.semibold))
                            .foregroundColor(.white)
                        TextField("1.00", text: $dailyAmountText)
                            .keyboardType(.decimalPad)
                            .font(.title2.weight(.semibold))
                            .foregroundColor(.choreStarTextPrimary)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 10)
                            .background(Color.white)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                            .frame(maxWidth: 140)
                        Text("per day")
                            .font(.subheadline)
                            .foregroundColor(.white.opacity(0.9))
                    }

                    HStack(spacing: 8) {
                        ForEach(["0.50", "1.00", "2.00", "5.00"], id: \.self) { preset in
                            Button(preset) { dailyAmountText = preset }
                                .font(.subheadline.weight(.semibold))
                                .foregroundColor(dailyAmountText == preset ? .choreStarTextPrimary : .white)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 6)
                                .background(dailyAmountText == preset ? Color.white : Color.white.opacity(0.2))
                                .clipShape(Capsule())
                        }
                    }
                } else {
                    Text("Each chore gets its own reward, so bigger jobs can be worth more. You set the amount when you add a chore.")
                        .font(.subheadline)
                        .foregroundColor(.white)
                        .fixedSize(horizontal: false, vertical: true)
                }

                Text("You can change this anytime in Settings.")
                    .font(.footnote)
                    .foregroundColor(.white.opacity(0.75))
            }
            .padding(20)
            .background(Color.white.opacity(0.15))
            .clipShape(RoundedRectangle(cornerRadius: 20))
            .padding(.horizontal, 24)

            Spacer()
            Spacer()
        }
    }

    private var choresPage: some View {
        OnboardingPage(
            emoji: "🧹",
            title: "Chores & Routines",
            subtitle: "A little structure goes a long way",
            rows: [
                ("list.bullet.clipboard.fill", "Create chores with rewards on the Chores tab"),
                ("sparkles", "Grab a ready-made starter routine (morning, bedtime, or after school)"),
                ("lightbulb.fill", "Not sure where to start? We suggest chores by age")
            ]
        )
    }

    private var kidLoginPage: some View {
        OnboardingPage(
            emoji: "🚀",
            title: "Hand It to Your Kid",
            subtitle: kidLoginSubtitle,
            rows: [
                ("number.circle.fill", "Kids log in with your family code, no email needed"),
                ("hand.tap.fill", "Big buttons and celebrations, made for small hands"),
                ("gearshape.fill", "Find your family code anytime in Settings")
            ]
        )
    }

    private var kidLoginSubtitle: String {
        if let code = manager.kidLoginCode, !code.isEmpty {
            return "Your family code is \(code)"
        }
        return "Kid mode is built right in"
    }
}

private struct OnboardingPage: View {
    let emoji: String
    let title: String
    let subtitle: String
    let rows: [(icon: String, text: String)]

    var body: some View {
        VStack(spacing: 24) {
            Spacer()

            Text(emoji)
                .font(.system(size: 80))

            VStack(spacing: 8) {
                Text(title)
                    .font(.system(.largeTitle, design: .rounded).weight(.bold))
                    .foregroundColor(.white)
                    .multilineTextAlignment(.center)

                Text(subtitle)
                    .font(.title3)
                    .foregroundColor(.white.opacity(0.9))
                    .multilineTextAlignment(.center)
            }
            .padding(.horizontal, 24)

            VStack(alignment: .leading, spacing: 16) {
                ForEach(rows, id: \.text) { row in
                    HStack(spacing: 12) {
                        Image(systemName: row.icon)
                            .font(.title3)
                            .foregroundColor(.white)
                            .frame(width: 32)
                        Text(row.text)
                            .font(.body)
                            .foregroundColor(.white)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
            }
            .padding(20)
            .background(Color.white.opacity(0.15))
            .clipShape(RoundedRectangle(cornerRadius: 20))
            .padding(.horizontal, 24)

            Spacer()
            Spacer()
        }
    }
}

#Preview {
    OnboardingView { _ in }
        .environmentObject(SupabaseManager.shared)
        .environmentObject(ThemeManager.shared)
}
