import SwiftUI

struct DashboardView: View {
    @EnvironmentObject var manager: SupabaseManager
    @State private var showConfetti = false
    @State private var showAchievementAlert = false
    @State private var earnedAchievements: [Achievement] = []

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

    var body: some View {
        NavigationView {
            ScrollView {
                LazyVStack(spacing: 20) {
                    // Header with greeting
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            VStack(alignment: .leading) {
                                Text(greeting)
                                    .font(.title2)
                                    .fontWeight(.semibold)
                                    .foregroundColor(.choreStarTextPrimary)

                                Text("Let's see how everyone is doing today")
                                    .font(.subheadline)
                                    .foregroundColor(.choreStarTextSecondary)
                            }
                            Spacer()
                        }
                        .padding(.horizontal, 20)
                        .padding(.top, 10)
                    }

                    // Progress Card with gradient
                    ZStack {
                        // Gradient background
                        LinearGradient(
                            colors: [Color.choreStarPrimary.opacity(0.1), Color.choreStarSecondary.opacity(0.1)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                        
                        VStack(spacing: 16) {
                            HStack {
                                HStack(spacing: 8) {
                                    Image(systemName: "chart.bar.fill")
                                        .foregroundStyle(Color.choreStarGradient)
                                    Text("Today's Progress")
                                        .font(.headline)
                                        .fontWeight(.bold)
                                        .foregroundColor(.choreStarTextPrimary)
                                }
                                Spacer()
                                Text("\(completedChores)")
                                    .font(.system(size: 28, weight: .bold, design: .rounded))
                                    .foregroundStyle(Color.choreStarGradient)
                                + Text("/\(totalChores)")
                                    .font(.system(size: 20, weight: .semibold, design: .rounded))
                                    .foregroundColor(.choreStarTextSecondary)
                            }

                            // Animated Progress Bar
                            GeometryReader { geometry in
                                ZStack(alignment: .leading) {
                                    // Background
                                    RoundedRectangle(cornerRadius: 10)
                                        .fill(Color.choreStarBackground)
                                        .frame(height: 16)
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 10)
                                                .stroke(Color.choreStarPrimary.opacity(0.1), lineWidth: 1)
                                        )

                                    // Progress fill with gradient
                                    RoundedRectangle(cornerRadius: 10)
                                        .fill(Color.choreStarGradient)
                                        .frame(width: geometry.size.width * completionPercentage, height: 16)
                                        .overlay(
                                            // Shimmer effect
                                            LinearGradient(
                                                colors: [
                                                    .clear,
                                                    .white.opacity(0.3),
                                                    .clear
                                                ],
                                                startPoint: .leading,
                                                endPoint: .trailing
                                            )
                                            .blur(radius: 3)
                                        )
                                        .animation(.spring(response: 0.6, dampingFraction: 0.8), value: completionPercentage)
                                }
                            }
                            .frame(height: 16)

                            HStack {
                                Text("\(Int(completionPercentage * 100))% Complete")
                                    .font(.subheadline)
                                    .fontWeight(.semibold)
                                    .foregroundColor(.choreStarTextSecondary)
                                
                                Spacer()
                                
                                if completionPercentage == 1.0 {
                                    HStack(spacing: 4) {
                                        Image(systemName: "checkmark.circle.fill")
                                            .foregroundColor(.choreStarSuccess)
                                        Text("Amazing!")
                                            .font(.subheadline)
                                            .fontWeight(.bold)
                                            .foregroundColor(.choreStarSuccess)
                                    }
                                    .transition(.scale.combined(with: .opacity))
                                }
                            }
                            .animation(.spring(response: 0.5, dampingFraction: 0.7), value: completionPercentage)
                        }
                        .padding(20)
                    }
                    .background(Color.choreStarCardBackground)
                    .cornerRadius(20)
                    .shadow(color: Color.choreStarPrimary.opacity(0.15), radius: 15, x: 0, y: 5)
                    .padding(.horizontal, 20)

                    // Children Cards
                    if !manager.children.isEmpty {
                        VStack(alignment: .leading, spacing: 12) {
                            HStack {
                                Text("Family Members")
                                    .font(.headline)
                                    .fontWeight(.semibold)
                                    .foregroundColor(.choreStarTextPrimary)
                                Spacer()
                            }
                            .padding(.horizontal, 20)

                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 16) {
                                    ForEach(Array(manager.children.enumerated()), id: \.element.id) { index, child in
                                        NavigationLink(destination: ChildDetailView(child: child)) {
                                            ChildCard(child: child, index: index, manager: manager)
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
                            HStack {
                                Text("Today's Chores")
                                    .font(.headline)
                                    .fontWeight(.semibold)
                                    .foregroundColor(.choreStarTextPrimary)
                                Spacer()
                            }
                            .padding(.horizontal, 20)

                            LazyVStack(spacing: 8) {
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
            .navigationTitle("Dashboard")
            .navigationBarTitleDisplayMode(.large)
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

struct ChildCard: View {
    let child: Child
    let index: Int
    let manager: SupabaseManager
    
    private var childChores: [Chore] {
        manager.chores.filter { $0.childId == child.id }
    }
    
    private var completedChores: Int {
        childChores.filter { manager.isChoreCompleted($0) }.count
    }
    
    private var totalChores: Int {
        childChores.count
    }
    
    var body: some View {
        VStack(spacing: 14) {
            // Avatar with gradient ring
            ZStack {
                // Gradient ring
                Circle()
                    .strokeBorder(
                        LinearGradient(
                            colors: [Color.fromString(child.avatarColor), Color.fromString(child.avatarColor).opacity(0.5)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: 3
                    )
                    .frame(width: 68, height: 68)
                
                // Avatar
                Circle()
                    .fill(
                        LinearGradient(
                            colors: [Color.fromString(child.avatarColor), Color.fromString(child.avatarColor).opacity(0.8)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 60, height: 60)
                    .overlay(
                        Text(child.initials)
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                            .shadow(color: .black.opacity(0.2), radius: 2, x: 0, y: 1)
                    )
                    .shadow(color: Color.fromString(child.avatarColor).opacity(0.4), radius: 8, x: 0, y: 4)
            }
            
            // Name and progress
            VStack(spacing: 6) {
                Text(child.name)
                    .font(.headline)
                    .fontWeight(.bold)
                    .foregroundColor(.choreStarTextPrimary)
                    .lineLimit(1)
                
                HStack(spacing: 4) {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.caption)
                        .foregroundColor(.choreStarSuccess)
                    Text("\(completedChores)/\(totalChores)")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(.choreStarTextSecondary)
                }
                
                // Mini progress bar with gradient
                if totalChores > 0 {
                    GeometryReader { geometry in
                        ZStack(alignment: .leading) {
                            RoundedRectangle(cornerRadius: 4)
                                .fill(Color.choreStarBackground)
                                .frame(height: 8)
                            
                            RoundedRectangle(cornerRadius: 4)
                                .fill(
                                    LinearGradient(
                                        colors: [Color.fromString(child.avatarColor), Color.fromString(child.avatarColor).opacity(0.7)],
                                        startPoint: .leading,
                                        endPoint: .trailing
                                    )
                                )
                                .frame(width: geometry.size.width * (Double(completedChores) / Double(totalChores)), height: 8)
                                .animation(.spring(response: 0.5, dampingFraction: 0.7), value: completedChores)
                        }
                    }
                    .frame(height: 8)
                }
            }
        }
        .padding(18)
        .frame(width: 150)
        .background(
            LinearGradient(
                colors: [Color.choreStarCardBackground, Color.choreStarBackground.opacity(0.5)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .cornerRadius(20)
        .shadow(color: .black.opacity(0.08), radius: 12, x: 0, y: 4)
        .overlay(
            RoundedRectangle(cornerRadius: 20)
                .stroke(Color.fromString(child.avatarColor).opacity(0.2), lineWidth: 1)
        )
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
        HStack(spacing: 14) {
            // Animated completion button
            Button(action: {
                let impact = UIImpactFeedbackGenerator(style: .medium)
                impact.impactOccurred()
                
                let wasCompleted = isCompleted
                Task {
                    let achievements = await manager.toggleChoreCompletion(chore)
                    // Show confetti and play sound if newly completed
                    if !wasCompleted {
                        SoundManager.shared.play(.success)
                        await MainActor.run {
                            onComplete?()
                            
                            // Show achievement alert if any were earned
                            if !achievements.isEmpty {
                                earnedAchievements = achievements
                                showAchievementAlert = true
                            }
                        }
                    }
                }
            }) {
                ZStack {
                    // Outer ring
                    Circle()
                        .strokeBorder(
                            isCompleted ? Color.choreStarSuccess : Color.choreStarTextSecondary.opacity(0.3),
                            lineWidth: 2.5
                        )
                        .frame(width: 32, height: 32)
                    
                    // Checkmark
                    if isCompleted {
                        Image(systemName: "checkmark")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(.choreStarSuccess)
                            .transition(.scale.combined(with: .opacity))
                    }
                }
                .animation(.spring(response: 0.4, dampingFraction: 0.6), value: isCompleted)
            }
            .buttonStyle(PlainButtonStyle())
            
            // Chore info
            VStack(alignment: .leading, spacing: 6) {
                Text(chore.name)
                    .font(.body)
                    .fontWeight(.semibold)
                    .foregroundColor(isCompleted ? .choreStarTextSecondary : .choreStarTextPrimary)
                    .strikethrough(isCompleted, color: .choreStarTextSecondary)
                
                HStack(spacing: 8) {
                    // Child name with icon
                    HStack(spacing: 4) {
                        Image(systemName: "person.fill")
                            .font(.caption)
                            .foregroundColor(.choreStarTextSecondary)
                        Text(childName)
                            .font(.caption)
                            .foregroundColor(.choreStarTextSecondary)
                    }
                    
                    Spacer()
                    
                    // Reward badge
                    HStack(spacing: 4) {
                        Image(systemName: "dollarsign.circle.fill")
                            .font(.caption)
                            .foregroundStyle(Color.choreStarWarningGradient)
                        Text(String(format: "%.2f", chore.reward))
                            .font(.subheadline)
                            .fontWeight(.bold)
                            .foregroundStyle(Color.choreStarWarningGradient)
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(Color.choreStarAccent.opacity(0.15))
                    .cornerRadius(8)
                }
            }
            
            Spacer()
        }
        .padding(16)
        .background(
            LinearGradient(
                colors: [
                    Color.choreStarCardBackground,
                    isCompleted ? Color.choreStarSuccess.opacity(0.05) : Color.choreStarCardBackground
                ],
                startPoint: .leading,
                endPoint: .trailing
            )
        )
        .cornerRadius(16)
        .shadow(color: isCompleted ? Color.choreStarSuccess.opacity(0.1) : Color.black.opacity(0.06), radius: 8, x: 0, y: 3)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(
                    isCompleted ? Color.choreStarSuccess.opacity(0.3) : Color.choreStarBackground,
                    lineWidth: 1.5
                )
        )
        .scaleEffect(isCompleted ? 0.98 : 1.0)
        .animation(.spring(response: 0.4, dampingFraction: 0.7), value: isCompleted)
    }
}

#Preview {
    DashboardView().environmentObject(SupabaseManager.shared)
}
