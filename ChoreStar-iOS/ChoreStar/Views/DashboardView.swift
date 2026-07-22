import SwiftUI

struct DashboardView: View {
    @EnvironmentObject var manager: SupabaseManager
    @EnvironmentObject var themeManager: ThemeManager
    @State private var showConfetti = false
    @State private var showAchievementAlert = false
    @State private var earnedAchievements: [Achievement] = []
    @State private var showWhatsNew = false
    @State private var showingKidMode = false
    @State private var showPerfectDay = false
    @AppStorage("lastSeenChangelogVersion") private var lastSeenChangelogVersion = ""

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

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(spacing: 24) {
                    // Hero: today at a glance, Activity-ring style
                    HStack(spacing: 20) {
                        VStack(alignment: .leading, spacing: 6) {
                            Text(greeting)
                                .font(.subheadline)
                                .fontWeight(.semibold)
                                .foregroundColor(.choreStarTextSecondary)

                            Text(totalChores == 0
                                 ? "No chores yet"
                                 : "\(completedChores) of \(totalChores) done")
                                .font(.system(.title2, design: .rounded).weight(.bold))
                                .foregroundColor(.choreStarTextPrimary)

                            HStack(spacing: 5) {
                                Image(systemName: "star.circle.fill")
                                    .font(.subheadline)
                                    .foregroundColor(.choreStarAccent)
                                Text("\(earnedTodayText) earned today")
                                    .font(.subheadline)
                                    .foregroundColor(.choreStarTextSecondary)
                            }
                        }

                        Spacer()

                        ProgressRing(progress: completionPercentage, lineWidth: 11, tint: themeManager.accentColor) {
                            if completionPercentage >= 1.0, totalChores > 0 {
                                Image(systemName: "checkmark")
                                    .font(.system(size: 26, weight: .bold))
                                    .foregroundColor(themeManager.accentColor)
                            } else {
                                Text("\(Int(completionPercentage * 100))%")
                                    .font(.system(.title3, design: .rounded).weight(.bold))
                                    .foregroundColor(.choreStarTextPrimary)
                            }
                        }
                        .frame(width: 88, height: 88)
                    }
                    .padding(20)
                    .background(
                        ZStack {
                            Color.choreStarCardBackground
                            themeManager.gradient.opacity(0.10)
                        }
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                    .padding(.horizontal, 20)
                    .padding(.top, 4)

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
            .background(Color.choreStarBackground)
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
            if lastSeenChangelogVersion != Changelog.latestVersion {
                lastSeenChangelogVersion = Changelog.latestVersion
                showWhatsNew = true
            }
        }
        .sheet(isPresented: $showWhatsNew) {
            WhatsNewView()
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
    
    var body: some View {
        Button(action: toggle) {
            HStack(spacing: 14) {
                Image(systemName: isCompleted ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 26, weight: .medium))
                    .foregroundColor(isCompleted ? .choreStarSuccess : Color.choreStarTextSecondary.opacity(0.45))
                    .symbolEffect(.bounce, value: isCompleted)
                    .contentShape(Circle())
                    .animation(.spring(response: 0.35, dampingFraction: 0.65), value: isCompleted)

                VStack(alignment: .leading, spacing: 3) {
                    HStack(spacing: 6) {
                        if let icon = chore.icon, !icon.isEmpty {
                            Text(icon)
                                .font(.subheadline)
                        }
                        Text(chore.name)
                            .font(.body)
                            .fontWeight(.medium)
                            .foregroundColor(isCompleted ? .choreStarTextSecondary : .choreStarTextPrimary)
                            .strikethrough(isCompleted, color: .choreStarTextSecondary)
                            .lineLimit(1)
                    }

                    Text(childName)
                        .font(.caption)
                        .foregroundColor(.choreStarTextSecondary)
                }

                Spacer()

                Text(manager.formatMoney(chore.reward))
                    .font(.system(.subheadline, design: .rounded).weight(.semibold))
                    .foregroundColor(isCompleted ? .choreStarSuccess : .choreStarTextSecondary)
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
