import XCTest
@testable import ChoreStar

/// Family challenges (migration 031): the Swift port must give the same
/// numbers as chorestar-nextjs/lib/challenges/progress.ts.
final class ChallengeProgressTests: XCTestCase {
    private let maya = UUID()
    private let leo = UUID()
    private let familyId = UUID()

    private func row(
        metric: String = "chores", mode: String = "team", target: Int = 5,
        choreFilter: String? = "any", routineType: String? = nil,
        startsOn: String = "2026-10-18", endsOn: String = "2026-10-24",
        status: String = "active", deliveredAt: String? = nil
    ) -> ChallengeProgress.Row {
        ChallengeProgress.Row(
            id: UUID(), user_id: familyId, title: "Pizza Night", emoji: "🍕", reward_text: "Pizza night",
            reward_cents: 0, metric: metric, mode: mode, target: target, chore_filter: choreFilter,
            routine_type: routineType, child_ids: [maya, leo], starts_on: startsOn, ends_on: endsOn,
            status: status, delivered_at: deliveredAt, created_at: "2026-10-18T09:00:00Z"
        )
    }

    // MARK: Dates

    func testDateHelpers() {
        XCTAssertEqual(ChallengeProgress.addDays("2026-10-31", 1), "2026-11-01")
        XCTAssertEqual(ChallengeProgress.addDays("2026-03-01", -1), "2026-02-28")
        XCTAssertEqual(ChallengeProgress.daysBetween("2026-10-18", "2026-10-24"), 6)
        XCTAssertTrue(ChallengeProgress.isIsoDate("2026-10-18"))
        XCTAssertFalse(ChallengeProgress.isIsoDate("2026-02-30"))
        XCTAssertFalse(ChallengeProgress.isIsoDate("10/18/2026"))
    }

    func testWeekWindowIsSundayToSaturday() {
        let w = ChallengeProgress.weekWindow("2026-10-21") // a Wednesday
        XCTAssertEqual(w.startsOn, "2026-10-18")
        XCTAssertEqual(w.endsOn, "2026-10-24")
        XCTAssertEqual(ChallengeProgress.weekWindow("2026-10-18").startsOn, "2026-10-18")
    }

    func testTodayInFamilyZone() {
        let instant = ISO8601DateFormatter().date(from: "2026-10-19T02:00:00Z")!
        XCTAssertEqual(ChallengeProgress.today(in: "America/Los_Angeles", now: instant), "2026-10-18")
        XCTAssertEqual(ChallengeProgress.today(in: "UTC", now: instant), "2026-10-19")
        XCTAssertEqual(ChallengeProgress.today(in: "Not/AZone", now: instant), "2026-10-19", "unknown zone is UTC")
    }

    func testDaysLeft() {
        XCTAssertEqual(ChallengeProgress.daysLeft(startsOn: "2026-10-18", endsOn: "2026-10-24", today: "2026-10-24"), 1)
        XCTAssertEqual(ChallengeProgress.daysLeft(startsOn: "2026-10-18", endsOn: "2026-10-24", today: "2026-10-18"), 7)
        XCTAssertEqual(ChallengeProgress.daysLeft(startsOn: "2026-10-18", endsOn: "2026-10-24", today: "2026-10-25"), 0)
        XCTAssertEqual(ChallengeProgress.daysLeft(startsOn: "2026-10-20", endsOn: "2026-10-24", today: "2026-10-18"), 5)
    }

    // MARK: Counting

    func testChoresCountApprovedTicksInsideTheWindowOncePerDay() {
        let dishes = UUID(), bed = UUID()
        let inputs = ChallengeProgress.Inputs(
            chores: [
                .init(id: dishes, child_id: maya, rotation_mode: nil),
                .init(id: bed, child_id: leo, rotation_mode: nil),
            ],
            choreCompletions: [
                .init(chore_id: dishes, week_start: "2026-10-18", day_of_week: 0, status: nil),
                .init(chore_id: dishes, week_start: "2026-10-18", day_of_week: 0, status: "approved"), // duplicate day
                .init(chore_id: dishes, week_start: "2026-10-18", day_of_week: 1, status: "pending"), // not approved
                .init(chore_id: bed, week_start: "2026-10-18", day_of_week: 2, status: "approved"),
                .init(chore_id: bed, week_start: "2026-10-11", day_of_week: 6, status: nil), // before the window
            ]
        )
        let counts = ChallengeProgress.countContributions(row(), inputs)
        XCTAssertEqual(counts[maya], 1)
        XCTAssertEqual(counts[leo], 1)
    }

