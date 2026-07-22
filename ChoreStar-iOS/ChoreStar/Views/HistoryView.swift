import SwiftUI
import Charts

struct HistoryView: View {
    @EnvironmentObject var manager: SupabaseManager
    @State private var selectedChild: UUID?
    @State private var scrubbedDay: String?

    private struct DayCompletionCount: Identifiable {
        let id: Int
        let label: String
        let count: Int
    }

    private struct ChildCompletionCount: Identifiable {
        let id: UUID
        let name: String
        let color: Color
        let count: Int
    }

    private var weeklyTrend: [DayCompletionCount] {
        let relevantChoreIds: Set<UUID> = {
            if let selected = selectedChild {
                return Set(manager.chores.filter { $0.childId == selected }.map(\.id))
            }
            return Set(manager.chores.map(\.id))
        }()

        return (0..<7).map { day in
            let count = manager.weekCompletions.filter {
                $0.dayOfWeek == day && relevantChoreIds.contains($0.choreId)
            }.count
            return DayCompletionCount(id: day, label: dayLabels[day], count: count)
        }
    }

    private var completionsByChild: [ChildCompletionCount] {
        manager.children.map { child in
            let childChoreIds = Set(manager.chores.filter { $0.childId == child.id }.map(\.id))
            let count = manager.weekCompletions.filter { childChoreIds.contains($0.choreId) }.count
            return ChildCompletionCount(
                id: child.id,
                name: child.name,
                color: Color.fromString(child.avatarColor),
                count: count
            )
        }
    }
    
    private var stats: WeeklyStats {
        if let childId = selectedChild {
            return manager.calculateWeeklyStats(for: childId)
        }
        return manager.calculateAggregateWeeklyStats()
    }
    
