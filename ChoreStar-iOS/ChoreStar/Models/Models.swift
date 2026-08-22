import Foundation

struct Child: Codable, Identifiable {
    let id: UUID
    let name: String
    let age: Int
    let avatarColor: String
    let avatarUrl: String?
    let avatarFile: String?
    /// Object path in the private child-avatars bucket. Resolved to a short-lived
    /// signed URL for display; never stores the URL itself, since those expire.
    let avatarPhotoPath: String?
    let userId: UUID
    let createdAt: Date
    let updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case age
        case avatarColor = "avatar_color"
        case avatarUrl = "avatar_url"
        case avatarFile = "avatar_file"
        case avatarPhotoPath = "avatar_photo_path"
        case userId = "user_id"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }

    var initials: String {
        let names = name.components(separatedBy: " ")
        return names.compactMap { $0.first?.uppercased() }.prefix(2).joined()
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
    let sortOrder: Int
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
        case sortOrder = "sort_order"
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

/// A co-parent who joined this family via a join code.
struct FamilyMemberInfo: Identifiable {
    let id: UUID
    let userId: UUID
    let joinedAt: Date?
}

/// Standalone kid-mode session (kid's own device, no parent login).
/// Mirrors the web app's `kidMode` localStorage entry.
struct KidModeSession: Codable {
    let childId: UUID
    let childName: String
    let avatarColor: String?
    let avatarUrl: String?
    let avatarFile: String?
    /// Signed URL for an uploaded photo, minted server-side at PIN verify.
    /// Expires — refreshed by re-verifying, not persisted as a permanent avatar.
    let avatarSignedUrl: String?
    let kidToken: String
    let familyCode: String
    let expiresAt: Date

    /// Minimal Child for kid-mode UI (age/userId aren't known without a parent session).
    var asChild: Child {
        Child(
            id: childId,
            name: childName,
            age: 0,
            avatarColor: avatarColor ?? "blue",
            // A server-minted signed URL renders exactly like a preset image URL,
            // so it slots into avatarUrl and needs no client-side signing. That is
            // the whole point of minting it server-side: the kid never touches
            // Storage, and avatarPhotoPath stays nil because a kid could not sign
            // a path even if it had one.
            avatarUrl: avatarSignedUrl ?? avatarUrl,
            avatarFile: avatarFile,
            avatarPhotoPath: nil,
            userId: UUID(),
            createdAt: Date(),
            updatedAt: Date()
        )
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

// Database row structures for Supabase queries
struct ChildRow: Codable {
    let id: UUID
    let name: String
    let age: Int?
    let avatar_color: String?
    let avatar_url: String?
    let avatar_file: String?
    let avatar_photo_path: String?
    let user_id: UUID
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
    let sort_order: Int?
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

/**
 The slice of family_settings.custom_theme iOS reads.

 custom_theme is a JSONB column — an OBJECT over the wire — but this model
 declared it `String?`, so for every family that had ever touched web themes the
 whole FamilySettings decode THREW and iOS silently ran on defaults: $ instead
 of their currency, flat-rate assumptions, default reward. The web app writes
 keys iOS doesn't care about (whatsNewSeenVersion etc.); unknown keys are
 ignored on decode, and writes go through a read-merge-write so they survive.
 */
struct CustomThemePayload: Codable {
    var accentColor: String?
    var seasonalTheme: String?
    var autoSeasonal: Bool?
}

struct FamilySettings: Codable {
    let id: UUID
    let userId: UUID
    let dailyRewardCents: Int
    let weeklyBonusCents: Int
    let timezone: String
    let rewardMode: String?
    let currencyCode: String?
    let locale: String?
    let dateFormat: String?
    let language: String?
    let customTheme: CustomThemePayload?
    let weeklyBonusLabel: String?
    /// APNs activity alerts (all-chores-done / routine-complete). Default on.
    let activityPushEnabled: Bool?
    
    var isPerChoreMode: Bool { rewardMode == "per_chore" }
    /// nil (pre-migration row) means enabled.
    var activityPushOn: Bool { activityPushEnabled != false }
    var currencySymbol: String {
        switch currencyCode?.uppercased() {
        case "GBP": return "£"
        case "EUR": return "€"
        case "JPY", "CNY": return "¥"
        case "INR": return "₹"
        case "KRW": return "₩"
        case "CHF": return "Fr"
        case "BRL": return "R$"
        case "CAD", "AUD", "MXN", "USD", .none: return "$"
        default: return "$"
        }
    }
    /// Minor-unit decimals for formatting (JPY/KRW have none).
    var currencyDecimals: Int {
        switch currencyCode?.uppercased() {
        case "JPY", "KRW": return 0
        default: return 2
        }
    }
    
    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case dailyRewardCents = "daily_reward_cents"
        case weeklyBonusCents = "weekly_bonus_cents"
        case timezone
        case rewardMode = "reward_mode"
        case currencyCode = "currency_code"
        case locale
        case dateFormat = "date_format"
        case language
        case customTheme = "custom_theme"
        case weeklyBonusLabel = "weekly_bonus_label"
        case activityPushEnabled = "activity_push_enabled"
    }
}