    func testBonusFilterCountsOnlyGrabChores() {
        let bonus = UUID(), normal = UUID()
        let inputs = ChallengeProgress.Inputs(
            chores: [.init(id: bonus, child_id: maya, rotation_mode: "grab"), .init(id: normal, child_id: maya, rotation_mode: nil)],
            choreCompletions: [
                .init(chore_id: bonus, week_start: "2026-10-18", day_of_week: 1, status: nil),
                .init(chore_id: normal, week_start: "2026-10-18", day_of_week: 1, status: nil),
            ]
        )
        XCTAssertEqual(ChallengeProgress.countContributions(row(choreFilter: "bonus"), inputs)[maya], 1)
    }

    func testRoutinesUseFamilyLocalDayAndType() {
        let bedtime = UUID(), morning = UUID()
        let inputs = ChallengeProgress.Inputs(
            routines: [.init(id: bedtime, child_id: maya, type: "bedtime"), .init(id: morning, child_id: maya, type: "morning")],
            routineCompletions: [
                // 03:00 UTC on the 25th is still the 24th in Los Angeles: inside the window.
                .init(routine_id: bedtime, child_id: maya, date: "2026-10-25", completed_at: "2026-10-25T03:00:00.123456+00:00"),
                .init(routine_id: morning, child_id: maya, date: "2026-10-20", completed_at: "2026-10-20T14:00:00Z"),
            ],
            timeZone: "America/Los_Angeles"
        )
        let counts = ChallengeProgress.countContributions(row(metric: "routines", routineType: "bedtime"), inputs)
        XCTAssertEqual(counts[maya], 1)
        XCTAssertEqual(counts[leo], 0)
    }

    // MARK: Progress

    func testTeamModeAddsUp() {
        let p = ChallengeProgress.progress(mode: "team", target: 10, childIds: [maya, leo], counts: [maya: 7, leo: 4])
        XCTAssertEqual(p.current, 10)
        XCTAssertEqual(p.goal, 10)
        XCTAssertEqual(p.percent, 100)
        XCTAssertTrue(p.met)
        XCTAssertEqual(p.remaining, 0)
        XCTAssertTrue(p.kids.allSatisfy(\.done))
    }

    func testEachModeCapsEveryKid() {
        let p = ChallengeProgress.progress(mode: "each", target: 5, childIds: [maya, leo], counts: [maya: 9, leo: 2])
        XCTAssertEqual(p.current, 7, "one kid racing ahead can't fill it for the others")
        XCTAssertEqual(p.goal, 10)
        XCTAssertEqual(p.percent, 70)
        XCTAssertFalse(p.met)
        XCTAssertEqual(p.kids.first { $0.childId == leo }?.toGo, 3)
    }

    func testPhase() {
        XCTAssertEqual(ChallengeProgress.phase(status: "cancelled", startsOn: "2026-10-18", endsOn: "2026-10-24", met: true, today: "2026-10-20"), .cancelled)
        XCTAssertEqual(ChallengeProgress.phase(status: "delivered", startsOn: "2026-10-18", endsOn: "2026-10-24", met: true, today: "2026-10-20"), .delivered)
        XCTAssertEqual(ChallengeProgress.phase(status: "active", startsOn: "2026-10-18", endsOn: "2026-10-24", met: true, today: "2026-10-30"), .won)
        XCTAssertEqual(ChallengeProgress.phase(status: "active", startsOn: "2026-10-18", endsOn: "2026-10-24", met: false, today: "2026-10-25"), .missed)
        XCTAssertEqual(ChallengeProgress.phase(status: "active", startsOn: "2026-10-20", endsOn: "2026-10-24", met: false, today: "2026-10-19"), .upcoming)
        XCTAssertEqual(ChallengeProgress.phase(status: "active", startsOn: "2026-10-18", endsOn: "2026-10-24", met: false, today: "2026-10-19"), .active)
    }

