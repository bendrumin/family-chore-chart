import SwiftUI

struct AchievementsView: View {
    let child: Child
    @EnvironmentObject var manager: SupabaseManager

    private var progressList: [AchievementProgressInfo] {
        manager.achievementProgress(for: child.id)
    }

    private var earnedCount: Int {
        progressList.filter(\.earned).count
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

                    Text("\(earnedCount) of \(AchievementDefinition.all.count) badges earned")
                        .font(.subheadline)
                        .foregroundColor(.choreStarTextSecondary)
                }
                .padding(.top, 20)

                LazyVGrid(columns: [
                    GridItem(.adaptive(minimum: 260, maximum: 400), spacing: 16, alignment: .top)
                ], spacing: 16) {
                    ForEach(progressList) { info in
                        AchievementProgressCard(info: info)
                    }
                }
                .padding(.horizontal, 20)

                Spacer(minLength: 40)
            }
        }
        .background(Color.choreStarBackground)
        .navigationTitle("Achievements")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct AchievementProgressCard: View {
    let info: AchievementProgressInfo

    private var rarity: AchievementRarity { info.definition.rarity }

    var body: some View {
        HStack(spacing: 16) {
            // Badge icon with rarity ring
            ZStack {
                Circle()
                    .fill(info.earned ? AnyShapeStyle(rarity.gradient) : AnyShapeStyle(Color.choreStarBackground))
                    .frame(width: 64, height: 64)

                Text(info.definition.icon)
                    .font(.system(size: 32))
                    .opacity(info.earned ? 1.0 : 0.4)
                    .saturation(info.earned ? 1.0 : 0.0)
            }

            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 8) {
                    Text(info.definition.name)
                        .font(.headline)
                        .fontWeight(.bold)
                        .foregroundColor(.choreStarTextPrimary)
                        .lineLimit(1)

                    Text(rarity.label)
                        .font(.caption2)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(rarity.gradient)
                        .cornerRadius(8)
                }

                Text(info.definition.description)
                    .font(.caption)
                    .foregroundColor(.choreStarTextSecondary)
                    .lineLimit(2)

                if info.earned {
                    HStack(spacing: 4) {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.caption)
                        Text(info.earnedAt.map { "Earned \(formatDate($0))" } ?? "Earned!")
                            .font(.caption2)
                            .fontWeight(.semibold)
                    }
                    .foregroundColor(.choreStarSuccess)
                } else {
                    // Progress bar toward the requirement
                    VStack(alignment: .leading, spacing: 4) {
                        GeometryReader { geometry in
                            ZStack(alignment: .leading) {
                                Capsule()
                                    .fill(Color.choreStarBackground)
                                Capsule()
                                    .fill(rarity.gradient)
                                    .frame(width: max(4, geometry.size.width * info.progress))
                            }
                        }
                        .frame(height: 6)

                        Text("\(info.currentCount)/\(info.requiredCount)")
                            .font(.caption2)
                            .foregroundColor(.choreStarTextSecondary)
                    }
                }
            }

            Spacer(minLength: 0)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.choreStarCardBackground)
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 3)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .strokeBorder(info.earned ? rarity.color.opacity(0.45) : Color.clear, lineWidth: 1.5)
        )
        .opacity(info.earned ? 1.0 : 0.92)
    }

    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        return formatter.string(from: date)
    }
}

#Preview {
    NavigationStack {
        AchievementsView(
            child: Child(
                id: UUID(),
                name: "Emma",
                age: 8,
                avatarColor: "pink",
                avatarUrl: nil,
                avatarFile: nil,
                userId: UUID(),
                createdAt: Date(),
                updatedAt: Date()
            )
        )
        .environmentObject(SupabaseManager.shared)
    }
}
