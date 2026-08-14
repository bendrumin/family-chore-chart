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
    private let pageCount = 4

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
                    choresPage.tag(2)
                    kidLoginPage.tag(3)
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
        if page < pageCount - 1 {
            withAnimation { page += 1 }
        } else {
            onFinish(true)
        }
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

    private var choresPage: some View {
        OnboardingPage(
            emoji: "🧹",
            title: "Chores & Routines",
            subtitle: "A little structure goes a long way",
            rows: [
                ("list.bullet.clipboard.fill", "Create chores with rewards on the Chores tab"),
                ("sparkles", "Grab a ready-made starter routine — morning, bedtime, or after school"),
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
                ("number.circle.fill", "Kids log in with your family code — no email needed"),
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
