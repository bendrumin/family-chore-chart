import SwiftUI

struct ChildMainView: View {
    @EnvironmentObject var manager: SupabaseManager
    /// The family's theme. The kid screen used to be the one place it never
    /// reached: a flat card header and an avatar-tinted wash, whatever the
    /// parent picked. Observed directly rather than via the environment so a
    /// standalone kid launch cannot crash on a missing environment object.
    @ObservedObject private var themeManager = ThemeManager.shared
    @State private var activeRoutine: Routine?
    @State private var showPerfectDay = false
    @State private var showBadges = false

    /// Current streak. A standalone kid session gets it from /api/kid/stats;
    /// on a parent's device the local week math already has it.
    private var streak: Int {
        guard let child = manager.currentChild else { return 0 }
        if manager.kidModeSession != nil { return manager.kidStats?.streak ?? 0 }
        return manager.calculateWeeklyStats(for: child.id).streak
    }

    private var badgeProgress: [AchievementProgressInfo] {
        guard let child = manager.currentChild else { return [] }
        return manager.achievementProgress(for: child.id)
    }

    private var earnedBadgeCount: Int { badgeProgress.filter(\.earned).count }

    /// The closest unearned badge, so the row always points somewhere.
    private var nextBadge: AchievementProgressInfo? {
        badgeProgress.filter { !$0.earned }.max { $0.progress < $1.progress }
    }
    
    /// Only what is due today. A Tuesday-only chore is not on Wednesday's list.
    private var childChores: [Chore] {
        guard let child = manager.currentChild else { return [] }
        return manager.dueChores(for: child.id)
    }
    
    private var completedChores: [Chore] {
        childChores.filter { manager.isChoreCompleted($0) }
    }
    
    private var pendingChores: [Chore] {
        childChores.filter { !manager.isChoreCompleted($0) }
    }
    
    private var totalEarnings: Double {
        manager.calculateTodayEarnings(for: manager.currentChild?.id ?? UUID())
    }
    
    private var childRoutines: [Routine] {
        guard let child = manager.currentChild else { return [] }
        return manager.routines.filter { $0.childId == child.id && $0.isActive }
    }
    
