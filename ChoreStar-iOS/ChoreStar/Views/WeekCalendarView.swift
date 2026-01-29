import SwiftUI

struct WeekCalendarView: View {
    let child: Child
    @EnvironmentObject var manager: SupabaseManager
    @State private var showConfetti = false
    @State private var showAchievementAlert = false
    @State private var earnedAchievements: [Achievement] = []
    @State private var viewMode: ViewMode = .daily
    @Environment(\.horizontalSizeClass) var horizontalSizeClass
    
    enum ViewMode {
        case daily, grid
    }
    
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
    
    private var weekCompletionStats: (completed: Int, total: Int, percentage: Int, perfectDays: Int, earnings: Double) {
        let totalPossible = childChores.count * 7
        let completed = manager.weekCompletions.filter { completion in
            childChores.contains(where: { $0.id == completion.choreId })
        }.count
        let percentage = totalPossible > 0 ? Int((Double(completed) / Double(totalPossible)) * 100) : 0
        
        // Count perfect days
        var perfectDays = 0
        var totalEarnings = 0.0
        for day in 0..<7 {
            if manager.isPerfectDay(for: child.id, dayOfWeek: day) {
                perfectDays += 1
                totalEarnings += manager.calculateDayEarnings(for: child.id, dayOfWeek: day)
            }
        }
        
        return (completed, totalPossible, percentage, perfectDays, totalEarnings)
    }
    
    private func isDayPerfect(_ dayIndex: Int) -> Bool {
        return manager.isPerfectDay(for: child.id, dayOfWeek: dayIndex)
    }
    
    private func dayEarnings(_ dayIndex: Int) -> Double {
        return manager.calculateDayEarnings(for: child.id, dayOfWeek: dayIndex)
    }
    
