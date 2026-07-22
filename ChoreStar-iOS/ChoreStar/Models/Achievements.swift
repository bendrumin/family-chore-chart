import SwiftUI

/// Achievement taxonomy — mirrors the web app's `lib/constants/achievements.ts`.
/// `id` doubles as the `badge_type` written to `achievement_badges`.

enum AchievementRarity: String, Codable {
    case common
    case rare
    case epic
    case legendary

    var label: String { rawValue.capitalized }

    var color: Color {
        switch self {
        case .common: return .gray
        case .rare: return .blue
        case .epic: return .purple
        case .legendary: return .orange
        }
    }

    var gradient: LinearGradient {
        switch self {
        case .common:
            return LinearGradient(colors: [.gray, .gray.opacity(0.7)], startPoint: .topLeading, endPoint: .bottomTrailing)
        case .rare:
            return LinearGradient(colors: [.blue, .blue.opacity(0.7)], startPoint: .topLeading, endPoint: .bottomTrailing)
        case .epic:
            return LinearGradient(colors: [.purple, .purple.opacity(0.7)], startPoint: .topLeading, endPoint: .bottomTrailing)
        case .legendary:
            return LinearGradient(colors: [.yellow, .orange], startPoint: .topLeading, endPoint: .bottomTrailing)
        }
    }

    var sortOrder: Int {
        switch self {
        case .common: return 0
        case .rare: return 1
        case .epic: return 2
        case .legendary: return 3
        }
    }
}

enum AchievementRequirement {
    case firstChore
    case weekComplete
    case streak(days: Int)
    case totalCount(Int)
    case categoryCount(category: AchievementCategory, count: Int)
}

/// Broad categories used by category-count achievements. Each maps loosely onto
/// the concrete chore categories used by both the web and iOS chore editors.
enum AchievementCategory {
    case household
    case learning
    case creative
    case physical

    func matches(_ choreCategory: String?) -> Bool {
        guard let raw = choreCategory?.lowercased() else { return false }
        switch self {
        case .household:
            return ["household", "household_chores", "bedroom", "kitchen", "bathroom", "general", "outdoor", "pets"].contains(raw)
        case .learning:
            return ["learning", "learning_education", "homework", "reading"].contains(raw)
        case .creative:
            return ["creative", "creative_time"].contains(raw)
        case .physical:
            return ["physical", "physical_activity", "games_play"].contains(raw)
        }
    }
}

struct AchievementDefinition: Identifiable {
    let id: String
    let name: String
    let description: String
    let icon: String
    let rarity: AchievementRarity
    let requirement: AchievementRequirement

    /// The 10 achievements, matching web's ACHIEVEMENTS list.
    static let all: [AchievementDefinition] = [
        AchievementDefinition(
            id: "first_steps", name: "First Steps",
            description: "Complete your first chore",
            icon: "👶", rarity: .common, requirement: .firstChore
        ),
        AchievementDefinition(
            id: "week_warrior", name: "Week Warrior",
            description: "Complete all chores for a full week",
            icon: "⚔️", rarity: .rare, requirement: .weekComplete
        ),
        AchievementDefinition(
            id: "streak_master", name: "Streak Master",
            description: "Maintain a 10-day streak",
            icon: "🔥", rarity: .epic, requirement: .streak(days: 10)
        ),
        AchievementDefinition(
            id: "perfect_week", name: "Perfect Week",
            description: "Complete every single chore for a week",
            icon: "⭐", rarity: .legendary, requirement: .weekComplete
        ),
        AchievementDefinition(
            id: "family_helper", name: "Family Helper",
            description: "Complete 50 household chores",
            icon: "🏠", rarity: .rare,
            requirement: .categoryCount(category: .household, count: 50)
        ),
        AchievementDefinition(
            id: "little_scholar", name: "Little Scholar",
            description: "Complete 25 learning activities",
            icon: "📚", rarity: .rare,
            requirement: .categoryCount(category: .learning, count: 25)
        ),
        AchievementDefinition(
            id: "creative_artist", name: "Creative Artist",
            description: "Complete 20 creative activities",
            icon: "🎨", rarity: .rare,
            requirement: .categoryCount(category: .creative, count: 20)
        ),
        AchievementDefinition(
            id: "young_athlete", name: "Young Athlete",
            description: "Complete 30 physical activities",
            icon: "🏃", rarity: .rare,
            requirement: .categoryCount(category: .physical, count: 30)
        ),
        AchievementDefinition(
            id: "chore_champion", name: "Chore Champion",
            description: "Complete 100 total chores",
            icon: "🏆", rarity: .epic, requirement: .totalCount(100)
        ),
        AchievementDefinition(
            id: "super_star", name: "Super Star",
            description: "Complete 250 total chores",
            icon: "🌟", rarity: .legendary, requirement: .totalCount(250)
        ),
    ]
}

