import XCTest
@testable import ChoreStar

/// The grandfathered feature gate must match the web (lib/utils/subscription.ts).
final class EntitlementsTests: XCTestCase {
    private let before = ISO8601DateFormatter().date(from: "2026-09-10T13:35:00Z")!
    private let cutoff = ISO8601DateFormatter().date(from: "2026-09-19T00:00:00Z")!
    private let after = ISO8601DateFormatter().date(from: "2026-09-19T18:00:00Z")!

    func testAccountsBeforeCutoffKeepEverythingOnFree() {
        XCTAssertTrue(Entitlements.isGrandfathered(createdAt: before))
        XCTAssertTrue(Entitlements.canUse(.sharing, isPremium: false, createdAt: before))
        XCTAssertTrue(Entitlements.canUse(.themes, isPremium: false, createdAt: before))
    }

    func testAccountsAtOrAfterCutoffNeedPremium() {
        XCTAssertFalse(Entitlements.isGrandfathered(createdAt: cutoff))
        XCTAssertFalse(Entitlements.canUse(.export, isPremium: false, createdAt: after))
        XCTAssertFalse(Entitlements.canUse(.analytics, isPremium: false, createdAt: after))
    }

    func testForegroundRefreshIsThrottledToOncePerMinute() {
        let t = after
        XCTAssertTrue(Entitlements.shouldRefreshOnForeground(lastRefresh: nil, now: t), "first return to the app reloads")
        XCTAssertFalse(Entitlements.shouldRefreshOnForeground(lastRefresh: t, now: t.addingTimeInterval(59)))
        XCTAssertTrue(Entitlements.shouldRefreshOnForeground(lastRefresh: t, now: t.addingTimeInterval(60)))
        XCTAssertTrue(Entitlements.shouldRefreshOnForeground(lastRefresh: t, now: t.addingTimeInterval(3 * 86_400)), "a trial that lapsed while the app sat in memory")
    }

    func testLapsedFamilyKeepsPremiumThemeStoredButSeesTheFreeLook() {
        let nov = ISO8601DateFormatter().date(from: "2026-11-04T18:00:00Z")!
        XCTAssertEqual(ThemeManager.effectiveTheme(setting: "ocean", premiumAllowed: true, now: nov), .ocean)
        XCTAssertEqual(ThemeManager.effectiveTheme(setting: "ocean", premiumAllowed: false, now: nov), SeasonalTheme.current(date: nov), "falls back to auto")
        XCTAssertNotEqual(ThemeManager.effectiveTheme(setting: "lavender", premiumAllowed: false, now: nov), .lavender)
    }

    func testFreeThemesSurviveALapse() {
        let nov = ISO8601DateFormatter().date(from: "2026-11-04T18:00:00Z")!
        XCTAssertEqual(ThemeManager.effectiveTheme(setting: "christmas", premiumAllowed: false, now: nov), .christmas)
        XCTAssertNil(ThemeManager.effectiveTheme(setting: "none", premiumAllowed: false, now: nov))
    }

    /// The children query decodes ChildRow; paused_by_plan was missing from
    /// it, so no kid ever showed as paused on iOS.
    func testChildRowDecodesPausedByPlan() throws {
        let json = """
        [{"id":"4f1c2a3b-0000-4000-8000-000000000001","name":"Kid 4","age":7,"avatar_color":"blue",
          "avatar_url":null,"avatar_file":null,"avatar_photo_path":null,
          "user_id":"4f1c2a3b-0000-4000-8000-0000000000aa","created_at":"2026-11-04T18:00:00+00:00",
          "updated_at":"2026-11-04T18:00:00+00:00","paused_by_plan":true},
         {"id":"4f1c2a3b-0000-4000-8000-000000000002","name":"Old row","age":5,"avatar_color":null,
          "avatar_url":null,"avatar_file":null,"avatar_photo_path":null,
          "user_id":"4f1c2a3b-0000-4000-8000-0000000000aa","created_at":"2026-08-01T00:00:00+00:00",
          "updated_at":"2026-08-01T00:00:00+00:00"}]
        """
        let rows = try JSONDecoder().decode([ChildRow].self, from: Data(json.utf8))
        XCTAssertEqual(rows[0].paused_by_plan, true)
        XCTAssertNil(rows[1].paused_by_plan, "a row from before migration 038 still decodes")
        XCTAssertEqual(Child(row: rows[0]).pausedByPlan, true, "the flag must survive into Child")
        XCTAssertNotEqual(Child(row: rows[1]).pausedByPlan, true)
    }

    func testPremiumAlwaysPasses() {
        XCTAssertTrue(Entitlements.canUse(.sharing, isPremium: true, createdAt: after))
        XCTAssertTrue(Entitlements.canUse(.themes, isPremium: true, createdAt: nil))
    }

    func testParsesPostgresMicrosecondTimestamps() {
        // Exactly what PostgREST returns for profiles.created_at.
        let d = Entitlements.parseTimestamp("2026-09-19T11:03:22.685451+00:00")
        XCTAssertNotNil(d, "six fractional digits must parse, or every family reads as new")
        XCTAssertEqual(d.map { Int($0.timeIntervalSince1970) }, 1_789_815_802)
        XCTAssertNotNil(Entitlements.parseTimestamp("2025-07-22T09:00:00+00:00"), "no fraction")
        XCTAssertNotNil(Entitlements.parseTimestamp("2026-09-10T13:35:12.5Z"), "one digit, Z")
        XCTAssertNil(Entitlements.parseTimestamp("not a date"))
    }

    func testGrandfatherDecisionOnRealWireFormat() {
        let old = Entitlements.parseTimestamp("2026-09-10T13:35:12.123456+00:00")
        let new = Entitlements.parseTimestamp("2026-09-19T11:03:22.685451+00:00")
        XCTAssertTrue(Entitlements.isGrandfathered(createdAt: old))
        XCTAssertFalse(Entitlements.isGrandfathered(createdAt: new))
    }

    func testMissingCreatedAtFailsClosedForFree() {
        XCTAssertFalse(Entitlements.isGrandfathered(createdAt: nil))
        XCTAssertFalse(Entitlements.canUse(.export, isPremium: false, createdAt: nil))
    }
}
