import SwiftUI

struct WeekCalendarView: View {
    let child: Child
    @EnvironmentObject var manager: SupabaseManager
    @State private var showConfetti = false
    @State private var showAchievementAlert = false
    @State private var earnedAchievements: [Achievement] = []
    @Environment(\.horizontalSizeClass) var horizontalSizeClass
    
    private let days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    private let fullDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    
    private var childChores: [Chore] {
        manager.chores.filter { $0.childId == child.id }
    }
    
    private var currentDayOfWeek: Int {
        Calendar.current.component(.weekday, from: Date()) - 1
    }
    
    // Responsive sizing based on device
    private var choreColumnWidth: CGFloat {
        horizontalSizeClass == .regular ? 200 : 140
    }
    
    private var cellSize: CGFloat {
        horizontalSizeClass == .regular ? 60 : 50
    }
    
    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Header
                VStack(spacing: 8) {
                    Text("\(child.name)'s Week")
                        .font(.title)
                        .fontWeight(.bold)
                        .foregroundColor(.choreStarTextPrimary)
                    
                    Text("Tap any cell to toggle completion")
                        .font(.subheadline)
                        .foregroundColor(.choreStarTextSecondary)
                }
                .padding(.top, 20)
                
                if childChores.isEmpty {
                    EmptyWeekView(childName: child.name)
                } else {
                    // Week grid - scrollable horizontally for small screens
                    ScrollView(.horizontal, showsIndicators: false) {
                        VStack(spacing: 0) {
                            // Day headers
                            HStack(spacing: 4) {
                                // Chore column header
                                VStack(spacing: 4) {
                                    Text("Chore")
                                        .font(.headline)
                                        .fontWeight(.bold)
                                        .foregroundColor(.choreStarTextPrimary)
                                }
                                .frame(width: choreColumnWidth, alignment: .leading)
                                .padding(.leading, 16)
                                
                                // Day headers
                                ForEach(0..<7) { dayIndex in
                                    VStack(spacing: 6) {
                                        Text(days[dayIndex])
                                            .font(.subheadline)
                                            .fontWeight(.bold)
                                        
                                        if dayIndex == currentDayOfWeek {
                                            Circle()
                                                .fill(Color.choreStarPrimary)
                                                .frame(width: 6, height: 6)
                                        } else {
                                            Circle()
                                                .fill(Color.clear)
                                                .frame(width: 6, height: 6)
                                        }
                                    }
                                    .frame(width: cellSize)
                                    .foregroundColor(dayIndex == currentDayOfWeek ? .choreStarPrimary : .choreStarTextSecondary)
                                }
                            }
                            .padding(.vertical, 16)
                            .background(Color.choreStarCardBackground)
                        
                            Divider()
                            
                            // Chore rows
                            ForEach(childChores) { chore in
                                ChoreWeekRow(
                                    chore: chore,
                                    child: child,
                                    manager: manager,
                                    earnedAchievements: $earnedAchievements,
                                    showAchievementAlert: $showAchievementAlert,
                                    showConfetti: $showConfetti,
                                    choreColumnWidth: choreColumnWidth,
                                    cellSize: cellSize
                                )
                                Divider()
                            }
                        }
                        .background(Color.choreStarCardBackground)
                        .cornerRadius(20)
                        .shadow(color: .black.opacity(0.08), radius: 15, x: 0, y: 5)
                    }
                    .padding(.horizontal, 16)
                }
                
                Spacer(minLength: 40)
            }
        }
        .background(Color.choreStarBackground)
        .navigationTitle("Week View")
        .navigationBarTitleDisplayMode(.inline)
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

struct ChoreWeekRow: View {
    let chore: Chore
    let child: Child
    @ObservedObject var manager: SupabaseManager
    @Binding var earnedAchievements: [Achievement]
    @Binding var showAchievementAlert: Bool
    @Binding var showConfetti: Bool
    let choreColumnWidth: CGFloat
    let cellSize: CGFloat
    
