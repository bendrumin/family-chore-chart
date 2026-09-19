import Foundation

/// Which Premium-advertised features a family may use. Mirrors the web rule
/// in lib/utils/subscription.ts exactly, so a family gets one answer on every
/// device: premium always passes, and so does any account created before the
/// 2026-09-19 cutoff (those features were free for everyone until then, and
/// nobody loses what they already had). See docs/PREMIUM.md.
enum GatedFeature {
    case themes, sharing, export, analytics
}

struct Entitlements {
    static let gateCutoff: Date = {
        var c = DateComponents()
        c.year = 2026; c.month = 9; c.day = 19
        c.timeZone = TimeZone(identifier: "UTC")
        return Calendar(identifier: .gregorian).date(from: c)!
    }()

    static func isGrandfathered(createdAt: Date?) -> Bool {
        guard let createdAt else { return false }
        return createdAt < gateCutoff
    }

    static func canUse(_ feature: GatedFeature, isPremium: Bool, createdAt: Date?) -> Bool {
        isPremium || isGrandfathered(createdAt: createdAt)
    }

    /// Parses a Postgres `timestamptz` as PostgREST sends it, e.g.
    /// "2026-09-19T11:03:22.685451+00:00". ISO8601DateFormatter accepts only
    /// three fractional digits and Postgres sends six, so the fraction is
    /// trimmed to milliseconds first. A parse failure here would silently
    /// strip a grandfathered family of its features, hence the tests.
    static func parseTimestamp(_ raw: String) -> Date? {
        let trimmed = raw.replacingOccurrences(
            of: #"(\.\d{3})\d+"#, with: "$1", options: .regularExpression)
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let d = f.date(from: trimmed) { return d }
        f.formatOptions = [.withInternetDateTime]
        return f.date(from: trimmed)
    }
}
