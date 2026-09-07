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

    /// Home is a day view, so everything here counts chores DUE today.
    private var choresToday: [Chore] {
        manager.choresDueToday
    }

    private var completedChores: Int {
        choresToday.filter { manager.isChoreCompleted($0) }.count
    }

    private var totalChores: Int {
        choresToday.count
    }

    /// Time-of-day greeting with its seasonal-system emoji. The icons run
    /// sunrise → sun → sunset → moon so each slot reads at a glance (matches
    /// the web hero; the old evening 🌆 rendered as a night skyline).
    private var greeting: (emoji: String, text: String) {
        let hour = Calendar.current.component(.hour, from: Date())
        switch hour {
        case 0..<12:
            return ("🌅", "Good morning")
        case 12..<17:
            return ("☀️", "Good afternoon")
        case 17..<21:
            return ("🌇", "Good evening")
        default:
            return ("🌙", "Good night")
        }
    }

    /// `profiles.family_name`, the same field the web hero leads with.
    private var familyNameText: String {
        let name = manager.familyName?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        return name.isEmpty ? "My Family" : name
    }

    /// Chores done / due today for one child — the same per-child numbers the
    /// Family chips' rings use (dueChores + isChoreCompleted).
    private func childDayCounts(_ child: Child) -> (done: Int, total: Int) {
        let childChores = manager.dueChores(for: child.id)
        let done = childChores.filter { manager.isChoreCompleted($0) }.count
        return (done, childChores.count)
    }

    /// One hero ring: the child's avatar wrapped in their today-progress ring,
    /// drawn in the hero's ink (white on the seasonal gradient).
    private func heroChildRing(_ child: Child) -> some View {
        let counts = childDayCounts(child)
        let firstName = child.name.split(separator: " ").first.map(String.init) ?? child.name
        let countText = counts.total > 0 ? "\(counts.done)/\(counts.total)" : "none today"

        return VStack(spacing: 6) {
            ProgressRing(
                progress: counts.total > 0 ? Double(counts.done) / Double(counts.total) : 0,
                lineWidth: 4.5,
                tint: .white,
                trackOpacity: 0.28
            ) {
                AvatarView(child: child, size: 50)
            }
            .frame(width: 62, height: 62)

            (Text("\(firstName) ").fontWeight(.bold).foregroundColor(.white)
                + Text(countText).fontWeight(.semibold).foregroundColor(.white.opacity(0.75)))
                .font(.caption)
                .lineLimit(1)
        }
    }

    private var earnedTodayText: String {
        let total = manager.children.reduce(0.0) { $0 + manager.calculateTodayEarnings(for: $1.id) }
        return manager.formatMoney(total)
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(spacing: 24) {
                    // Hero: family-first — the family name leads, each kid
                    // carries their own progress ring, family total trails.
                    // Mirrors the web DashboardHero.
                    VStack(alignment: .leading, spacing: 0) {
                        // Greeting left, date right
                        HStack(alignment: .firstTextBaseline) {
                            Text("\(greeting.emoji) \(greeting.text)")
                                .font(.subheadline)
                                .fontWeight(.medium)
                                .foregroundColor(.white.opacity(0.92))

                            Spacer()

                            Text(Date.now, format: .dateTime.weekday(.wide).month(.wide).day())
                                .font(.caption)
                                .fontWeight(.semibold)
                                .foregroundColor(.white.opacity(0.75))
                        }

                        // The family leads
                        HStack(spacing: 8) {
                            Text(familyNameText)
                                .font(.display(28, weight: .heavy))
                                .foregroundColor(.white)
                                .lineLimit(1)
                                .minimumScaleFactor(0.6)

                            if manager.memberOfFamilyId != nil {
                                Text("Shared")
                                    .font(.caption2)
                                    .fontWeight(.bold)
                                    .foregroundColor(.white)
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .background(Color.white.opacity(0.16))
                                    .clipShape(RoundedRectangle(cornerRadius: 6, style: .continuous))
                            }
                        }
                        .padding(.top, 4)

                        if manager.children.isEmpty {
                            Text("Add a child to start tracking chores.")
                                .font(.subheadline)
                                .fontWeight(.semibold)
                                .foregroundColor(.white.opacity(0.85))
                                .padding(.top, 8)
                        } else {
                            HStack(alignment: .center, spacing: 16) {
                                // Each kid carries their own progress
                                ScrollView(.horizontal, showsIndicators: false) {
                                    HStack(spacing: 16) {
                                        ForEach(manager.children) { child in
                                            NavigationLink(destination: ChildDetailView(child: child)) {
                                                heroChildRing(child)
                                            }
                                            .buttonStyle(PlainButtonStyle())
                                            .accessibilityLabel("Show \(child.name)'s chores")
                                        }
                                    }
                                    .padding(.vertical, 2)
                                }

                                // Family total
                                VStack(alignment: .trailing, spacing: 2) {
                                    Text("\(completedChores) of \(totalChores)")
                                        .font(.display(24, weight: .heavy))
                                        .foregroundColor(.white)
                                        .contentTransition(.numericText(value: Double(completedChores)))
                                        .animation(.snappy, value: completedChores)

                                    Text(totalChores > 0
                                         ? "\(earnedTodayText) earned today"
                                         : "No chores due today")
                                        .font(.caption)
                                        .fontWeight(.semibold)
                                        .foregroundColor(.white.opacity(0.85))
                                        .contentTransition(.numericText())
                                        .animation(.snappy, value: earnedTodayText)
                                }
                                .fixedSize()
                            }
                            .padding(.top, 12)
                        }
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

                    // Ticks waiting for the parent's OK (approval mode / photo
                    // chores). Renders nothing when there is nothing to review.
                    ApprovalTrayView()
                        .padding(.horizontal, 20)

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

                            if choresToday.isEmpty {
                                Text("Nothing is due today. Chores scheduled for other days show up on their day.")
                                    .font(.subheadline)
                                    .foregroundColor(.choreStarTextSecondary)
                                    .padding(.horizontal, 20)
                                    .padding(.vertical, 8)
                            }

                            LazyVGrid(
                                columns: [GridItem(.adaptive(minimum: 330, maximum: 560), spacing: 12, alignment: .top)],
                                alignment: .center,
                                spacing: 8
                            ) {
                                ForEach(choresToday, id: \.id) { chore in
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
        .alert("Achievement unlocked", isPresented: $showAchievementAlert) {
            Button("OK", role: .cancel) { }
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

    /// The kid ticked it; it is waiting for this parent. Tapping approves.
    private var isPending: Bool {
        manager.isChorePending(chore)
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
                Image(systemName: isCompleted ? "checkmark.circle.fill" : (isPending ? "clock.fill" : "circle"))
                    .font(.system(size: 26, weight: .medium))
                    .foregroundColor(isCompleted ? .choreStarSuccess : (isPending ? .choreStarWarning : Color.choreStarTextSecondary.opacity(0.45)))
                    .symbolEffect(.bounce, value: isCompleted)
                    .contentShape(Circle())
                    .animation(.spring(response: 0.35, dampingFraction: 0.65), value: isCompleted)
                    .accessibilityLabel(isPending ? "Waiting for your OK, tap to approve" : (isCompleted ? "Done" : "Not done"))

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

// MARK: - Needs your OK

/// The parent's approval tray: every chore a kid checked off that is waiting
/// (approval mode, or a chore that asks for a photo). Approve makes it count;
/// Send back removes it so the chore reappears on the kid's list. Mirrors the
/// web dashboard's ApprovalTray.
struct ApprovalTrayView: View {
    @EnvironmentObject var manager: SupabaseManager
    @State private var lightbox: SupabaseManager.PendingApproval?
    @Environment(\.requestReview) private var requestReview

    var body: some View {
        Group {
            // The empty branch must still be a REAL view: modifiers on a Group
            // whose content is nothing never install, so the .task below never
            // fired when the tray mounted empty — which is every launch where
            // completions load fast. The tray then never fetched at all.
            if manager.pendingApprovals.isEmpty && manager.pendingRedemptions.isEmpty {
                Color.clear.frame(width: 0, height: 0)
            } else if !manager.pendingApprovals.isEmpty || !manager.pendingRedemptions.isEmpty {
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        Image(systemName: "clock.badge.checkmark.fill")
                            .foregroundColor(.choreStarWarning)
                        Text("Needs your OK")
                            .font(.headline)
                            .foregroundColor(.choreStarTextPrimary)
                        Spacer()
                        Text("\(manager.pendingApprovals.count + manager.pendingRedemptions.count)")
                            .font(.subheadline.weight(.semibold))
                            .foregroundColor(.choreStarTextSecondary)
                    }

                    // Store requests (2.0): Yes spends the money, Not now declines.
                    ForEach(manager.pendingRedemptions) { r in
                        HStack(spacing: 12) {
                            Text(r.itemEmoji ?? "🎁")
                                .font(.system(size: 28))
                                .frame(width: 52, height: 52)
                                .background(Color.choreStarBackground)
                                .clipShape(RoundedRectangle(cornerRadius: 10))

                            VStack(alignment: .leading, spacing: 2) {
                                Text(r.itemTitle)
                                    .font(.body.weight(.semibold))
                                    .foregroundColor(.choreStarTextPrimary)
                                    .lineLimit(1)
                                HStack(spacing: 4) {
                                    Text("\(r.childName) wants this")
                                        .foregroundColor(Color.fromString(r.childColor ?? ""))
                                    Text("· \(manager.formatMoney(Double(r.priceCents) / 100.0))")
                                        .foregroundColor(.choreStarTextSecondary)
                                }
                                .font(.caption.weight(.medium))
                            }

                            Spacer(minLength: 4)

                            Button {
                                Haptics.light()
                                Task { await manager.reviewRedemption(id: r.id, action: "reject") }
                            } label: {
                                Text("Not now")
                                    .font(.subheadline.weight(.semibold))
                                    .padding(.horizontal, 10)
                                    .frame(height: 40)
                                    .background(Color.choreStarTextSecondary.opacity(0.12))
                                    .clipShape(RoundedRectangle(cornerRadius: 10))
                            }
                            .buttonStyle(.plain)

                            Button {
                                Haptics.success()
                                Task {
                                    if let err = await manager.reviewRedemption(id: r.id, action: "approve") {
                                        await MainActor.run { manager.debugLastError = err }
                                    } else if ReviewPrompter.recordMoneyMomentAndCheck() {
                                        // Store request approved: money moved.
                                        DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) {
                                            requestReview()
                                        }
                                    }
                                }
                            } label: {
                                Text("Yes")
                                    .font(.subheadline.weight(.bold))
                                    .padding(.horizontal, 14)
                                    .frame(height: 40)
                                    .background(Color.choreStarSuccess)
                                    .foregroundColor(.white)
                                    .clipShape(RoundedRectangle(cornerRadius: 10))
                            }
                            .buttonStyle(.plain)
                            .accessibilityLabel("Yes to \(r.itemTitle) for \(r.childName)")
                        }
                        .padding(10)
                        .background(Color.choreStarBackground)
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                    }

                    ForEach(manager.pendingApprovals) { item in
                        HStack(spacing: 12) {
                            if item.hasPhoto, let urlString = item.photoUrl, let url = URL(string: urlString) {
                                Button { lightbox = item } label: {
                                    AsyncImage(url: url) { phase in
                                        if let image = phase.image {
                                            image.resizable().scaledToFill()
                                        } else {
                                            Color.choreStarBackground
                                        }
                                    }
                                    .frame(width: 52, height: 52)
                                    .clipShape(RoundedRectangle(cornerRadius: 10))
                                }
                                .buttonStyle(.plain)
                                .accessibilityLabel("See \(item.childName)'s photo for \(item.choreName)")
                            } else {
                                AdaptiveIcon(icon: item.choreIcon, fallbackSymbol: "checklist", tint: Color.fromString(item.childColor ?? ""), iconSize: 26)
                                    .frame(width: 52, height: 52)
                                    .background(Color.choreStarBackground)
                                    .clipShape(RoundedRectangle(cornerRadius: 10))
                            }

                            VStack(alignment: .leading, spacing: 2) {
                                Text(item.choreName)
                                    .font(.body.weight(.semibold))
                                    .foregroundColor(.choreStarTextPrimary)
                                    .lineLimit(1)
                                HStack(spacing: 4) {
                                    Text(item.childName)
                                        .foregroundColor(Color.fromString(item.childColor ?? ""))
                                    Text("· \(item.dayName)")
                                        .foregroundColor(.choreStarTextSecondary)
                                    if item.hasPhoto {
                                        Image(systemName: "camera.fill")
                                            .foregroundColor(.choreStarTextSecondary)
                                    }
                                }
                                .font(.caption.weight(.medium))
                            }

                            Spacer(minLength: 4)

                            Button {
                                Haptics.light()
                                Task { await manager.rejectCompletion(id: item.id) }
                            } label: {
                                Image(systemName: "arrow.uturn.backward")
                                    .font(.subheadline.weight(.semibold))
                                    .frame(width: 40, height: 40)
                                    .background(Color.choreStarTextSecondary.opacity(0.12))
                                    .clipShape(RoundedRectangle(cornerRadius: 10))
                            }
                            .buttonStyle(.plain)
                            .accessibilityLabel("Send \(item.choreName) back to \(item.childName)")

                            Button {
                                Haptics.success()
                                Task { await manager.approveCompletion(id: item.id) }
                            } label: {
                                HStack(spacing: 6) {
                                    Image(systemName: "checkmark")
                                        .font(.subheadline.weight(.bold))
                                    Text("Approve")
                                        .font(.subheadline.weight(.bold))
                                        .lineLimit(1)
                                }
                                .fixedSize(horizontal: true, vertical: false)
                                .padding(.horizontal, 12)
                                .frame(height: 40)
                                .background(Color.choreStarSuccess)
                                .foregroundColor(.white)
                                .clipShape(RoundedRectangle(cornerRadius: 10))
                            }
                            .buttonStyle(.plain)
                            .accessibilityLabel("Approve \(item.choreName) for \(item.childName)")
                        }
                        .padding(10)
                        .background(Color.choreStarBackground)
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                    }
                }
                .appCard()
            }
        }
        .task { await manager.loadPendingApprovals() }
        // A kid's tick on this device lands in pendingCompletions first; refresh
        // the tray so the parent sees it without pulling.
        .onChange(of: manager.pendingCompletions.count) { _, _ in
            Task { await manager.loadPendingApprovals() }
        }
        .sheet(item: $lightbox) { item in
            NavigationStack {
                VStack(spacing: 16) {
                    if let urlString = item.photoUrl, let url = URL(string: urlString) {
                        AsyncImage(url: url) { phase in
                            if let image = phase.image {
                                image.resizable().scaledToFit()
                            } else {
                                ProgressView()
                            }
                        }
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                        .padding(.horizontal, 16)
                    }
                    HStack(spacing: 12) {
                        Button {
                            Task { await manager.rejectCompletion(id: item.id) }
                            lightbox = nil
                        } label: {
                            Text("Send back")
                                .font(.headline)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Color.choreStarTextSecondary.opacity(0.12))
                                .clipShape(RoundedRectangle(cornerRadius: 14))
                        }
                        .buttonStyle(.plain)
                        Button {
                            Haptics.success()
                            Task { await manager.approveCompletion(id: item.id) }
                            lightbox = nil
                        } label: {
                            Text("Approve")
                                .font(.headline)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Color.choreStarSuccess)
                                .foregroundColor(.white)
                                .clipShape(RoundedRectangle(cornerRadius: 14))
                        }
                        .buttonStyle(.plain)
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 16)
                }
                .navigationTitle("\(item.childName) · \(item.choreName)")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Close") { lightbox = nil }
                    }
                }
            }
        }
    }
}