    var body: some View {
        if let child = manager.currentChild {
            ZStack {
                // A soft wash of the family's theme under the list.
                LinearGradient(
                    colors: [
                        themeManager.primaryColor.opacity(0.14),
                        themeManager.secondaryColor.opacity(0.05),
                        Color.choreStarBackground
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .ignoresSafeArea()

                VStack(spacing: 0) {
                    // Header: the theme gradient with white type, the same
                    // white-on-gradient kid surface the web uses.
                    VStack(spacing: 16) {
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Hi, \(child.name)! 👋")
                                    .font(.system(size: 32, weight: .bold, design: .rounded))
                                    .foregroundColor(.white)

                                // Flat rate: the whole-day deal, stated once, kid-sized.
                                // familySettings is nil in STANDALONE kid sessions (no parent
                                // client), so this shows on a parent's device and hides rather
                                // than guessing a wrong number when the rate is unknown.
                                if !manager.isPerChoreRewardMode, let settings = manager.familySettings {
                                    Text("Finish ALL your chores to earn \(manager.formatMoney(Double(settings.dailyRewardCents) / 100.0)) today! 🌟")
                                        .font(.headline)
                                        .foregroundColor(.white.opacity(0.92))
                                } else {
                                    Text("Let's get some chores done!")
                                        .font(.headline)
                                        .foregroundColor(.white.opacity(0.92))
                                }
                            }

                            Spacer()

                            // Sign out button
                            Button(action: {
                                manager.signOutChild()
                            }) {
                                Image(systemName: "rectangle.portrait.and.arrow.right")
                                    .font(.title3)
                                    .foregroundColor(.white)
                                    .padding(12)
                                    .background(Color.white.opacity(0.2))
                                    .cornerRadius(12)
                            }
                            .accessibilityLabel("Sign out")
                        }
                        .padding(.horizontal, 20)
                        .padding(.top, 20)

                        // Big stats card
                        HStack(spacing: 16) {
                            StatBubble(
                                icon: "checkmark.circle.fill",
                                value: "\(completedChores.count)",
                                label: "Done",
                                color: .choreStarSuccess,
                                onGradient: true
                            )

                            StatBubble(
                                icon: "clock.fill",
                                value: "\(pendingChores.count)",
                                label: "To Do",
                                color: .choreStarWarning,
                                onGradient: true
                            )

                            StatBubble(
                                icon: "star.fill",
                                value: manager.formatMoney(totalEarnings),
                                label: "Earned",
                                color: .choreStarAccent,
                                onGradient: true
                            )

                            StatBubble(
                                icon: "flame.fill",
                                value: "\(streak)",
                                label: "Streak",
                                color: .orange,
                                onGradient: true
                            )
                        }
                        .padding(.horizontal, 20)

                        // Badge cabinet. The data existed for the parent's
                        // Achievements screen; the kid never saw it.
                        Button {
                            showBadges = true
                        } label: {
                            HStack(spacing: 12) {
                                Text("🏆")
                                    .font(.title2)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("\(earnedBadgeCount) of \(badgeProgress.count) badges")
                                        .font(.headline)
                                        .foregroundColor(.white)
                                    if let next = nextBadge {
                                        Text("Next: \(next.definition.icon) \(next.definition.name)")
                                            .font(.caption)
                                            .foregroundColor(.white.opacity(0.85))
                                    } else if !badgeProgress.isEmpty {
                                        Text("You earned them all!")
                                            .font(.caption)
                                            .foregroundColor(.white.opacity(0.85))
                                    }
                                }
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .font(.subheadline.weight(.semibold))
                                    .foregroundColor(.white.opacity(0.85))
                            }
                            .padding(.horizontal, 16)
                            .padding(.vertical, 12)
                            .background(
                                RoundedRectangle(cornerRadius: 16)
                                    .fill(Color.white.opacity(0.18))
                            )
                        }
                        .buttonStyle(.plain)
                        .padding(.horizontal, 20)
                        .accessibilityLabel("\(earnedBadgeCount) of \(badgeProgress.count) badges earned. Open badges.")
                        .sheet(isPresented: $showBadges) {
                            NavigationStack {
                                AchievementsView(child: child)
                                    .environmentObject(manager)
                                    .toolbar {
                                        ToolbarItem(placement: .confirmationAction) {
                                            Button("Done") { showBadges = false }
                                        }
                                    }
                            }
                        }
                    }
                    .padding(.bottom, 20)
                    .background(
                        ZStack {
                            themeManager.gradient
                            // The season's particles, moved from the parent hero
                            // to the screen where they get watched.
                            if let glyph = ThemeParticleOverlay.glyph(for: themeManager.activeTheme) {
                                ThemeParticleOverlay(glyph: glyph, particleCount: 14, opacity: 0.45)
                            }
                        }
                        .ignoresSafeArea(edges: .top)
                    )
                    .shadow(color: themeManager.accentColor.opacity(0.25), radius: 14, x: 0, y: 6)
                    
                    // Chores & Routines list
                    ScrollView {
                        VStack(spacing: 24) {
                            // Routines section
                            if !childRoutines.isEmpty {
                                VStack(alignment: .leading, spacing: 16) {
                                    Text("My Routines")
                                        .font(.title2)
                                        .fontWeight(.bold)
                                        .foregroundColor(.choreStarTextPrimary)
                                        .padding(.horizontal, 20)
                                    
                                    ForEach(childRoutines) { routine in
                                        KidRoutineCard(routine: routine) {
                                            activeRoutine = routine
                                        }
                                        .padding(.horizontal, 20)
                                        .scrollTransition { content, phase in
                                            content
                                                .opacity(phase.isIdentity ? 1 : 0.5)
                                                .scaleEffect(phase.isIdentity ? 1 : 0.94)
                                        }
                                    }
                                }
                                .padding(.top, 20)
                            }
                            
                            // Pending chores
                            if !pendingChores.isEmpty {
                                VStack(alignment: .leading, spacing: 16) {
                                    Text("Your Chores")
                                        .font(.title2)
                                        .fontWeight(.bold)
                                        .foregroundColor(.choreStarTextPrimary)
                                        .padding(.horizontal, 20)
                                    
                                    ForEach(pendingChores) { chore in
                                        BigChoreCard(chore: chore, child: child, manager: manager)
                                            .padding(.horizontal, 20)
                                            .scrollTransition { content, phase in
                                                content
                                                    .opacity(phase.isIdentity ? 1 : 0.5)
                                                    .scaleEffect(phase.isIdentity ? 1 : 0.94)
                                            }
                                    }
                                }
                                .padding(.top, 20)
                            }
                            
                            // Completed chores
                            if !completedChores.isEmpty {
                                VStack(alignment: .leading, spacing: 16) {
                                    Text("Completed! 🎉")
                                        .font(.title2)
                                        .fontWeight(.bold)
                                        .foregroundColor(.choreStarSuccess)
                                        .padding(.horizontal, 20)
                                    
                                    ForEach(completedChores) { chore in
                                        BigChoreCard(chore: chore, child: child, manager: manager)
                                            .padding(.horizontal, 20)
                                    }
                                }
                                .padding(.top, 20)
                            }
                            
                            if childChores.isEmpty {
                                VStack(spacing: 20) {
                                    Image(systemName: "party.popper.fill")
                                        .font(.system(size: 60))
                                        .foregroundStyle(Color.choreStarGradient)
                                    
                                    Text("No Chores Yet!")
                                        .font(.title)
                                        .fontWeight(.bold)
                                        .foregroundColor(.choreStarTextPrimary)
                                    
                                    Text("Check back later")
                                        .font(.headline)
                                        .foregroundColor(.choreStarTextSecondary)
                                }
                                .padding(40)
                            }
                            
                            Spacer(minLength: 40)
                        }
                    }
                }
            }
            .fullScreenCover(item: $activeRoutine) { routine in
                RoutinePlayerView(routine: routine, childId: child.id)
            }
            .onChange(of: pendingChores.count) { oldValue, newValue in
                // The kid just finished their last chore of the day
                if newValue == 0, oldValue == 1, !childChores.isEmpty {
                    showPerfectDay = true
                }
            }
            .overlay {
                if showPerfectDay {
                    PerfectDayOverlay {
                        withAnimation(.easeOut(duration: 0.3)) {
                            showPerfectDay = false
                        }
                    }
                }
            }
        } else {
            Text("No child selected")
                .foregroundColor(.choreStarTextSecondary)
        }
    }
}

