import XCTest
@testable import ChoreStar

/// Family calendar feed (migration 033): the /api/calendar/feeds shapes.
final class CalendarFeedTests: XCTestCase {
    private let kid = UUID()

    private var list: CalendarFeed.ListResponse {
        let json = """
        {"premium":true,"children":[{"id":"\(kid.uuidString)","name":"Maya"}],
         "feeds":[
           {"childId":null,"https":"https://chorestar.app/api/calendar/abc.ics","webcal":"webcal://chorestar.app/api/calendar/abc.ics","google":"https://calendar.google.com/calendar/r?cid=x","createdAt":"2026-10-19T00:00:00Z","lastFetchedAt":null},
           {"childId":"\(kid.uuidString)","https":"https://chorestar.app/api/calendar/def.ics","webcal":"","google":null,"createdAt":null,"lastFetchedAt":null}]}
        """
        return try! JSONDecoder().decode(CalendarFeed.ListResponse.self, from: Data(json.utf8))
    }

    func testFindsTheFeedForEachScope() {
        XCTAssertEqual(CalendarFeed.feed(for: nil, in: list.feeds)?.https, "https://chorestar.app/api/calendar/abc.ics")
        XCTAssertEqual(CalendarFeed.feed(for: kid, in: list.feeds)?.https, "https://chorestar.app/api/calendar/def.ics")
        XCTAssertNil(CalendarFeed.feed(for: UUID(), in: list.feeds))
    }

    func testScopeParam() {
        XCTAssertEqual(CalendarFeed.scopeParam(nil), "family")
        XCTAssertEqual(CalendarFeed.scopeParam(kid), kid.uuidString.lowercased())
    }

    func testSubscribeURLPrefersWebcal() {
        XCTAssertEqual(CalendarFeed.subscribeURL(list.feeds[0])?.absoluteString, "webcal://chorestar.app/api/calendar/abc.ics")
        XCTAssertEqual(CalendarFeed.subscribeURL(list.feeds[1])?.absoluteString, "webcal://chorestar.app/api/calendar/def.ics", "rewrites https when webcal is missing")
    }

    func testPaywallSource() {
        XCTAssertEqual(CalendarFeed.paywallSource, "gate_calendar")
    }
}
