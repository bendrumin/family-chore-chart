import Foundation

struct Child: Codable, Identifiable {
    let id: UUID
    let name: String
    let age: Int
    let avatarColor: String
    let avatarUrl: String?
    let avatarFile: String?
    let userId: UUID
    let childPin: String?
    let childAccessEnabled: Bool
    let createdAt: Date
    let updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case age
        case avatarColor = "avatar_color"
        case avatarUrl = "avatar_url"
        case avatarFile = "avatar_file"
        case userId = "user_id"
        case childPin = "child_pin"
        case childAccessEnabled = "child_access_enabled"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }

    var initials: String {
        let names = name.components(separatedBy: " ")
        return names.compactMap { $0.first?.uppercased() }.prefix(2).joined()
    }

    var hasChildAccess: Bool {
        return childAccessEnabled && childPin != nil && !childPin!.isEmpty
    }
}

struct Chore: Codable, Identifiable {
    let id: UUID
    let name: String
    let childId: UUID
    let reward: Double
    let description: String?
    let category: String?
    let icon: String?
    let color: String?
    let notes: String?
    let createdAt: Date
    let updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case childId = "child_id"
        case reward = "reward_cents"
        case description
        case category
        case icon
        case color
        case notes
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

struct ChoreCompletion: Codable, Identifiable {
    let id: UUID
    let choreId: UUID
    let childId: UUID
    let completedAt: Date
    let rewardEarned: Double

    enum CodingKeys: String, CodingKey {
        case id
        case choreId = "chore_id"
        case childId = "child_id"
        case completedAt = "completed_at"
        case rewardEarned = "reward_earned"
    }
}

struct ChildSession: Codable {
    let id: UUID
    let childId: UUID
    let sessionToken: String
    let expiresAt: Date
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case childId = "child_id"
        case sessionToken = "session_token"
        case expiresAt = "expires_at"
        case createdAt = "created_at"
    }
}

struct Achievement: Codable, Identifiable {
    let id: UUID
    let childId: UUID
    let badgeType: String
    let badgeName: String
    let badgeDescription: String
    let badgeIcon: String
    let earnedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case childId = "child_id"
        case badgeType = "badge_type"
        case badgeName = "badge_name"
        case badgeDescription = "badge_description"
        case badgeIcon = "badge_icon"
        case earnedAt = "earned_at"
    }
}

// Badge types matching web app
enum BadgeType: String {
    case firstChore = "first_chore"
    case perfectWeek = "perfect_week"
    case dedicated = "dedicated"
    case earlyBird = "early_bird"
    case nightOwl = "night_owl"
    case weekendWarrior = "weekend_warrior"
    
    var name: String {
        switch self {
        case .firstChore: return "First Step"
        case .perfectWeek: return "Perfect Week"
        case .dedicated: return "Dedicated Helper"
        case .earlyBird: return "Early Bird"
        case .nightOwl: return "Night Owl"
        case .weekendWarrior: return "Weekend Warrior"
        }
    }
    
    var description: String {
        switch self {
        case .firstChore: return "Completed your first chore!"
        case .perfectWeek: return "Completed all chores for the entire week!"
        case .dedicated: return "Completed 10 chores total!"
        case .earlyBird: return "Completed chores before 9 AM!"
        case .nightOwl: return "Completed chores after 8 PM!"
        case .weekendWarrior: return "Completed all weekend chores!"
        }
    }
    
    var icon: String {
        switch self {
        case .firstChore: return "🎯"
        case .perfectWeek: return "🌟"
        case .dedicated: return "💪"
        case .earlyBird: return "🌅"
        case .nightOwl: return "🌙"
        case .weekendWarrior: return "⚔️"
        }
    }
}

// Database row structures for Supabase queries
struct ChildRow: Codable {
    let id: UUID
    let name: String
    let age: Int?
    let avatar_color: String?
    let avatar_url: String?
    let avatar_file: String?
    let user_id: UUID
    let child_pin: String?
    let child_access_enabled: Bool?
    let created_at: String
    let updated_at: String
}

struct ChoreRow: Codable {
    let id: UUID
    let name: String
    let child_id: UUID
    let reward_cents: Int?
    let description: String?
    let category: String?
    let icon: String?
    let color: String?
    let notes: String?
    let created_at: String
    let updated_at: String
}

struct ChoreCompletionRow: Codable {
    let id: UUID
    let chore_id: UUID
    let day_of_week: Int
    let week_start: String
    let completed_at: String?
}

struct AchievementBadgeRow: Codable {
    let id: UUID
    let child_id: UUID
    let badge_type: String
    let badge_name: String
    let badge_description: String
    let badge_icon: String
    let earned_at: String
}