struct StatBubble: View {
    let icon: String
    let value: String
    let label: String
    let color: Color
    /// On the themed header the bubble is a white card with fixed dark ink,
    /// the web kid-mode look, instead of a tinted card with system label
    /// colors (which go white in dark mode and vanish on the gradient).
    var onGradient: Bool = false

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title)
                .foregroundColor(color)

            Text(value)
                .font(.system(size: 24, weight: .bold, design: .rounded))
                .foregroundColor(onGradient ? Color.black.opacity(0.85) : .choreStarTextPrimary)
                .lineLimit(1)
                .minimumScaleFactor(0.7)

            Text(label)
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundColor(onGradient ? Color.black.opacity(0.6) : .choreStarTextSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 20)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(onGradient ? Color.white.opacity(0.92) : color.opacity(0.1))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .strokeBorder(color.opacity(0.3), lineWidth: 2)
        )
    }
}

struct BigChoreCard: View {
    let chore: Chore
    let child: Child
    @ObservedObject var manager: SupabaseManager
    
    private var isCompleted: Bool {
        manager.isChoreCompleted(chore)
    }

    /// Ticked, waiting for a grown-up (approval mode or a photo chore).
    private var isPending: Bool {
        manager.isChorePending(chore)
    }

    @State private var showCamera = false
    @State private var proofError: String?