    private let dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // Child picker
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            childFilterButton(name: "All", id: nil)
                            ForEach(manager.children) { child in
                                childFilterButton(name: child.name, id: child.id)
                            }
                        }
                        .padding(.horizontal, 20)
                        .padding(.top, 20)
                    }
                    
                    // Summary cards
                    LazyVGrid(columns: [
                        GridItem(.adaptive(minimum: 160, maximum: 260), spacing: 16)
                    ], spacing: 16) {
                        SummaryCard(
                            icon: "checkmark.circle.fill",
                            value: "\(stats.totalCompletions)",
                            label: "Completed",
                            color: .choreStarSuccess
                        )
                        
                        SummaryCard(
                            icon: "star.fill",
                            value: manager.formatMoney(stats.totalEarnings),
                            label: "Total Earned",
                            color: .choreStarAccent
                        )
                        
                        SummaryCard(
                            icon: "trophy.fill",
                            value: "\(manager.achievements.count)",
                            label: "Total Badges",
                            color: .choreStarWarning
                        )
                        
                        SummaryCard(
                            icon: "chart.line.uptrend.xyaxis",
                            value: "\(Int(stats.completionRate * 100))%",
                            label: "Completion",
                            color: .choreStarPrimary
                        )
                    }
                    .padding(.horizontal, 20)

                    // Weekly completion trend
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Completions This Week")
                            .font(.title3)
                            .fontWeight(.bold)
                            .foregroundColor(.choreStarTextPrimary)

                        Chart(weeklyTrend) { item in
                            AreaMark(
                                x: .value("Day", item.label),
                                y: .value("Completions", item.count)
                            )
                            .foregroundStyle(
                                LinearGradient(
                                    colors: [Color.choreStarPrimary.opacity(0.25), Color.choreStarPrimary.opacity(0.02)],
                                    startPoint: .top,
                                    endPoint: .bottom
                                )
                            )
                            .interpolationMethod(.monotone)

                            LineMark(
                                x: .value("Day", item.label),
                                y: .value("Completions", item.count)
                            )
                            .foregroundStyle(Color.choreStarPrimary)
                            .lineStyle(StrokeStyle(lineWidth: 2, lineCap: .round))
                            .interpolationMethod(.monotone)

                            PointMark(
                                x: .value("Day", item.label),
                                y: .value("Completions", item.count)
                            )
                            .foregroundStyle(Color.choreStarPrimary)
                            .symbolSize(36)

                            // Scrub indicator + value callout
                            if let scrubbedDay,
                               scrubbedDay == item.label {
                                RuleMark(x: .value("Day", scrubbedDay))
                                    .foregroundStyle(Color.choreStarTextSecondary.opacity(0.35))
                                    .lineStyle(StrokeStyle(lineWidth: 1, dash: [4, 3]))
                                    .annotation(
                                        position: .top,
                                        overflowResolution: .init(x: .fit(to: .chart), y: .disabled)
                                    ) {
                                        VStack(spacing: 2) {
                                            Text(item.label)
                                                .font(.caption2)
                                                .foregroundColor(.choreStarTextSecondary)
                                            Text("\(item.count) done")
                                                .font(.system(.subheadline, design: .rounded).weight(.bold))
                                                .foregroundColor(.choreStarTextPrimary)
                                        }
                                        .padding(.horizontal, 10)
                                        .padding(.vertical, 6)
                                        .background(Color.choreStarCardBackground)
                                        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                                        .shadow(color: .black.opacity(0.15), radius: 4, y: 2)
                                    }
                            }
                        }
                        .chartXSelection(value: $scrubbedDay)
                        .chartYAxis {
                            AxisMarks(position: .leading) { _ in
                                AxisGridLine()
                                    .foregroundStyle(Color.choreStarTextSecondary.opacity(0.15))
                                AxisValueLabel()
                                    .foregroundStyle(Color.choreStarTextSecondary)
                            }
                        }
                        .chartXAxis {
                            AxisMarks { _ in
                                AxisValueLabel()
                                    .foregroundStyle(Color.choreStarTextSecondary)
                            }
                        }
                        .frame(height: 190)
                    }
                    .padding(16)
                    .background(Color.choreStarCardBackground)
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                    .padding(.horizontal, 20)

                    // Per-child comparison (only meaningful with 2+ kids, unfiltered)
                    if selectedChild == nil && manager.children.count > 1 {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("By Child")
                                .font(.title3)
                                .fontWeight(.bold)
                                .foregroundColor(.choreStarTextPrimary)

                            Chart(completionsByChild) { item in
                                BarMark(
                                    x: .value("Child", item.name),
                                    y: .value("Completions", item.count),
                                    width: .ratio(0.55)
                                )
                                .foregroundStyle(item.color)
                                .cornerRadius(4)
                                .annotation(position: .top, alignment: .center) {
                                    Text("\(item.count)")
                                        .font(.caption2)
                                        .fontWeight(.semibold)
                                        .foregroundColor(.choreStarTextSecondary)
                                }
                            }
                            .chartYAxis {
                                AxisMarks(position: .leading) { _ in
                                    AxisGridLine()
                                        .foregroundStyle(Color.choreStarTextSecondary.opacity(0.15))
                                    AxisValueLabel()
                                        .foregroundStyle(Color.choreStarTextSecondary)
                                }
                            }
                            .chartXAxis {
                                AxisMarks { _ in
                                    AxisValueLabel()
                                        .foregroundStyle(Color.choreStarTextSecondary)
                                }
                            }
                            .frame(height: 190)
                        }
                        .padding(16)
                        .background(Color.choreStarCardBackground)
                        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                        .padding(.horizontal, 20)
                    }
                    
                    // Perfect Days
                    VStack(alignment: .leading, spacing: 16) {
                        HStack {
                            Text("Perfect Days")
                                .font(.title2)
                                .fontWeight(.bold)
                                .foregroundColor(.choreStarTextPrimary)
                            
                            Spacer()
                            
                            Text("\(stats.perfectDays)/7")
                                .font(.headline)
                                .fontWeight(.bold)
                                .foregroundColor(.choreStarPrimary)
                        }
                        .padding(.horizontal, 20)
                        
                        HStack(spacing: 0) {
                            ForEach(0..<7, id: \.self) { day in
                                VStack(spacing: 6) {
                                    Image(systemName: stats.dailyStatus[day] ? "star.fill" : "star")
                                        .font(.title2)
                                        .foregroundColor(stats.dailyStatus[day] ? .choreStarAccent : .choreStarTextSecondary.opacity(0.3))
                                    
                                    Text(dayLabels[day])
                                        .font(.caption2)
                                        .fontWeight(.semibold)
                                        .foregroundColor(.choreStarTextSecondary)
                                }
                                .frame(maxWidth: .infinity)
                            }
                        }
                        .padding(16)
                        .background(Color.choreStarCardBackground)
                        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                        .padding(.horizontal, 20)
                        
                        if stats.perfectDays == 7 {
                            Text("Perfect week! Amazing job!")
                                .font(.subheadline)
                                .fontWeight(.semibold)
                                .foregroundColor(.choreStarSuccess)
                                .padding(.horizontal, 20)
                        }
                    }
                    
                    // Streak
                    if stats.streak > 0 {
                        HStack(spacing: 16) {
                            Image(systemName: "flame.fill")
                                .font(.title)
                                .foregroundColor(.orange)
                            
                            VStack(alignment: .leading, spacing: 4) {
                                Text("\(stats.streak) Day Streak")
                                    .font(.title3)
                                    .fontWeight(.bold)
                                    .foregroundColor(.choreStarTextPrimary)
                                
                                Text("Keep it going!")
                                    .font(.subheadline)
                                    .foregroundColor(.choreStarTextSecondary)
                            }
                            
                            Spacer()
                        }
                        .padding(16)
                        .background(Color.orange.opacity(0.1))
                        .cornerRadius(16)
                        .overlay(
                            RoundedRectangle(cornerRadius: 16)
                                .strokeBorder(Color.orange.opacity(0.3), lineWidth: 1)
                        )
                        .padding(.horizontal, 20)
                    }
                    
                    // Leaderboard
                    VStack(alignment: .leading, spacing: 16) {
                        Text("Family Leaderboard")
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundColor(.choreStarTextPrimary)
                            .padding(.horizontal, 20)
                        
                        VStack(spacing: 12) {
                            ForEach(Array(sortedChildren.enumerated()), id: \.element.id) { index, child in
                                LeaderboardRow(child: child, rank: index + 1, manager: manager)
                            }
                        }
                        .padding(.horizontal, 20)
                    }
                    
                    Spacer(minLength: 100)
                }
                .padding(.top, 10)
            }
            .background(Color.choreStarBackground)
            .navigationTitle("Stats & History")
            .navigationBarTitleDisplayMode(.large)
        }
    }
    
    private var sortedChildren: [Child] {
        manager.children.sorted { a, b in
            let statsA = manager.calculateWeeklyStats(for: a.id)
            let statsB = manager.calculateWeeklyStats(for: b.id)
            return statsA.totalCompletions > statsB.totalCompletions
        }
    }
    
    private func childFilterButton(name: String, id: UUID?) -> some View {
        Button(action: {
            withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                selectedChild = id
            }
        }) {
            Text(name)
                .font(.subheadline)
                .fontWeight(.semibold)
                .foregroundColor(selectedChild == id ? .white : .choreStarTextSecondary)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(
                    RoundedRectangle(cornerRadius: 10)
                        .fill(selectedChild == id ? Color.choreStarPrimary : Color.choreStarSecondary.opacity(0.2))
                )
        }
        .buttonStyle(PlainButtonStyle())
    }
}