    func testParentListPutsWonFirstAndDropsOldDeliveries() {
        let now = ISO8601DateFormatter().date(from: "2026-10-21T12:00:00Z")!
        let dishes = UUID()
        let won = row(target: 1)
        let running = row(target: 50)
        let oldDelivered = row(status: "delivered", deliveredAt: "2026-10-01T12:00:00Z")
        let inputs = ChallengeProgress.Inputs(
            chores: [.init(id: dishes, child_id: maya, rotation_mode: nil)],
            choreCompletions: [.init(chore_id: dishes, week_start: "2026-10-18", day_of_week: 1, status: nil)],
            timeZone: "UTC"
        )
        let list = ChallengeProgress.parentList([running, won, oldDelivered], inputs: inputs, now: now)
        XCTAssertEqual(list.map(\.challenge.id), [won.id, running.id])
        XCTAssertEqual(list.first?.phase, .won)
    }

    // MARK: Copy, templates, validation

    func testDescribeTarget() {
        XCTAssertEqual(ChallengeProgress.describeTarget(metric: "chores", mode: "team", target: 50, choreFilter: "any", routineType: nil), "50 chores together")
        XCTAssertEqual(ChallengeProgress.describeTarget(metric: "chores", mode: "team", target: 10, choreFilter: "bonus", routineType: nil), "10 bonus chores together")
        XCTAssertEqual(ChallengeProgress.describeTarget(metric: "routines", mode: "each", target: 5, choreFilter: nil, routineType: "bedtime"), "5 bedtime routines each")
    }

    func testTemplatesMatchTheWeb() {
        XCTAssertEqual(ChallengeProgress.templates.map(\.key), ["pizza_night", "movie_night", "team_clean_up", "early_birds", "everyone_pitches_in"])
        let pizza = ChallengeProgress.templates[0]
        XCTAssertEqual(pizza.target, 50)
        XCTAssertEqual(pizza.mode, "team")
        XCTAssertEqual(ChallengeProgress.templates[1].routineType, "bedtime")
    }

    func testValidationMirrorsTheServer() {
        XCTAssertNil(ChallengeProgress.validationError(title: "Pizza", rewardText: "Pizza", target: 5, childIds: [maya, leo], startsOn: "2026-10-18", endsOn: "2026-10-24"))
        XCTAssertNotNil(ChallengeProgress.validationError(title: "Pizza", rewardText: "Pizza", target: 5, childIds: [maya, maya], startsOn: "2026-10-18", endsOn: "2026-10-24"))
        XCTAssertNotNil(ChallengeProgress.validationError(title: " ", rewardText: "Pizza", target: 5, childIds: [maya, leo], startsOn: "2026-10-18", endsOn: "2026-10-24"))
        XCTAssertNotNil(ChallengeProgress.validationError(title: "Pizza", rewardText: "Pizza", target: 5, childIds: [maya, leo], startsOn: "2026-10-24", endsOn: "2026-10-18"))
        XCTAssertNotNil(ChallengeProgress.validationError(title: "Pizza", rewardText: "Pizza", target: 5, childIds: [maya, leo], startsOn: "2026-01-01", endsOn: "2026-06-01"))
    }

    func testDecodesKidChallenges() throws {
        let json = """
        {"childId":"\(maya.uuidString)","currencyCode":"USD","challenges":[{
          "id":"\(UUID().uuidString)","title":"Pizza Night","emoji":"🍕","rewardText":"Pizza night","rewardCents":100,
          "metric":"chores","mode":"team","target":50,"routineType":null,"choreFilter":"any",
          "description":"50 chores together","startsOn":"2026-10-18","endsOn":"2026-10-24",
          "phase":"active","daysLeft":4,"current":12,"goal":50,"percent":24,"met":false,"remaining":38,
          "teammates":[{"childId":"\(maya.uuidString)","name":"Maya","avatarColor":"#f59e0b","avatarEmoji":null,"count":7,"done":true,"toGo":0,"isMe":true}]}]}
        """
        let decoded = try JSONDecoder().decode(ChallengeProgress.KidResponse.self, from: Data(json.utf8))
        XCTAssertEqual(decoded.challenges.first?.current, 12)
        XCTAssertEqual(decoded.challenges.first?.teammates.first?.isMe, true)
    }
}