/// A completion record with enough context to evaluate achievements
/// (reconstructed date = week_start + day_of_week).
struct HistoricalCompletion {
    let choreId: UUID
    let weekStart: String
    let dayOfWeek: Int
    let date: Date?
}

struct AchievementProgressInfo: Identifiable {
    let definition: AchievementDefinition
    let earned: Bool
    let progress: Double // 0...1
    let currentCount: Int
    let requiredCount: Int
    let earnedAt: Date?

    var id: String { definition.id }
}

enum AchievementEngine {
    /// Evaluates all achievements for one child. Mirrors web's `checkAchievements`.
    static func progress(
        for childId: UUID,
        chores: [Chore],
        completions: [HistoricalCompletion],
        earnedBadges: [Achievement]
    ) -> [AchievementProgressInfo] {
        let childChoreIds = Set(chores.filter { $0.childId == childId }.map(\.id))
        let childCompletions = completions.filter { childChoreIds.contains($0.choreId) }

        let results = AchievementDefinition.all.map { definition -> AchievementProgressInfo in
            let persisted = earnedBadges.first {
                $0.childId == childId && $0.badgeType == definition.id
            }

            let (current, required): (Int, Int) = {
                switch definition.requirement {
                case .firstChore:
                    return (min(childCompletions.count, 1), 1)

                case .totalCount(let count):
                    return (childCompletions.count, count)

                case .weekComplete:
                    // A week where all 7 days saw at least one completion
                    let byWeek = Dictionary(grouping: childCompletions, by: \.weekStart)
                    let hasFullWeek = byWeek.values.contains { weekComps in
                        Set(weekComps.map(\.dayOfWeek)).count >= 7
                    }
                    return (hasFullWeek ? 1 : 0, 1)

                case .streak(let days):
                    return (currentStreak(childCompletions), days)

                case .categoryCount(let category, let count):
                    let categoryChoreIds = Set(
                        chores.filter { $0.childId == childId && category.matches($0.category) }.map(\.id)
                    )
                    let categoryCompletions = childCompletions.filter { categoryChoreIds.contains($0.choreId) }
                    return (categoryCompletions.count, count)
                }
            }()

            let ratio = required > 0 ? min(1.0, Double(current) / Double(required)) : 0
            return AchievementProgressInfo(
                definition: definition,
                earned: persisted != nil || ratio >= 1.0,
                progress: ratio,
                currentCount: current,
                requiredCount: required,
                earnedAt: persisted?.earnedAt
            )
        }

        // Earned first, then by progress, then rarity (matches web sorting)
        return results.sorted { a, b in
            if a.earned != b.earned { return a.earned }
            if a.progress != b.progress { return a.progress > b.progress }
            return a.definition.rarity.sortOrder < b.definition.rarity.sortOrder
        }
    }

    /// Consecutive days with at least one completion, counting back from today
    /// (yesterday also counts as the anchor so an unfinished today doesn't zero it).
    private static func currentStreak(_ completions: [HistoricalCompletion]) -> Int {
        let calendar = Calendar.current
        let completionDays = Set(
            completions.compactMap { $0.date.map { calendar.startOfDay(for: $0) } }
        )
        guard !completionDays.isEmpty else { return 0 }

        var anchor = calendar.startOfDay(for: Date())
        if !completionDays.contains(anchor) {
            guard let yesterday = calendar.date(byAdding: .day, value: -1, to: anchor),
                  completionDays.contains(yesterday) else { return 0 }
            anchor = yesterday
        }

        var streak = 0
        var day = anchor
        while completionDays.contains(day) {
            streak += 1
            guard let previous = calendar.date(byAdding: .day, value: -1, to: day) else { break }
            day = previous
        }
        return streak
    }
}
