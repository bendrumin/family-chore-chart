import Foundation

struct Routine: Codable, Identifiable {
    let id: UUID
    let childId: UUID
    let name: String
    let type: String
    let icon: String
    let color: String
    let rewardCents: Int
    let isActive: Bool
    let createdAt: Date
    let updatedAt: Date
    var steps: [RoutineStep]

    enum CodingKeys: String, CodingKey {
        case id
        case childId = "child_id"
        case name
        case type
        case icon
        case color
        case rewardCents = "reward_cents"
        case isActive = "is_active"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case steps
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        childId = try container.decode(UUID.self, forKey: .childId)
        name = try container.decode(String.self, forKey: .name)
        type = try container.decode(String.self, forKey: .type)
        icon = try container.decodeIfPresent(String.self, forKey: .icon) ?? "list.bullet"
        color = try container.decodeIfPresent(String.self, forKey: .color) ?? "#6366f1"
        rewardCents = try container.decodeIfPresent(Int.self, forKey: .rewardCents) ?? 7
        isActive = try container.decodeIfPresent(Bool.self, forKey: .isActive) ?? true
        createdAt = try container.decode(Date.self, forKey: .createdAt)
        updatedAt = try container.decode(Date.self, forKey: .updatedAt)
        steps = (try? container.decodeIfPresent([RoutineStep].self, forKey: .steps)) ?? []
    }

    init(id: UUID, childId: UUID, name: String, type: String, icon: String, color: String,
         rewardCents: Int, isActive: Bool, createdAt: Date, updatedAt: Date, steps: [RoutineStep]) {
        self.id = id
        self.childId = childId
        self.name = name
        self.type = type
        self.icon = icon
        self.color = color
        self.rewardCents = rewardCents
        self.isActive = isActive
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.steps = steps
    }

    var typeDisplayName: String {
        switch type {
        case "morning": return "Morning"
        case "bedtime": return "Bedtime"
        case "afterschool": return "After School"
        case "custom": return "Custom"
        default: return type.capitalized
        }
    }

    var typeEmoji: String {
        switch type {
        case "morning": return "🌅"
        case "bedtime": return "🌙"
        case "afterschool": return "🎒"
        case "custom": return "⭐"
        default: return "📋"
        }
    }
}

struct RoutineStep: Codable, Identifiable {
    let id: UUID
    let routineId: UUID
    let title: String
    let description: String?
    let icon: String
    let orderIndex: Int
    let durationSeconds: Int?
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case routineId = "routine_id"
        case title
        case description
        case icon
        case orderIndex = "order_index"
        case durationSeconds = "duration_seconds"
        case createdAt = "created_at"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        routineId = try container.decode(UUID.self, forKey: .routineId)
        title = try container.decode(String.self, forKey: .title)
        description = try container.decodeIfPresent(String.self, forKey: .description)
        icon = try container.decodeIfPresent(String.self, forKey: .icon) ?? "circle"
        orderIndex = try container.decodeIfPresent(Int.self, forKey: .orderIndex) ?? 0
        durationSeconds = try container.decodeIfPresent(Int.self, forKey: .durationSeconds)
        createdAt = try container.decode(Date.self, forKey: .createdAt)
    }

    init(id: UUID, routineId: UUID, title: String, description: String?, icon: String,
         orderIndex: Int, durationSeconds: Int?, createdAt: Date) {
        self.id = id
        self.routineId = routineId
        self.title = title
        self.description = description
        self.icon = icon
        self.orderIndex = orderIndex
        self.durationSeconds = durationSeconds
        self.createdAt = createdAt
    }
}

struct RoutineCompletion: Codable, Identifiable {
    let id: UUID
    let routineId: UUID
    let childId: UUID
    let completedAt: Date
    let durationSeconds: Int
    let stepsCompleted: Int
    let stepsTotal: Int
    let pointsEarned: Int
    let date: String

    enum CodingKeys: String, CodingKey {
        case id
        case routineId = "routine_id"
        case childId = "child_id"
        case completedAt = "completed_at"
        case durationSeconds = "duration_seconds"
        case stepsCompleted = "steps_completed"
        case stepsTotal = "steps_total"
        case pointsEarned = "points_earned"
        case date
    }
}

