import SwiftUI
import StoreKit

struct DashboardView: View {
    @EnvironmentObject var manager: SupabaseManager
    @EnvironmentObject var themeManager: ThemeManager
    @Environment(\.requestReview) private var requestReview
    @State private var showConfetti = false
    @State private var showAchievementAlert = false
    @State private var earnedAchievements: [Achievement] = []
    // What's New no longer auto-presents — it fought the onboarding cover
    // for the modal slot on first launch, and interrupts everyone else.
    // It lives behind Settings → About → What's New instead.
    @State private var showingKidMode = false
    @State private var showPerfectDay = false
    @State private var showRateCard = false

    private var completedChores: Int {
        manager.chores.filter { manager.isChoreCompleted($0) }.count
    }

    private var totalChores: Int {
        manager.chores.count
    }

    private var completionPercentage: Double {
        guard totalChores > 0 else { return 0 }
        return Double(completedChores) / Double(totalChores)
    }
    
    private var greeting: String {
        let hour = Calendar.current.component(.hour, from: Date())
        switch hour {
        case 0..<12:
            return "Good morning! ☀️"
        case 12..<17:
            return "Good afternoon! 👋"
        case 17..<21:
            return "Good evening! 🌆"
        default:
            return "Good night! 🌙"
        }
    }

    private func childProgress(_ child: Child) -> Double {
        let childChores = manager.chores.filter { $0.childId == child.id }
        guard !childChores.isEmpty else { return 0 }
        let done = childChores.filter { manager.isChoreCompleted($0) }.count
        return Double(done) / Double(childChores.count)
    }

    private func childProgressText(_ child: Child) -> String {
        let childChores = manager.chores.filter { $0.childId == child.id }
        let done = childChores.filter { manager.isChoreCompleted($0) }.count
        return "\(done)/\(childChores.count)"
    }

    private var earnedTodayText: String {
        let total = manager.children.reduce(0.0) { $0 + manager.calculateTodayEarnings(for: $1.id) }
        return manager.formatMoney(total)
    }

    /**
     Whole family, whole week — the running total a parent actually pays out.

     Summed per child from calculateWeeklyStats, which already applies the
     canonical rules (flat mode pays the daily rate only on a perfect day; the
     weekly bonus needs 7/7), so this figure always agrees with the Stats tab
     and the web dashboard rather than being a fourth reimplementation.
     */
    private var earnedThisWeekText: String {
        let total = manager.children.reduce(0.0) { $0 + manager.calculateWeeklyStats(for: $1.id).totalEarnings }
        return manager.formatMoney(total)
    }