    var body: some View {
        Button(action: {
            let impact = UIImpactFeedbackGenerator(style: .heavy)
            impact.impactOccurred()
            // A photo chore opens the camera first; the tick rides along with
            // the picture. Un-ticking (done or waiting) goes the normal way.
            if !isCompleted && !isPending && chore.requiresPhoto {
                showCamera = true
                return
            }
            Task {
                let _ = await manager.toggleChoreCompletion(chore)
            }
        }) {
            VStack(spacing: 16) {
                HStack {
                    // Chore icon (OpenMoji line art, falls back to emoji)
                    if chore.icon != nil {
                        ChoreIconChip(
                            icon: chore.icon,
                            tint: Color.fromString(chore.color ?? child.avatarColor),
                            size: 60
                        )
                    }
                    
                    VStack(alignment: .leading, spacing: 6) {
                        Text(chore.name)
                            .font(.title3)
                            .fontWeight(.bold)
                            .foregroundColor(isCompleted ? .choreStarTextSecondary : .choreStarTextPrimary)
                            .strikethrough(isCompleted)
                        
                        if let description = chore.description, !description.isEmpty {
                            Text(description)
                                .font(.subheadline)
                                .foregroundColor(.choreStarTextSecondary)
                                .lineLimit(2)
                        }
                    }
                    
                    Spacer()
                    
                    // Completion checkmark (or the waiting clock / camera hint)
                    ZStack {
                        Circle()
                            .strokeBorder(
                                isCompleted ? Color.choreStarSuccess : (isPending ? Color.choreStarWarning : Color.choreStarTextSecondary.opacity(0.3)),
                                lineWidth: 3
                            )
                            .frame(width: 40, height: 40)

                        if isCompleted {
                            Image(systemName: "checkmark")
                                .font(.title3)
                                .fontWeight(.bold)
                                .foregroundColor(.choreStarSuccess)
                                .transition(.scale.combined(with: .opacity))
                        } else if isPending {
                            Image(systemName: "clock.fill")
                                .font(.title3)
                                .foregroundColor(.choreStarWarning)
                        } else if chore.requiresPhoto {
                            Image(systemName: "camera.fill")
                                .font(.subheadline)
                                .foregroundColor(.choreStarTextSecondary)
                        }
                    }
                    .animation(.spring(response: 0.4, dampingFraction: 0.6), value: isCompleted)
                }

                if isPending {
                    HStack(spacing: 6) {
                        Image(systemName: "hourglass")
                        Text("Waiting for a grown-up")
                            .fontWeight(.bold)
                    }
                    .font(.subheadline)
                    .foregroundColor(.choreStarWarning)
                    .frame(maxWidth: .infinity, alignment: .leading)
                } else if !isCompleted && chore.requiresPhoto {
                    HStack(spacing: 6) {
                        Image(systemName: "camera.fill")
                        Text("Take a photo to check it off")
                            .fontWeight(.semibold)
                    }
                    .font(.subheadline)
                    .foregroundColor(.choreStarTextSecondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                }

                if let proofError {
                    Text(proofError)
                        .font(.caption)
                        .foregroundColor(.choreStarDanger)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                
                // Reward — per-chore mode only. On the flat rate, promising a kid
                // "Earn $0.08" PER CHORE is a promise the math won't keep; the day
                // banner up top carries the real deal instead.
                if manager.isPerChoreRewardMode {
                HStack {
                    Spacer()
                    HStack(spacing: 6) {
                        Image(systemName: "star.fill")
                            .foregroundColor(.choreStarAccent)
                        Text("Earn \(manager.formatMoney(chore.reward))")
                            .font(.headline)
                            .fontWeight(.bold)
                            .foregroundColor(.choreStarAccent)
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(Color.choreStarAccent.opacity(0.15))
                    .cornerRadius(12)
                }
                }
            }
            .padding(20)
            .background(
                LinearGradient(
                    colors: [
                        Color.choreStarCardBackground,
                        isCompleted ? Color.choreStarSuccess.opacity(0.08) : Color.choreStarCardBackground
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
            .cornerRadius(20)
            .shadow(color: isCompleted ? Color.choreStarSuccess.opacity(0.15) : Color.black.opacity(0.08), radius: 12, x: 0, y: 4)
            .overlay(
                RoundedRectangle(cornerRadius: 20)
                    .strokeBorder(
                        isCompleted ? Color.choreStarSuccess.opacity(0.4) : Color.fromString(chore.color ?? child.avatarColor).opacity(0.2),
                        lineWidth: 2
                    )
            )
        }
        .buttonStyle(PlainButtonStyle())
        .scaleEffect(isCompleted ? 0.98 : 1.0)
        .animation(.spring(response: 0.4, dampingFraction: 0.7), value: isCompleted)
        .fullScreenCover(isPresented: $showCamera) {
            CameraPicker(
                onCapture: { image in
                    Task {
                        let error = await manager.submitChoreProof(chore: chore, image: image)
                        await MainActor.run {
                            proofError = error
                            if error == nil { SoundManager.shared.play(.success) }
                        }
                    }
                },
                cameraDevice: .rear,
                allowsEditing: false
            )
            .ignoresSafeArea()
        }
    }
}

#Preview {
    ChildMainView()
        .environmentObject(SupabaseManager.shared)
}