// Database row structures for Supabase queries
struct RoutineRow: Codable {
    let id: UUID
    let child_id: UUID
    let name: String
    let type: String
    let icon: String?
    let color: String?
    let reward_cents: Int?
    let is_active: Bool?
    let created_at: String
    let updated_at: String
}

struct RoutineStepRow: Codable {
    let id: UUID
    let routine_id: UUID
    let title: String
    let description: String?
    let icon: String?
    let order_index: Int?
    let duration_seconds: Int?
    let created_at: String
}

struct RoutineCompletionRow: Codable {
    let id: UUID
    let routine_id: UUID
    let child_id: UUID
    let completed_at: String?
    let duration_seconds: Int?
    let steps_completed: Int?
    let steps_total: Int?
    let points_earned: Int?
    let date: String?
}

enum RoutineType: String, CaseIterable {
    case morning
    case bedtime
    case afterschool
    case custom

    var displayName: String {
        switch self {
        case .morning: return "Morning"
        case .bedtime: return "Bedtime"
        case .afterschool: return "After School"
        case .custom: return "Custom"
        }
    }

    var emoji: String {
        switch self {
        case .morning: return "🌅"
        case .bedtime: return "🌙"
        case .afterschool: return "🎒"
        case .custom: return "⭐"
        }
    }

    var systemImage: String {
        switch self {
        case .morning: return "sunrise.fill"
        case .bedtime: return "moon.stars.fill"
        case .afterschool: return "backpack.fill"
        case .custom: return "star.fill"
        }
    }

    var defaultColor: String {
        switch self {
        case .morning: return "#f59e0b"
        case .bedtime: return "#8b5cf6"
        case .afterschool: return "#10b981"
        case .custom: return "#6366f1"
        }
    }
}

struct RoutineTemplate {
    let name: String
    let type: RoutineType
    let icon: String
    let steps: [(title: String, icon: String, durationSeconds: Int?)]

    static let morning = RoutineTemplate(
        name: "Morning Routine",
        type: .morning,
        icon: "sunrise.fill",
        steps: [
            ("Wake Up & Stretch", "figure.walk", 60),
            ("Brush Teeth", "mouth.fill", 120),
            ("Get Dressed", "tshirt.fill", 180),
            ("Eat Breakfast", "fork.knife", 600),
            ("Pack Backpack", "backpack.fill", 120),
        ]
    )

    static let bedtime = RoutineTemplate(
        name: "Bedtime Routine",
        type: .bedtime,
        icon: "moon.stars.fill",
        steps: [
            ("Take a Bath/Shower", "shower.fill", 600),
            ("Brush Teeth", "mouth.fill", 120),
            ("Put on Pajamas", "tshirt.fill", 120),
            ("Read a Book", "book.fill", 600),
            ("Lights Out", "light.max", nil),
        ]
    )

    static let afterSchool = RoutineTemplate(
        name: "After School Routine",
        type: .afterschool,
        icon: "backpack.fill",
        steps: [
            ("Unpack Backpack", "backpack.fill", 120),
            ("Have a Snack", "carrot.fill", 300),
            ("Do Homework", "book.fill", 1800),
            ("Free Time", "gamecontroller.fill", nil),
        ]
    )

    static let quickHygiene = RoutineTemplate(
        name: "Quick Hygiene",
        type: .custom,
        icon: "hands.sparkles.fill",
        steps: [
            ("Wash Hands", "hands.sparkles.fill", 30),
            ("Brush Teeth", "mouth.fill", 120),
            ("Comb Hair", "comb.fill", 60),
        ]
    )

    static let all: [RoutineTemplate] = [morning, bedtime, afterSchool, quickHygiene]
}

struct WeeklyStats {
    let totalCompletions: Int
    let totalEarnings: Double
    let completionRate: Double
    let perfectDays: Int
    let streak: Int
    let dailyStatus: [Bool]

    static let empty = WeeklyStats(
        totalCompletions: 0,
        totalEarnings: 0,
        completionRate: 0,
        perfectDays: 0,
        streak: 0,
        dailyStatus: Array(repeating: false, count: 7)
    )
}