    var body: some View {
        HStack(spacing: 4) {
            // Chore info
            HStack(spacing: 10) {
                Text(chore.icon ?? "📝")
                    .font(.title2)
                
                VStack(alignment: .leading, spacing: 4) {
                    Text(chore.name)
                        .font(.body)
                        .fontWeight(.semibold)
                        .foregroundColor(.choreStarTextPrimary)
                        .lineLimit(2)
                    
                    if let category = chore.category {
                        Text(category)
                            .font(.caption)
                            .foregroundColor(.choreStarTextSecondary)
                    }
                }
            }
            .frame(width: choreColumnWidth, alignment: .leading)
            .padding(.leading, 16)
            
            // Day cells
            ForEach(0..<7) { dayIndex in
                DayCell(
                    chore: chore,
                    dayIndex: dayIndex,
                    manager: manager,
                    earnedAchievements: $earnedAchievements,
                    showAchievementAlert: $showAchievementAlert,
                    showConfetti: $showConfetti,
                    cellSize: cellSize
                )
                .frame(width: cellSize)
            }
        }
        .padding(.vertical, 16)
    }
}

struct DayCell: View {
    let chore: Chore
    let dayIndex: Int
    @ObservedObject var manager: SupabaseManager
    @Binding var earnedAchievements: [Achievement]
    @Binding var showAchievementAlert: Bool
    @Binding var showConfetti: Bool
    let cellSize: CGFloat
    
    private var isToday: Bool {
        let currentDay = Calendar.current.component(.weekday, from: Date()) - 1
        return dayIndex == currentDay
    }
    
    private var isCompleted: Bool {
        return manager.isChoreCompleted(chore, forDay: dayIndex)
    }
    
    var body: some View {
        Button(action: {
            let impact = UIImpactFeedbackGenerator(style: .light)
            impact.impactOccurred()
            
            let wasCompleted = isCompleted
            Task {
                let achievements = await manager.toggleChoreCompletion(chore, forDay: dayIndex)
                if !wasCompleted && isToday {
                    SoundManager.shared.play(.success)
                    await MainActor.run {
                        if !achievements.isEmpty {
                            earnedAchievements = achievements
                            showAchievementAlert = true
                        }
                        showConfetti = true
                    }
                }
            }
        }) {
            ZStack {
                RoundedRectangle(cornerRadius: 12)
                    .fill(isCompleted ? Color.choreStarSuccess : Color.choreStarBackground)
                    .frame(width: cellSize, height: cellSize)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .strokeBorder(
                                isCompleted ? Color.choreStarSuccess : (isToday ? Color.choreStarPrimary.opacity(0.5) : Color.choreStarTextSecondary.opacity(0.2)),
                                lineWidth: isToday ? 3 : 1.5
                            )
                    )
                    .shadow(color: isCompleted ? Color.choreStarSuccess.opacity(0.3) : .clear, radius: 4, x: 0, y: 2)
                
                if isCompleted {
                    Image(systemName: "checkmark")
                        .font(.system(size: cellSize * 0.5, weight: .bold))
                        .foregroundColor(.white)
                }
            }
        }
        .buttonStyle(PlainButtonStyle())
        .scaleEffect(isCompleted ? 1.0 : 0.95)
        .animation(.spring(response: 0.3, dampingFraction: 0.7), value: isCompleted)
    }
}

struct EmptyWeekView: View {
    let childName: String
    
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "calendar")
                .font(.system(size: 60))
                .foregroundStyle(Color.choreStarGradient)
            
            Text("No Chores Yet")
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(.choreStarTextPrimary)
            
            Text("\(childName) doesn't have any chores assigned yet.\nAdd some chores to get started!")
                .font(.body)
                .foregroundColor(.choreStarTextSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
        }
        .padding(40)
        .frame(maxWidth: .infinity)
    }
}

#Preview {
    NavigationView {
        WeekCalendarView(
            child: Child(
                id: UUID(),
                name: "Emma",
                age: 8,
                avatarColor: "pink",
                avatarUrl: nil,
                avatarFile: nil,
                userId: UUID(),
                childPin: nil,
                childAccessEnabled: false,
                createdAt: Date(),
                updatedAt: Date()
            )
        )
        .environmentObject(SupabaseManager.shared)
    }
}

