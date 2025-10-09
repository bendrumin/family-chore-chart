import SwiftUI

struct HistoryView: View {
    @EnvironmentObject var manager: SupabaseManager
    @State private var selectedPeriod: TimePeriod = .week
    
    enum TimePeriod: String, CaseIterable {
        case week = "Week"
        case month = "Month"
        case allTime = "All Time"
    }
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    // Time period selector
                    HStack(spacing: 0) {
                        ForEach(TimePeriod.allCases, id: \.self) { period in
                            Button(action: {
                                withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                                    selectedPeriod = period
                                }
                            }) {
                                Text(period.rawValue)
                                    .font(.subheadline)
                                    .fontWeight(.semibold)
                                    .foregroundColor(selectedPeriod == period ? .white : .choreStarTextSecondary)
                                    .padding(.horizontal, 20)
                                    .padding(.vertical, 10)
                                    .background(
                                        RoundedRectangle(cornerRadius: 12)
                                            .fill(selectedPeriod == period ? Color.choreStarPrimary : Color.clear)
                                    )
                            }
                            .buttonStyle(PlainButtonStyle())
                        }
                        Spacer()
                    }
                    .padding(4)
                    .background(Color.choreStarSecondary.opacity(0.2))
                    .cornerRadius(16)
                    .padding(.horizontal, 20)
                    .padding(.top, 20)
                    
                    // Summary cards
                    LazyVGrid(columns: [
                        GridItem(.flexible()),
                        GridItem(.flexible())
                    ], spacing: 16) {
                        SummaryCard(
                            icon: "checkmark.circle.fill",
                            value: "0",
                            label: "Completed",
                            color: .choreStarSuccess
                        )
                        
                        SummaryCard(
                            icon: "star.fill",
                            value: "$0.00",
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
                            value: "0%",
                            label: "Completion",
                            color: .choreStarPrimary
                        )
                    }
                    .padding(.horizontal, 20)
                    
                    // Leaderboard
                    VStack(alignment: .leading, spacing: 16) {
                        Text("Family Leaderboard")
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundColor(.choreStarTextPrimary)
                            .padding(.horizontal, 20)
                        
                        VStack(spacing: 12) {
                            ForEach(Array(manager.children.enumerated()), id: \.element.id) { index, child in
                                LeaderboardRow(child: child, rank: index + 1, manager: manager)
                            }
                        }
                        .padding(.horizontal, 20)
                    }
                    
                    // Coming soon message
                    VStack(spacing: 12) {
                        Image(systemName: "chart.bar.xaxis")
                            .font(.system(size: 50))
                            .foregroundStyle(Color.choreStarGradient)
                        
                        Text("More Stats Coming Soon!")
                            .font(.headline)
                            .foregroundColor(.choreStarTextPrimary)
                        
                        Text("Weekly charts, trends, and achievements")
                            .font(.subheadline)
                            .foregroundColor(.choreStarTextSecondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding(40)
                    
                    Spacer(minLength: 100)
                }
                .padding(.top, 10)
            }
            .background(Color.choreStarBackground)
            .navigationTitle("Stats & History")
            .navigationBarTitleDisplayMode(.large)
        }
    }
}

struct SummaryCard: View {
    let icon: String
    let value: String
    let label: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: icon)
                .font(.title)
                .foregroundColor(color)
            
            Text(value)
                .font(.system(size: 28, weight: .bold, design: .rounded))
                .foregroundColor(.choreStarTextPrimary)
            
            Text(label)
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundColor(.choreStarTextSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 24)
        .background(Color.choreStarCardBackground)
        .cornerRadius(20)
        .shadow(color: .black.opacity(0.06), radius: 10, x: 0, y: 4)
        .overlay(
            RoundedRectangle(cornerRadius: 20)
                .strokeBorder(color.opacity(0.2), lineWidth: 1)
        )
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
                        Text(String(format: "$%.2f", totalEarnings))
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
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 3)
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

