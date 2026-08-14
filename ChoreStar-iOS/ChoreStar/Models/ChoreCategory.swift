import Foundation

/// Mirror of the web app's category system (`lib/constants/categories.ts`).
/// The `chores.category` column is the Postgres enum `activity_category`, so
/// the database rejects any value outside this list (22P02 "invalid input
/// value for enum") — the raw values here must match the enum exactly.
enum ChoreCategory: String, CaseIterable, Identifiable {
    case householdChores = "household_chores"
    case learningEducation = "learning_education"
    case physicalActivity = "physical_activity"
    case creativeTime = "creative_time"
    case gamesPlay = "games_play"
    case reading = "reading"
    case familyTime = "family_time"
    case custom = "custom"

    var id: String { rawValue }

    var label: String {
        switch self {
        case .householdChores: return "Household Chores"
        case .learningEducation: return "Learning & Education"
        case .physicalActivity: return "Physical Activity"
        case .creativeTime: return "Creative Time"
        case .gamesPlay: return "Games & Play"
        case .reading: return "Reading"
        case .familyTime: return "Family Time"
        case .custom: return "Custom"
        }
    }

    var emoji: String {
        switch self {
        case .householdChores: return "🏠"
        case .learningEducation: return "📚"
        case .physicalActivity: return "🏃"
        case .creativeTime: return "🎨"
        case .gamesPlay: return "🎮"
        case .reading: return "📖"
        case .familyTime: return "❤️"
        case .custom: return "⚙️"
        }
    }

    /// Display label for a stored value. Pre-enum strings ("Bedroom",
    /// "General", …) can still appear in locally cached rows; anything
    /// unrecognized reads as Household Chores, matching the server migration.
    static func label(for raw: String?) -> String {
        guard let raw, let category = ChoreCategory(rawValue: raw) else {
            return ChoreCategory.householdChores.label
        }
        return category.label
    }

    /// Coerce any stored value onto a valid enum member, defaulting legacy
    /// and unknown values the same way the server migration did.
    static func normalize(_ raw: String?) -> ChoreCategory {
        guard let raw, let category = ChoreCategory(rawValue: raw) else {
            return .householdChores
        }
        return category
    }
}

// MARK: - Icon catalog

/// The chore icon catalog, mirroring the web picker
/// (`components/ui/icon-picker.tsx`) exactly — one canonical list so a
/// chore created on either platform offers the same choices on the other.
/// Every entry has a bundled OpenMoji line-art asset (Assets.xcassets/
/// ChoreIcons), so all of them render in the same visual language.
enum ChoreIconCatalog {
    static let all: [String] = [
        "🧹", "🧺", "🧼", "🧽", "🧴", "🗑️", "💧", "🚿", "🛏️", "🪟",
        "🚪", "🪑", "🛋️", "🍽️", "🥄", "🔪", "🍳", "🥘", "🍲", "🫙",
        "🧊", "🥤", "🧃", "🍵", "📚", "📖", "📝", "✏️", "✒️", "🖊️",
        "📕", "📗", "📘", "📙", "📔", "📓", "📒", "🗂️", "📂", "📁",
        "🔬", "🧪", "🧬", "🔭", "🌡️", "💡", "🔦", "🕯️", "⚽", "🏀",
        "🏈", "⚾", "🥎", "🎾", "🏐", "🏉", "🥏", "🎱", "🏓", "🏸",
        "🏒", "🥊", "⛳", "⛸️", "🛹", "🛼", "🤸", "🧘", "🚴", "🏃",
        "🤾", "🏋️", "🎨", "🖌️", "🖍️", "🎭", "🎪", "🎬", "🎤", "🎧",
        "🎼", "🎹", "🎸", "🎺", "🎷", "🥁", "🎻", "🪕", "📷", "📹",
        "🎮", "🕹️", "🧩", "🎲", "🌱", "🌿", "🍀", "🌻", "🌺", "🌸",
        "🌼", "🌷", "🦋", "🐝", "🐞", "🦗", "🦟", "🐛", "🐌", "🐚",
        "🐕", "🐈", "🐁", "🐀", "🐹", "🐰", "🦊", "🐻", "🥗", "🥙",
        "🌮", "🌯", "🥪", "🍕", "🍔", "🍟", "🥐", "🥖", "🥨", "🥞",
        "🧀", "🍖", "🍗", "🥩", "🥓", "🥚", "🍞", "🥜", "🌰", "🥝",
        "🍇", "⭐", "🌟", "✨", "💫", "🔥", "💪", "👍", "🎯", "🏆",
        "🥇", "🥈", "🥉", "🎖️", "🏅", "🎗️", "🎀",
    ]
}
