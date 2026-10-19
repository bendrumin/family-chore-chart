import Foundation

/// Family calendar feed (Premium, migration 033): a secret iCalendar URL per
/// scope (whole family or one kid), managed through /api/calendar/feeds.
enum CalendarFeed {
    static let paywallSource = "gate_calendar"

    struct Feed: Decodable, Equatable {
        /// nil = the whole family.
        let childId: UUID?
        let https: String
        let webcal: String
        let google: String?
        let createdAt: String?
        let lastFetchedAt: String?
    }

    struct Child: Decodable, Identifiable, Equatable {
        let id: UUID
        let name: String
    }

    /// GET /api/calendar/feeds
    struct ListResponse: Decodable {
        let premium: Bool
        let children: [Child]
        let feeds: [Feed]
    }

    /// POST /api/calendar/feeds
    struct PostResponse: Decodable {
        let feed: Feed
        let regenerated: Bool?
    }

    /// The feed for a scope, if it is on.
    static func feed(for childId: UUID?, in feeds: [Feed]) -> Feed? {
        feeds.first { $0.childId == childId }
    }

    /// The DELETE query value: "family" or the kid's id.
    static func scopeParam(_ childId: UUID?) -> String {
        childId?.uuidString.lowercased() ?? "family"
    }

    /// The URL that opens Apple Calendar's subscribe sheet. The server already
    /// sends webcal://; fall back to rewriting https:// when it doesn't.
    static func subscribeURL(_ feed: Feed) -> URL? {
        if feed.webcal.lowercased().hasPrefix("webcal://") { return URL(string: feed.webcal) }
        let rewritten = feed.https.replacingOccurrences(of: #"^https?://"#, with: "webcal://", options: [.regularExpression, .caseInsensitive])
        return URL(string: rewritten)
    }
}