struct SummaryCard: View {
    let icon: String
    let value: String
    let label: String
    let color: Color

    var body: some View {
        StatTile(systemImage: icon, value: value, label: label, tint: color)
    }
}

struct LeaderboardRow: View {
    let child: Child
    let rank: Int
    let manager: SupabaseManager
    
    private var childChores: [Chore] {
        manager.chores.filter { $0.childId == child.id }
    }
    
    private var completedCount: Int {
        childChores.filter { manager.isChoreCompleted($0) }.count
    }
    
    private var totalEarnings: Double {
        manager.calculateTodayEarnings(for: child.id)
    }
    
    private var badgeCount: Int {
        manager.getAchievements(for: child.id).count
    }
    
    private var rankColor: Color {
        switch rank {
        case 1: return Color(red: 1.0, green: 0.84, blue: 0.0) // Gold
        case 2: return Color(red: 0.75, green: 0.75, blue: 0.75) // Silver
        case 3: return Color(red: 0.8, green: 0.5, blue: 0.2) // Bronze
        default: return .choreStarTextSecondary
        }
    }
    
    var body: some View {
        HStack(spacing: 16) {
            // Rank badge
            ZStack {
                Circle()
                    .fill(rankColor.opacity(0.2))
                    .frame(width: 40, height: 40)
                
                Text("#\(rank)")
                    .font(.headline)
                    .fontWeight(.bold)
                    .foregroundColor(rankColor)
            }
            
            // Avatar
            Circle()
                .fill(
                    LinearGradient(
                        colors: [Color.fromString(child.avatarColor), Color.fromString(child.avatarColor).opacity(0.7)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(width: 50, height: 50)
                .overlay(
                    Text(child.initials)
                        .font(.headline)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                )
                .shadow(color: Color.fromString(child.avatarColor).opacity(0.3), radius: 6, x: 0, y: 3)
            
            // Info
            VStack(alignment: .leading, spacing: 4) {
                Text(child.name)
                    .font(.headline)
                    .fontWeight(.semibold)
                    .foregroundColor(.choreStarTextPrimary)
                
                HStack(spacing: 12) {
                    HStack(spacing: 4) {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.caption)
                            .foregroundColor(.choreStarSuccess)
                        Text("\(completedCount)")
                            .font(.subheadline)
                            .foregroundColor(.choreStarTextSecondary)
                    }
                    
                    HStack(spacing: 4) {
                        Image(systemName: "dollarsign.circle.fill")
                            .font(.caption)
                            .foregroundColor(.choreStarAccent)
                        Text(manager.formatMoney(totalEarnings))
                            .font(.subheadline)
                            .foregroundColor(.choreStarTextSecondary)
                    }
                    
                    HStack(spacing: 4) {
                        Image(systemName: "trophy.fill")
                            .font(.caption)
                            .foregroundColor(.choreStarWarning)
                        Text("\(badgeCount)")
                            .font(.subheadline)
                            .foregroundColor(.choreStarTextSecondary)
                    }
                }
            }
            
            Spacer()
            
            // Trophy for top 3
            if rank <= 3 {
                Image(systemName: "trophy.fill")
                    .font(.title3)
                    .foregroundColor(rankColor)
            }
        }
        .padding(16)
        .background(Color.choreStarCardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .strokeBorder(rank <= 3 ? rankColor.opacity(0.3) : Color.clear, lineWidth: 2)
        )
    }
}

#Preview {
    HistoryView()
        .environmentObject(SupabaseManager.shared)
}

