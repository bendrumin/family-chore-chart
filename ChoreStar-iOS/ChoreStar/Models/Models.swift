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
    /// Days the chore is due, 0 = Sunday .. 6 = Saturday (same convention as
    /// `chore_completions.day_of_week`). Defaults to every day, which is what
    /// every chore was before `chores.days_of_week` existed (migration 015).
    /// `var` with a default so the memberwise init keeps working for callers
    /// that predate the column.
    var daysOfWeek: [Int] = ChoreSchedule.everyDay
    /// Kids attach a photo when checking this off; the tick waits for review.
    /// Migration 016. Defaults false so older rows and callers keep working.
    var requiresPhoto: Bool = false
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
        case daysOfWeek = "days_of_week"
        case requiresPhoto = "requires_photo"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }

    /// Is this chore on today's list (for the given weekday index)?
    func isDue(on dayIndex: Int) -> Bool {
        ChoreSchedule.isDue(daysOfWeek, on: dayIndex)
    }

    var isDueToday: Bool {
        isDue(on: RewardMath.dayIndex(of: Date()))
    }

    var isEveryDay: Bool {
        ChoreSchedule.isEveryDay(daysOfWeek)
    }

    /// "Every day", "Weekdays", "Mon, Wed, Fri", ...
    var scheduleLabel: String {
        ChoreSchedule.label(for: daysOfWeek)
    }
}

extension Chore {
    /// Tolerant decoding: a row from before the migration, or from a server
    /// that has not started sending `days_of_week`, means every day.
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(UUID.self, forKey: .id)
        name = try c.decode(String.self, forKey: .name)
        childId = try c.decode(UUID.self, forKey: .childId)
        reward = try c.decode(Double.self, forKey: .reward)
        description = try c.decodeIfPresent(String.self, forKey: .description)
        category = try c.decodeIfPresent(String.self, forKey: .category)
        icon = try c.decodeIfPresent(String.self, forKey: .icon)
        color = try c.decodeIfPresent(String.self, forKey: .color)
        notes = try c.decodeIfPresent(String.self, forKey: .notes)
        sortOrder = try c.decodeIfPresent(Int.self, forKey: .sortOrder) ?? 0
        daysOfWeek = ChoreSchedule.normalized(try c.decodeIfPresent([Int].self, forKey: .daysOfWeek))
        requiresPhoto = try c.decodeIfPresent(Bool.self, forKey: .requiresPhoto) ?? false
        createdAt = try c.decode(Date.self, forKey: .createdAt)
        updatedAt = try c.decode(Date.self, forKey: .updatedAt)
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
    /// Optional so a database that has not run migration 015 still decodes.
    let days_of_week: [Int]?
    /// Migration 016; optional for the same reason.
    let requires_photo: Bool?
    let created_at: String
    let updated_at: String
}

struct ChoreCompletionRow: Codable {
    let id: UUID
    let chore_id: UUID
    let day_of_week: Int
    let week_start: String
    let completed_at: String?
    /// 'pending' waits for a parent; 'approved' (or nil, pre-migration) counts.
    /// Migration 016. nil on encode is omitted, so the column default applies.
    var status: String? = nil
    var proof_path: String? = nil

    var isPending: Bool { status == "pending" }
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

/// One catalog for the Rewards picker, symbols, and decimals. Keep in sync
/// with `chorestar-nextjs/lib/constants/currencies.ts`. Storage is always
/// integer cents (hundredths), so 3-decimal dinars (KWD/BHD/OMR) stay out.
struct FamilyCurrency: Identifiable, Equatable {
    let code: String
    let symbol: String
    let flag: String
    let name: String
    /// Display decimals. JPY/KRW/CLP have none. Storage is still cents.
    let decimals: Int

    var id: String { code }
    var pickerLabel: String { "\(flag) \(name) (\(symbol))" }