    private var familyStreak: Int {
        manager.calculateAggregateWeeklyStats().streak
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(spacing: 24) {
                    // Hero: today at a glance, Activity-ring style
                    HStack(spacing: 20) {
                        VStack(alignment: .leading, spacing: 6) {
                            Text(Date.now, format: .dateTime.weekday(.wide).month(.wide).day())
                                .font(.caption2)
                                .fontWeight(.bold)
                                .textCase(.uppercase)
                                .foregroundColor(.white.opacity(0.75))

                            Text(greeting)
                                .font(.subheadline)
                                .fontWeight(.semibold)
                                .foregroundColor(.white.opacity(0.92))

                            Text(totalChores == 0
                                 ? "No chores yet"
                                 : "\(completedChores) of \(totalChores) done")
                                .font(.system(.title2, design: .rounded).weight(.bold))
                                .foregroundColor(.white)
                                .contentTransition(.numericText(value: Double(completedChores)))
                                .animation(.snappy, value: completedChores)

                            HStack(spacing: 5) {
                                Image(systemName: "star.circle.fill")
                                    .font(.subheadline)
                                    .foregroundColor(.yellow)
                                Text("\(earnedTodayText) today")
                                    .font(.subheadline)
                                    .foregroundColor(.white.opacity(0.9))
                                    .contentTransition(.numericText())
                                    .animation(.snappy, value: earnedTodayText)

                                Text("·")
                                    .font(.subheadline)
                                    .foregroundColor(.white.opacity(0.55))

                                Text("\(earnedThisWeekText) this week")
                                    .font(.subheadline)
                                    .foregroundColor(.white.opacity(0.9))
                                    .contentTransition(.numericText())
                                    .animation(.snappy, value: earnedThisWeekText)
                            }

                            if familyStreak >= 2 {
                                HStack(spacing: 5) {
                                    Image(systemName: "flame.fill")
                                        .font(.subheadline)
                                        .foregroundColor(.yellow)
                                        .symbolEffect(.pulse, options: .repeating)
                                    Text("\(familyStreak)-day streak")
                                        .font(.subheadline)
                                        .fontWeight(.semibold)
                                        .foregroundColor(.white)
                                }
                                .padding(.top, 2)
                            }
                        }

                        Spacer()

                        ProgressRing(progress: completionPercentage, lineWidth: 11, tint: .white) {
                            if completionPercentage >= 1.0, totalChores > 0 {
                                Image(systemName: "checkmark")
                                    .font(.system(size: 26, weight: .bold))
                                    .foregroundColor(.white)
                            } else {
                                Text("\(Int(completionPercentage * 100))%")
                                    .font(.system(.title3, design: .rounded).weight(.bold))
                                    .foregroundColor(.white)
                                    .contentTransition(.numericText(value: completionPercentage))
                                    .animation(.snappy, value: completionPercentage)
                            }
                        }
                        .frame(width: 88, height: 88)
                    }
                    .padding(20)
                    .background(
                        ZStack {
                            themeManager.gradient

                            // Living theme: ambient particles (snow, hearts, leaves…)
                            if let glyph = ThemeParticleOverlay.glyph(for: themeManager.activeTheme) {
                                ThemeParticleOverlay(glyph: glyph)
                            }
                        }
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 20, style: .continuous)
                            .strokeBorder(Color.white.opacity(0.25), lineWidth: 1)
                    )
                    .shadow(color: themeManager.accentColor.opacity(0.35), radius: 22, x: 0, y: 10)
                    .padding(.horizontal, 20)
                    .padding(.top, 4)

                    // New families see a self-dismissing setup checklist; it
                    // disappears forever once a child, a chore, and a routine
                    // all exist.
                    if manager.children.isEmpty || manager.chores.isEmpty || manager.routines.isEmpty {
                        gettingStartedCard
                            .padding(.horizontal, 20)
                    }

                    if showRateCard {
                        RateChoreStarCard(
                            onRate: {
                                ReviewPrompter.completeRateCard()
                                withAnimation { showRateCard = false }
                            },
                            onNotNow: {
                                ReviewPrompter.snoozeRateCard()
                                withAnimation { showRateCard = false }
                            }
                        )
                        .transition(.opacity)
                    }

                    // Family: avatar ring chips, Fitness sharing-style
                    if !manager.children.isEmpty {
                        VStack(alignment: .leading, spacing: 12) {
                            AppSectionHeader(title: "Family")
                                .padding(.horizontal, 20)

                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 12) {
                                    ForEach(manager.children) { child in
                                        NavigationLink(destination: ChildDetailView(child: child)) {
                                            AvatarRingChip(
                                                child: child,
                                                progress: childProgress(child),
                                                detailText: childProgressText(child)
                                            )
                                        }
                                        .buttonStyle(PlainButtonStyle())
                                    }
                                }
                                .padding(.horizontal, 20)
                            }
                        }
                    }

                    // Today's Chores
                    if !manager.chores.isEmpty {
                        VStack(alignment: .leading, spacing: 12) {
                            AppSectionHeader(title: "Today's Chores", trailing: "\(completedChores)/\(totalChores)")
                                .padding(.horizontal, 20)

                            // Flat rate: say what the day is worth, since the rows
                            // deliberately carry no per-chore amounts.
                            if !manager.isPerChoreRewardMode, let settings = manager.familySettings {
                                Text("Each child earns \(manager.formatMoney(Double(settings.dailyRewardCents) / 100.0)) for finishing all of their chores today.")
                                    .font(.caption)
                                    .foregroundColor(.choreStarTextSecondary)
                                    .padding(.horizontal, 20)
                            }

                            LazyVGrid(
                                columns: [GridItem(.adaptive(minimum: 330, maximum: 560), spacing: 12, alignment: .top)],
                                alignment: .center,
                                spacing: 8
                            ) {
                                ForEach(manager.chores, id: \.id) { chore in
                                    ChoreCard(
                                        chore: chore,
                                        manager: manager,
                                        onComplete: {
                                            showConfetti = true
                                        },
                                        earnedAchievements: $earnedAchievements,
                                        showAchievementAlert: $showAchievementAlert
                                    )
                                    .scrollTransition { content, phase in
                                        content
                                            .opacity(phase.isIdentity ? 1 : 0.5)
                                            .scaleEffect(phase.isIdentity ? 1 : 0.95)
                                    }
                                }
                            }
                            .padding(.horizontal, 20)
                        }
                    }

                    Spacer(minLength: 100) // Bottom padding for tab bar
                }
                .padding(.top, 10)
            }
            .background(ThemedScreenBackground())
            .refreshable {
                manager.refreshData()
            }
            .navigationTitle("Home")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                if manager.children.contains(where: { manager.childHasPin($0.id) }) {
                    ToolbarItem(placement: .primaryAction) {
                        Button {
                            showingKidMode = true
                        } label: {
                            Label("Kid Mode", systemImage: "figure.child.circle.fill")
                        }
                    }
                }
            }
            .sheet(isPresented: $showingKidMode) {
                ChildAuthView()
            }
        }
        .onAppear {
            showRateCard = ReviewPrompter.shouldShowRateCard()
        }
        .onChange(of: completedChores) { oldValue, newValue in
            // Celebrate crossing the finish line (not on initial load)
            if totalChores > 0, newValue == totalChores, oldValue == totalChores - 1 {
                showPerfectDay = true
            }
        }
        .overlay {
            if showPerfectDay {
                PerfectDayOverlay {
                    withAnimation(.easeOut(duration: 0.3)) {
                        showPerfectDay = false
                    }
                    // Happiest parent-side moment in the app — the only place
                    // we ever ask for a rating (never in kid mode). The gate
                    // in ReviewPrompter keeps it to engaged families, rarely.
                    if ReviewPrompter.recordPerfectDayAndCheck() {
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) {
                            requestReview()
                        }
                    }
                }
            }
        }
        .confetti(isPresented: $showConfetti)
        .alert("🏆 Achievement Unlocked!", isPresented: $showAchievementAlert) {
            Button("Awesome!", role: .cancel) { }
        } message: {
            if let first = earnedAchievements.first {
                Text("\(first.badgeIcon) \(first.badgeName)\n\(first.badgeDescription)")
            }
        }
    }

    // MARK: - Getting started checklist

    private var gettingStartedCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 8) {
                Image(systemName: "flag.checkered")
                    .foregroundColor(.choreStarPrimary)
                Text("Getting Started")
                    .font(.headline)
                    .foregroundColor(.choreStarTextPrimary)
            }

            gettingStartedRow(
                done: !manager.children.isEmpty,
                title: "Add your first child",
                hint: "Family tab → the + button"
            )
            gettingStartedRow(
                done: !manager.chores.isEmpty,
                title: "Create a chore",
                hint: "Chores tab → New Chore"
            )
            gettingStartedRow(
                done: !manager.routines.isEmpty,
                title: "Set up a routine",
                hint: "Chores tab → Routines → Starter Routines"
            )
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.choreStarCardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .strokeBorder(Color.choreStarPrimary.opacity(0.25), lineWidth: 1)
        )
    }

    private func gettingStartedRow(done: Bool, title: String, hint: String) -> some View {
        HStack(spacing: 12) {
            Image(systemName: done ? "checkmark.circle.fill" : "circle")
                .font(.title3)
                .foregroundColor(done ? .green : .choreStarTextSecondary)
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(.choreStarTextPrimary)
                    .strikethrough(done, color: .choreStarTextSecondary)
                if !done {
                    Text(hint)
                        .font(.caption)
                        .foregroundColor(.choreStarTextSecondary)
                }
            }
            Spacer()
        }
    }
}