    var body: some View {
        GeometryReader { geometry in
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
                
                // View Mode Picker
                Picker("View Mode", selection: $viewMode) {
                    Text("Daily List").tag(ViewMode.daily)
                    Text("Week View").tag(ViewMode.grid)
                }
                .pickerStyle(.segmented)
                .padding(.horizontal, 20)
                
                // Week Summary Card
                if !childChores.isEmpty {
                    VStack(spacing: 16) {
                        HStack(spacing: 16) {
                            VStack(spacing: 4) {
                                Text("\(weekCompletionStats.perfectDays)")
                                    .font(.system(size: 36, weight: .bold, design: .rounded))
                                    .foregroundStyle(Color.choreStarGradient)
                                Image(systemName: "star.fill")
                                    .font(.caption)
                                    .foregroundColor(.choreStarAccent)
                                Text("Perfect Days")
                                    .font(.caption)
                                    .foregroundColor(.choreStarTextSecondary)
                            }
                            .frame(maxWidth: .infinity)
                            
                            Divider()
                                .frame(height: 60)
                            
                            VStack(spacing: 4) {
                                Text(String(format: "$%.2f", weekCompletionStats.earnings))
                                    .font(.system(size: 36, weight: .bold, design: .rounded))
                                    .foregroundStyle(Color.choreStarWarningGradient)
                                Image(systemName: "dollarsign.circle.fill")
                                    .font(.caption)
                                    .foregroundColor(.choreStarAccent)
                                Text("Earned")
                                    .font(.caption)
                                    .foregroundColor(.choreStarTextSecondary)
                            }
                            .frame(maxWidth: .infinity)
                            
                            Divider()
                                .frame(height: 60)
                            
                            VStack(spacing: 4) {
                                Text("\(weekCompletionStats.percentage)%")
                                    .font(.system(size: 36, weight: .bold, design: .rounded))
                                    .foregroundStyle(Color.choreStarSuccessGradient)
                                Image(systemName: "chart.bar.fill")
                                    .font(.caption)
                                    .foregroundColor(.choreStarSuccess)
                                Text("Complete")
                                    .font(.caption)
                                    .foregroundColor(.choreStarTextSecondary)
                            }
                            .frame(maxWidth: .infinity)
                        }
                        
                        // Show daily reward info
                        HStack(spacing: 6) {
                            Image(systemName: "info.circle.fill")
                                .font(.caption)
                            Text("Complete all chores in a day to earn \(String(format: "$%.2f", Double(manager.familySettings?.dailyRewardCents ?? 7) / 100.0))")
                                .font(.caption)
                        }
                        .foregroundColor(.choreStarTextSecondary)
                    }
                    .padding(20)
                    .background(Color.choreStarCardBackground)
                    .cornerRadius(20)
                    .shadow(color: .black.opacity(0.06), radius: 10, x: 0, y: 4)
                    .padding(.horizontal, 20)
                }
                
                if childChores.isEmpty {
                    EmptyWeekView(childName: child.name)
                } else if viewMode == .daily {
                    // DAILY LIST VIEW
                    VStack(spacing: 16) {
                        ForEach(0..<7) { dayIndex in
                            DayBreakdownCard(
                                dayIndex: dayIndex,
                                dayName: fullDays[dayIndex],
                                shortDayName: days[dayIndex],
                                chores: childChores,
                                manager: manager,
                                earnedAchievements: $earnedAchievements,
                                showAchievementAlert: $showAchievementAlert,
                                showConfetti: $showConfetti
                            )
                        }
                    }
                    .padding(.horizontal, 20)
                } else {
                    // WEEK VIEW (GRID) - scrollable horizontally for small screens
                    let gridWidth = choreColumnWidth + (cellSize * 7) + 40
                    let needsScroll = gridWidth > geometry.size.width
                    
                    ScrollView(.horizontal, showsIndicators: needsScroll) {
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
                                        
                                        // Show earnings if perfect day
                                        if isDayPerfect(dayIndex) {
                                            Text(String(format: "$%.2f", dayEarnings(dayIndex)))
                                                .font(.caption2)
                                                .fontWeight(.bold)
                                                .foregroundColor(.choreStarAccent)
                                                .padding(.horizontal, 6)
                                                .padding(.vertical, 2)
                                                .background(Color.choreStarAccent.opacity(0.15))
                                                .cornerRadius(6)
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
                            ForEach(Array(childChores.enumerated()), id: \.element.id) { index, chore in
                                ChoreWeekRow(
                                    chore: chore,
                                    child: child,
                                    manager: manager,
                                    earnedAchievements: $earnedAchievements,
                                    showAchievementAlert: $showAchievementAlert,
                                    showConfetti: $showConfetti,
                                    choreColumnWidth: choreColumnWidth,
                                    cellSize: cellSize,
                                    isEvenRow: index % 2 == 0
                                )
                                
                                if index < childChores.count - 1 {
                                    Divider()
                                        .padding(.leading, choreColumnWidth + 20)
                                }
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
        }
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
    let isEvenRow: Bool
    
    var body: some View {
        HStack(spacing: 4) {
            // Chore info
            HStack(spacing: 12) {
                Text(chore.icon ?? "📝")
                    .font(.title)
                
                VStack(alignment: .leading, spacing: 4) {
                    Text(chore.name)
                        .font(.callout)
                        .fontWeight(.semibold)
                        .foregroundColor(.choreStarTextPrimary)
                        .lineLimit(2)
                    
                    if let category = chore.category {
                        HStack(spacing: 4) {
                            Image(systemName: "tag.fill")
                                .font(.system(size: 8))
                            Text(category)
                                .font(.caption)
                        }
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
        .padding(.vertical, 18)
        .background(isEvenRow ? Color.choreStarBackground.opacity(0.3) : Color.clear)
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

struct DayBreakdownCard: View {
    let dayIndex: Int
    let dayName: String
    let shortDayName: String
    let chores: [Chore]
    @ObservedObject var manager: SupabaseManager
    @Binding var earnedAchievements: [Achievement]
    @Binding var showAchievementAlert: Bool
    @Binding var showConfetti: Bool
    
    private var currentDayOfWeek: Int {
        Calendar.current.component(.weekday, from: Date()) - 1
    }
    
    private var isToday: Bool {
        dayIndex == currentDayOfWeek
    }
    
    private var completedChores: [Chore] {
        chores.filter { manager.isChoreCompleted($0, forDay: dayIndex) }
    }
    
    private var pendingChores: [Chore] {
        chores.filter { !manager.isChoreCompleted($0, forDay: dayIndex) }
    }
    
    private var completionPercentage: Double {
        guard !chores.isEmpty else { return 0 }
        return Double(completedChores.count) / Double(chores.count)
    }
    
    private var isPerfectDay: Bool {
        !chores.isEmpty && completedChores.count == chores.count
    }
    
    private var dayEarnings: Double {
        guard isPerfectDay, let firstChore = chores.first else { return 0.0 }
        return manager.calculateDayEarnings(for: firstChore.childId, dayOfWeek: dayIndex)
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Day Header
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 8) {
                        Text(dayName)
                            .font(.headline)
                            .fontWeight(.bold)
                            .foregroundColor(isToday ? .choreStarPrimary : .choreStarTextPrimary)
                        
                        if isToday {
                            Text("TODAY")
                                .font(.caption2)
                                .fontWeight(.bold)
                                .foregroundColor(.white)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(Color.choreStarPrimary)
                                .cornerRadius(8)
                        }
                    }
                    
                    HStack(spacing: 8) {
                        Text("\(completedChores.count) of \(chores.count) completed")
                            .font(.caption)
                            .foregroundColor(.choreStarTextSecondary)
                        
                        // Show earnings ONLY if all chores complete
                        if isPerfectDay && dayEarnings > 0 {
                            HStack(spacing: 4) {
                                Image(systemName: "star.fill")
                                    .font(.system(size: 10))
                                Text(String(format: "$%.2f", dayEarnings))
                                    .font(.caption)
                                    .fontWeight(.bold)
                            }
                            .foregroundColor(.choreStarAccent)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Color.choreStarAccent.opacity(0.15))
                            .cornerRadius(8)
                        }
                    }
                }
                
                Spacer()
                
                // Circular progress
                ZStack {
                    Circle()
                        .stroke(Color.choreStarTextSecondary.opacity(0.2), lineWidth: 4)
                        .frame(width: 50, height: 50)
                    
                    Circle()
                        .trim(from: 0, to: completionPercentage)
                        .stroke(
                            isPerfectDay ? Color.choreStarAccent : Color.choreStarSuccess,
                            style: StrokeStyle(lineWidth: 4, lineCap: .round)
                        )
                        .frame(width: 50, height: 50)
                        .rotationEffect(.degrees(-90))
                    
                    if isPerfectDay {
                        Image(systemName: "star.fill")
                            .font(.system(size: 16))
                            .foregroundColor(.choreStarAccent)
                    } else {
                        Text("\(Int(completionPercentage * 100))%")
                            .font(.caption2)
                            .fontWeight(.bold)
                            .foregroundColor(.choreStarTextPrimary)
                    }
                }
            }
            .padding(.bottom, 8)
            
            // Chores list
            VStack(spacing: 8) {
                ForEach(chores) { chore in
                    DailyChoreRow(
                        chore: chore,
                        dayIndex: dayIndex,
                        manager: manager,
                        earnedAchievements: $earnedAchievements,
                        showAchievementAlert: $showAchievementAlert,
                        showConfetti: $showConfetti
                    )
                }
            }
        }
        .padding(16)
        .background(
            LinearGradient(
                colors: isToday ? 
                    [Color.choreStarPrimary.opacity(0.05), Color.choreStarCardBackground] :
                    [Color.choreStarCardBackground, Color.choreStarCardBackground],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .cornerRadius(16)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .strokeBorder(isToday ? Color.choreStarPrimary.opacity(0.3) : Color.clear, lineWidth: 2)
        )
        .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 3)
    }
}

struct DailyChoreRow: View {
    let chore: Chore
    let dayIndex: Int
    @ObservedObject var manager: SupabaseManager
    @Binding var earnedAchievements: [Achievement]
    @Binding var showAchievementAlert: Bool
    @Binding var showConfetti: Bool
    
    private var currentDayOfWeek: Int {
        Calendar.current.component(.weekday, from: Date()) - 1
    }
    
    private var isToday: Bool {
        dayIndex == currentDayOfWeek
    }
    
    private var isCompleted: Bool {
        manager.isChoreCompleted(chore, forDay: dayIndex)
    }
    
    var body: some View {
        Button(action: {
            let impact = UIImpactFeedbackGenerator(style: .medium)
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
            HStack(spacing: 12) {
                // Completion checkbox
                ZStack {
                    Circle()
                        .strokeBorder(
                            isCompleted ? Color.choreStarSuccess : Color.choreStarTextSecondary.opacity(0.3),
                            lineWidth: 2
                        )
                        .frame(width: 24, height: 24)
                    
                    if isCompleted {
                        Image(systemName: "checkmark")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(.choreStarSuccess)
                    }
                }
                
                // Chore icon
                Text(chore.icon ?? "📝")
                    .font(.title3)
                
                // Chore info
                VStack(alignment: .leading, spacing: 2) {
                    Text(chore.name)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(isCompleted ? .choreStarTextSecondary : .choreStarTextPrimary)
                        .strikethrough(isCompleted, color: .choreStarTextSecondary)
                    
                    if let category = chore.category {
                        Text(category)
                            .font(.caption2)
                            .foregroundColor(.choreStarTextSecondary)
                    }
                }
                
                Spacer()
            }
            .padding(10)
            .background(isCompleted ? Color.choreStarSuccess.opacity(0.05) : Color.clear)
            .cornerRadius(10)
        }
        .buttonStyle(PlainButtonStyle())
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