    static let all: [FamilyCurrency] = [
        FamilyCurrency(code: "USD", symbol: "$", flag: "🇺🇸", name: "US Dollar", decimals: 2),
        FamilyCurrency(code: "EUR", symbol: "€", flag: "🇪🇺", name: "Euro", decimals: 2),
        FamilyCurrency(code: "GBP", symbol: "£", flag: "🇬🇧", name: "British Pound", decimals: 2),
        FamilyCurrency(code: "CAD", symbol: "$", flag: "🇨🇦", name: "Canadian Dollar", decimals: 2),
        FamilyCurrency(code: "AUD", symbol: "$", flag: "🇦🇺", name: "Australian Dollar", decimals: 2),
        FamilyCurrency(code: "NZD", symbol: "$", flag: "🇳🇿", name: "New Zealand Dollar", decimals: 2),
        FamilyCurrency(code: "SAR", symbol: "ر.س", flag: "🇸🇦", name: "Saudi Riyal", decimals: 2),
        FamilyCurrency(code: "AED", symbol: "د.إ", flag: "🇦🇪", name: "UAE Dirham", decimals: 2),
        FamilyCurrency(code: "QAR", symbol: "ر.ق", flag: "🇶🇦", name: "Qatari Riyal", decimals: 2),
        FamilyCurrency(code: "EGP", symbol: "E£", flag: "🇪🇬", name: "Egyptian Pound", decimals: 2),
        FamilyCurrency(code: "ILS", symbol: "₪", flag: "🇮🇱", name: "Israeli Shekel", decimals: 2),
        FamilyCurrency(code: "TRY", symbol: "₺", flag: "🇹🇷", name: "Turkish Lira", decimals: 2),
        FamilyCurrency(code: "JPY", symbol: "¥", flag: "🇯🇵", name: "Japanese Yen", decimals: 0),
        FamilyCurrency(code: "CNY", symbol: "¥", flag: "🇨🇳", name: "Chinese Yuan", decimals: 2),
        FamilyCurrency(code: "KRW", symbol: "₩", flag: "🇰🇷", name: "Korean Won", decimals: 0),
        FamilyCurrency(code: "INR", symbol: "₹", flag: "🇮🇳", name: "Indian Rupee", decimals: 2),
        FamilyCurrency(code: "SGD", symbol: "$", flag: "🇸🇬", name: "Singapore Dollar", decimals: 2),
        FamilyCurrency(code: "HKD", symbol: "$", flag: "🇭🇰", name: "Hong Kong Dollar", decimals: 2),
        FamilyCurrency(code: "TWD", symbol: "NT$", flag: "🇹🇼", name: "Taiwan Dollar", decimals: 2),
        FamilyCurrency(code: "THB", symbol: "฿", flag: "🇹🇭", name: "Thai Baht", decimals: 2),
        FamilyCurrency(code: "PHP", symbol: "₱", flag: "🇵🇭", name: "Philippine Peso", decimals: 2),
        FamilyCurrency(code: "MYR", symbol: "RM", flag: "🇲🇾", name: "Malaysian Ringgit", decimals: 2),
        FamilyCurrency(code: "IDR", symbol: "Rp", flag: "🇮🇩", name: "Indonesian Rupiah", decimals: 2),
        FamilyCurrency(code: "CHF", symbol: "Fr", flag: "🇨🇭", name: "Swiss Franc", decimals: 2),
        FamilyCurrency(code: "SEK", symbol: "kr", flag: "🇸🇪", name: "Swedish Krona", decimals: 2),
        FamilyCurrency(code: "NOK", symbol: "kr", flag: "🇳🇴", name: "Norwegian Krone", decimals: 2),
        FamilyCurrency(code: "DKK", symbol: "kr", flag: "🇩🇰", name: "Danish Krone", decimals: 2),
        FamilyCurrency(code: "PLN", symbol: "zł", flag: "🇵🇱", name: "Polish Zloty", decimals: 2),
        FamilyCurrency(code: "CZK", symbol: "Kč", flag: "🇨🇿", name: "Czech Koruna", decimals: 2),
        FamilyCurrency(code: "MXN", symbol: "$", flag: "🇲🇽", name: "Mexican Peso", decimals: 2),
        FamilyCurrency(code: "BRL", symbol: "R$", flag: "🇧🇷", name: "Brazilian Real", decimals: 2),
        FamilyCurrency(code: "COP", symbol: "$", flag: "🇨🇴", name: "Colombian Peso", decimals: 2),
        FamilyCurrency(code: "ARS", symbol: "$", flag: "🇦🇷", name: "Argentine Peso", decimals: 2),
        FamilyCurrency(code: "PEN", symbol: "S/", flag: "🇵🇪", name: "Peruvian Sol", decimals: 2),
        FamilyCurrency(code: "CLP", symbol: "$", flag: "🇨🇱", name: "Chilean Peso", decimals: 0),
        FamilyCurrency(code: "ZAR", symbol: "R", flag: "🇿🇦", name: "South African Rand", decimals: 2),
    ]

    /// Known code, or a system-derived fallback. Never silently becomes USD/$
    /// for a real but unlisted code (that is how a SAR family saw dollar signs).
    static func find(_ code: String?) -> FamilyCurrency {
        let normalized = (code ?? "USD").uppercased()
        if let match = all.first(where: { $0.code == normalized }) {
            return match
        }
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = normalized
        let name = Locale.current.localizedString(forCurrencyCode: normalized) ?? normalized
        return FamilyCurrency(
            code: normalized,
            symbol: formatter.currencySymbol ?? normalized,
            flag: "💱",
            name: name,
            decimals: 2
        )
    }
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
    /// Kid ticks wait for a parent before they count. Migration 016; nil = off.
    let requireApproval: Bool?
    
    var isPerChoreMode: Bool { rewardMode == "per_chore" }
    /// nil (pre-migration row) means enabled.
    var activityPushOn: Bool { activityPushEnabled != false }
    var currencySymbol: String { FamilyCurrency.find(currencyCode).symbol }
    /// Minor-unit decimals for formatting (JPY/KRW/CLP have none).
    var currencyDecimals: Int { FamilyCurrency.find(currencyCode).decimals }
    
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
        case requireApproval = "require_approval"
    }
}