struct ChoreCard: View {
    let chore: Chore
    @ObservedObject var manager: SupabaseManager
    var onComplete: (() -> Void)? = nil
    @Binding var earnedAchievements: [Achievement]
    @Binding var showAchievementAlert: Bool
    
    private var isCompleted: Bool {
        manager.isChoreCompleted(chore)
    }
    
    private var childName: String {
        manager.children.first(where: { $0.id == chore.childId })?.name ?? "Unknown"
    }

    private var childColor: Color {
        Color.fromString(manager.children.first(where: { $0.id == chore.childId })?.avatarColor ?? "")
    }

    var body: some View {
        Button(action: toggle) {
            HStack(spacing: 12) {
                Image(systemName: isCompleted ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 26, weight: .medium))
                    .foregroundColor(isCompleted ? .choreStarSuccess : Color.choreStarTextSecondary.opacity(0.45))
                    .symbolEffect(.bounce, value: isCompleted)
                    .contentShape(Circle())
                    .animation(.spring(response: 0.35, dampingFraction: 0.65), value: isCompleted)

                AdaptiveIcon(icon: chore.icon, fallbackSymbol: "checklist", tint: childColor, iconSize: 26)
                    .font(.title3)
                    .frame(width: 30, height: 30)
                    .saturation(isCompleted ? 0.3 : 1)
                    .opacity(isCompleted ? 0.5 : 1)

                VStack(alignment: .leading, spacing: 3) {
                    Text(chore.name)
                        .font(.body)
                        .fontWeight(.medium)
                        .foregroundColor(isCompleted ? .choreStarTextSecondary : .choreStarTextPrimary)
                        .strikethrough(isCompleted, color: .choreStarTextSecondary)
                        .lineLimit(1)

                    Text(childName)
                        .font(.caption)
                        .foregroundColor(.choreStarTextSecondary)
                }

                Spacer()

                // Per-chore money is only real in per-chore mode. On the flat
                // daily rate these amounts are ignored by the earnings math, and
                // stamping them on every row is exactly what made a family think
                // three 8c chores paid 24c. Web hides them the same way.
                if manager.isPerChoreRewardMode {
                    Text(manager.formatMoney(chore.reward))
                        .font(.system(.subheadline, design: .rounded).weight(.semibold))
                        .foregroundColor(isCompleted ? .choreStarSuccess : .choreStarTextSecondary)
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 13)
            .background(Color.choreStarCardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            .opacity(isCompleted ? 0.75 : 1.0)
        }
        .buttonStyle(PlainButtonStyle())
    }

    private func toggle() {
        let wasCompleted = isCompleted
        if wasCompleted {
            Haptics.light()
        } else {
            Haptics.success()
        }

        Task {
            let achievements = await manager.toggleChoreCompletion(chore)
            if !wasCompleted {
                SoundManager.shared.play(.success)
                await MainActor.run {
                    onComplete?()

                    if !achievements.isEmpty {
                        earnedAchievements = achievements
                        showAchievementAlert = true
                    }
                }
            }
        }
    }
}

#Preview {
    DashboardView()
        .environmentObject(SupabaseManager.shared)
        .environmentObject(ThemeManager.shared)
}
