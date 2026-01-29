import SwiftUI

struct AchievementsView: View {
    let child: Child
    @EnvironmentObject var manager: SupabaseManager
    
    private var childAchievements: [Achievement] {
        manager.getAchievements(for: child.id)
    }
    
    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                //  Header
                VStack(spacing: 12) {
                    Text("🏆")
                        .font(.system(size: 60))
                    
                    Text("\(child.name)'s Achievements")
                        .font(.title)
                        .fontWeight(.bold)
                        .foregroundColor(.choreStarTextPrimary)
                    
                    Text("\(childAchievements.count) badges earned")
                        .font(.subheadline)
                        .foregroundColor(.choreStarTextSecondary)
                }
                .padding(.top, 20)
                
                // Achievements grid
                if childAchievements.isEmpty {
                    EmptyAchievementsView(childName: child.name)
                } else {
                    LazyVGrid(columns: [
                        GridItem(.flexible()),
                        GridItem(.flexible())
                    ], spacing: 16) {
                        ForEach(childAchievements) { achievement in
                            AchievementCard(achievement: achievement)
                        }
                    }
                    .padding(.horizontal, 20)
                }
                
                // Available badges section
                VStack(alignment: .leading, spacing: 16) {
                    Text("Available Badges")
                        .font(.headline)
                        .foregroundColor(.choreStarTextPrimary)
                        .padding(.horizontal, 20)
                    
                    VStack(spacing: 12) {
                        ForEach([BadgeType.firstChore, BadgeType.perfectWeek, BadgeType.dedicated], id: \.self) { badgeType in
                            let isEarned = childAchievements.contains { $0.badgeType == badgeType.rawValue }
                            AvailableBadgeRow(badgeType: badgeType, isEarned: isEarned)
                        }
                    }
                    .padding(.horizontal, 20)
                }
                .padding(.top, 20)
                
                Spacer(minLength: 40)
            }
        }
        .background(Color.choreStarBackground)
        .navigationTitle("Achievements")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct AchievementCard: View {
    let achievement: Achievement
    
    var body: some View {
        VStack(spacing: 12) {
            // Badge icon
            ZStack {
                Circle()
                    .fill(
                        LinearGradient(
                            colors: [Color.choreStarAccent, Color.choreStarAccent.opacity(0.7)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 80, height: 80)
                    .shadow(color: Color.choreStarAccent.opacity(0.3), radius: 10, x: 0, y: 5)
                
                Text(achievement.badgeIcon)
                    .font(.system(size: 40))
            }
            
            // Badge info
            VStack(spacing: 4) {
                Text(achievement.badgeName)
                    .font(.headline)
                    .fontWeight(.bold)
                    .foregroundColor(.choreStarTextPrimary)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
                
                Text(achievement.badgeDescription)
                    .font(.caption)
                    .foregroundColor(.choreStarTextSecondary)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
                
                Text(formatDate(achievement.earnedAt))
                    .font(.caption2)
                    .foregroundColor(.choreStarTextSecondary.opacity(0.7))
                    .padding(.top, 4)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity)
        .background(Color.choreStarCardBackground)
        .cornerRadius(20)
        .shadow(color: .black.opacity(0.06), radius: 10, x: 0, y: 4)
        .overlay(
            RoundedRectangle(cornerRadius: 20)
                .strokeBorder(Color.choreStarAccent.opacity(0.3), lineWidth: 2)
        )
    }
    
    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        return formatter.string(from: date)
    }
}

struct AvailableBadgeRow: View {
    let badgeType: BadgeType
    let isEarned: Bool
    
    var body: some View {
        HStack(spacing: 16) {
            // Icon
            Text(badgeType.icon)
                .font(.system(size: 32))
                .opacity(isEarned ? 1.0 : 0.3)
            
            // Info
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(badgeType.name)
                        .font(.headline)
                        .foregroundColor(.choreStarTextPrimary)
                    
                    if isEarned {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(.choreStarSuccess)
                    } else {
                        Image(systemName: "lock.fill")
                            .font(.caption)
                            .foregroundColor(.choreStarTextSecondary.opacity(0.5))
                    }
                }
                
                Text(badgeType.description)
                    .font(.subheadline)
                    .foregroundColor(.choreStarTextSecondary)
                    .lineLimit(2)
            }
            
            Spacer()
        }
        .padding(16)
        .background(isEarned ? Color.choreStarSuccess.opacity(0.1) : Color.choreStarCardBackground)
        .cornerRadius(16)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .strokeBorder(isEarned ? Color.choreStarSuccess.opacity(0.3) : Color.clear, lineWidth: 1)
        )
    }
}

struct EmptyAchievementsView: View {
    let childName: String
    
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "trophy")
                .font(.system(size: 60))
                .foregroundStyle(Color.choreStarGradient)
            
            Text("No Achievements Yet!")
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(.choreStarTextPrimary)
            
            Text("\(childName) hasn't earned any badges yet.\nComplete chores to unlock achievements!")
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
        AchievementsView(
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

