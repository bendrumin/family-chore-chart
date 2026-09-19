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
