import XCTest
@testable import ChoreStar

final class RewardMathTests: XCTestCase {

    // MARK: - Per-chore mode

    func testPerChoreModeSumsCompletedRewards() {
        let cents = RewardMath.dayEarningsCents(
            completedRewards: [0.25, 0.50, 1.00],
            totalChoreCount: 5,
            isPerChoreMode: true,
            dailyRewardCents: 100
        )
        XCTAssertEqual(cents, 175, "Per-chore mode pays each completed chore regardless of the rest")
    }

    func testPerChoreModeSurvivesFloatArtifacts() {
        // reward_cents = 115 travels through the Chore model as
        // 1.1499999999999999; naive truncation (Int(1.15 * 100)) yields 114.
        let cents = RewardMath.dayEarningsCents(
            completedRewards: [1.15],
            totalChoreCount: 1,
            isPerChoreMode: true,
            dailyRewardCents: nil
        )
        XCTAssertEqual(cents, 115)
    }

    func testPerChoreModeWithNothingCompletedEarnsNothing() {
        let cents = RewardMath.dayEarningsCents(
            completedRewards: [],
            totalChoreCount: 3,
            isPerChoreMode: true,
            dailyRewardCents: nil
        )
        XCTAssertEqual(cents, 0)
    }

    // MARK: - Daily mode

    func testDailyModePaysFlatRewardOnPerfectDay() {
        let cents = RewardMath.dayEarningsCents(
            completedRewards: [0.25, 0.25],
            totalChoreCount: 2,
            isPerChoreMode: false,
            dailyRewardCents: 50
        )
        XCTAssertEqual(cents, 50, "Daily mode pays the flat reward, not the chore rewards")
    }

    func testDailyModePaysNothingOnImperfectDay() {
        let cents = RewardMath.dayEarningsCents(
            completedRewards: [0.25],
            totalChoreCount: 2,
            isPerChoreMode: false,
            dailyRewardCents: 50
        )
        XCTAssertEqual(cents, 0, "One chore left undone forfeits the daily reward")
    }

    func testDailyModeFallsBackToDefaultReward() {
        let cents = RewardMath.dayEarningsCents(
            completedRewards: [0.25],
            totalChoreCount: 1,
            isPerChoreMode: false,
            dailyRewardCents: nil
        )
        XCTAssertEqual(cents, RewardMath.defaultDailyRewardCents)
    }

    // MARK: - Edge cases

    func testNoAssignedChoresEarnsNothingInEitherMode() {
        for perChore in [true, false] {
            let cents = RewardMath.dayEarningsCents(
                completedRewards: [],
                totalChoreCount: 0,
                isPerChoreMode: perChore,
                dailyRewardCents: 50
            )
            XCTAssertEqual(cents, 0, "No chores means no perfect day and no earnings (perChore: \(perChore))")
        }
    }

    // MARK: - Day index

    func testDayIndexMatchesWebConvention() {
        // chore_completions.day_of_week is 0-based Sunday-first, matching
        // JavaScript's Date.getDay(). Jan 3 2021 was a Sunday.
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "UTC")!

        let sunday = calendar.date(from: DateComponents(year: 2021, month: 1, day: 3))!
        XCTAssertEqual(RewardMath.dayIndex(of: sunday, calendar: calendar), 0)

        let saturday = calendar.date(from: DateComponents(year: 2021, month: 1, day: 9))!
        XCTAssertEqual(RewardMath.dayIndex(of: saturday, calendar: calendar), 6)
    }

    // MARK: - Schedules

    func testEmptyOrMissingScheduleMeansEveryDay() {
        XCTAssertEqual(ChoreSchedule.normalized(nil), ChoreSchedule.everyDay)
        XCTAssertEqual(ChoreSchedule.normalized([]), ChoreSchedule.everyDay)
        XCTAssertTrue(ChoreSchedule.isDue([], on: 4))
    }

    func testNormalizedDropsJunkAndDuplicates() {
        XCTAssertEqual(ChoreSchedule.normalized([6, 1, 1, 9, -1]), [1, 6])
    }

    func testIsDueHonorsTheSchedule() {
        XCTAssertTrue(ChoreSchedule.isDue([1], on: 1))
        XCTAssertFalse(ChoreSchedule.isDue([1], on: 2))
    }

    func testLabelNamesTheCommonShapes() {
        XCTAssertEqual(ChoreSchedule.label(for: ChoreSchedule.everyDay), "Every day")
        XCTAssertEqual(ChoreSchedule.label(for: [1, 2, 3, 4, 5]), "Weekdays")
        XCTAssertEqual(ChoreSchedule.label(for: [0, 6]), "Weekends")
        XCTAssertEqual(ChoreSchedule.label(for: [2]), "Tuesdays")
        XCTAssertEqual(ChoreSchedule.label(for: [5, 1, 3]), "Mon, Wed, Fri")
    }

    func testGulfWeekendStyleRelabelsFridaySaturday() {
        XCTAssertEqual(
            ChoreSchedule.label(for: [5, 6], weekendStyle: .fridaySaturday),
            "Weekends"
        )
        XCTAssertEqual(
            ChoreSchedule.label(for: [0, 1, 2, 3, 4], weekendStyle: .fridaySaturday),
            "Weekdays"
        )
        // A Sat–Sun chore in a Gulf family is not their weekend.
        XCTAssertEqual(
            ChoreSchedule.label(for: [0, 6], weekendStyle: .fridaySaturday),
            "Sun, Sat"
        )
    }

    func testWeekendStyleInfersGulfFromFamilyTimezone() {
        XCTAssertEqual(
            WeekendStyle.inferred(familyTimezone: "Asia/Riyadh", deviceTimezone: "America/New_York"),
            .fridaySaturday
        )
        XCTAssertEqual(
            WeekendStyle.inferred(familyTimezone: "Asia/Dubai", deviceTimezone: "America/New_York"),
            .fridaySaturday
        )
        XCTAssertEqual(
            WeekendStyle.inferred(familyTimezone: "Europe/London", deviceTimezone: "Asia/Riyadh"),
            .saturdaySunday
        )
        // Web default UTC must not win over a Riyadh iPhone.
        XCTAssertEqual(
            WeekendStyle.inferred(familyTimezone: "UTC", deviceTimezone: "Asia/Riyadh"),
            .fridaySaturday
        )
        XCTAssertEqual(
            WeekendStyle.inferred(familyTimezone: "UTC", deviceTimezone: "America/New_York"),
            .saturdaySunday
        )
    }

    func testFamilyCurrencyCatalogIncludesGulfAndDoesNotInventDollars() {
        XCTAssertEqual(FamilyCurrency.find("SAR").symbol, "ر.س")
        XCTAssertEqual(FamilyCurrency.find("AED").symbol, "د.إ")
        XCTAssertEqual(FamilyCurrency.find("QAR").symbol, "ر.ق")
        XCTAssertEqual(FamilyCurrency.find("JPY").decimals, 0)
        XCTAssertEqual(FamilyCurrency.find("USD").symbol, "$")
        XCTAssertEqual(FamilyCurrency.find(nil).code, "USD")
        // An unlisted but real code must not silently become $.
        XCTAssertNotEqual(FamilyCurrency.find("SAR").symbol, "$")
    }

    func testChoreDecodesWithoutDaysOfWeekAsEveryDay() throws {
        // A row from before migration 015, or from the kid API before it sent
        // the column, must still decode and default to every day.
        let json = """
        {"id":"9A6B9C2E-0B1B-4A0F-9B1D-8D3E8F9A0B11","name":"Make bed","child_id":"4D2E1F00-1111-4222-8333-944455556666",
         "reward_cents":25,"sort_order":0,"created_at":"2026-08-01T00:00:00Z","updated_at":"2026-08-01T00:00:00Z"}
        """
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        let chore = try decoder.decode(Chore.self, from: Data(json.utf8))
        XCTAssertEqual(chore.daysOfWeek, ChoreSchedule.everyDay)
        XCTAssertTrue(chore.isEveryDay)
    }

    func testDueDayCountSkipsDaysWithNothingDue() {
        let mon = Chore(id: UUID(), name: "Trash", childId: UUID(), reward: 0.5, description: nil,
                        category: nil, icon: nil, color: nil, notes: nil, sortOrder: 0,
                        daysOfWeek: [1], createdAt: Date(), updatedAt: Date())
        let fri = Chore(id: UUID(), name: "Piano", childId: UUID(), reward: 0.5, description: nil,
                        category: nil, icon: nil, color: nil, notes: nil, sortOrder: 0,
                        daysOfWeek: [5], createdAt: Date(), updatedAt: Date())
        XCTAssertEqual(ChoreSchedule.dueDayCount([mon, fri]), 2)
        XCTAssertEqual(ChoreSchedule.due([mon, fri], on: 1).map(\.name), ["Trash"])
        XCTAssertEqual(ChoreSchedule.due([mon, fri], on: 3).count, 0)
    }

    // MARK: - Bulk completion (missingDueCells)

    private func makeChore(_ name: String, days: [Int], reward: Double = 0.25) -> Chore {
        Chore(id: UUID(), name: name, childId: UUID(), reward: reward, description: nil,
              category: nil, icon: nil, color: nil, notes: nil, sortOrder: 0,
              daysOfWeek: days, createdAt: Date(), updatedAt: Date())
    }

    func testMissingDueCellsRespectsScheduleMasks() {
        let daily = makeChore("Make bed", days: ChoreSchedule.everyDay)
        let monOnly = makeChore("Trash", days: [1])
        let cells = ChoreSchedule.missingDueCells(
            chores: [daily, monOnly], existing: [], throughDay: 2
        )
        // Sun/Mon/Tue for the daily chore, Monday alone for the Monday chore.
        XCTAssertEqual(cells.count, 4)
        XCTAssertEqual(
            cells.filter { $0.choreId == monOnly.id }.map(\.dayOfWeek),
            [1],
            "A Monday-only chore must not be inserted on other days"
        )
        XCTAssertEqual(
            cells.filter { $0.choreId == daily.id }.map(\.dayOfWeek),
            [0, 1, 2]
        )
    }

    func testMissingDueCellsStopsAtThroughDay() {
        let daily = makeChore("Make bed", days: ChoreSchedule.everyDay)
        let cells = ChoreSchedule.missingDueCells(chores: [daily], existing: [], throughDay: 3)
        XCTAssertEqual(cells.map(\.dayOfWeek), [0, 1, 2, 3], "Days after throughDay stay untouched")
    }

    func testMissingDueCellsSkipsCompletedAndPendingCells() {
        let daily = makeChore("Make bed", days: ChoreSchedule.everyDay)
        // Day 0 is done, day 1 is a pending kid tick: both already have a row,
        // so neither may be inserted again.
        let existing: Set<ChoreDayCell> = [
            ChoreDayCell(choreId: daily.id, dayOfWeek: 0),
            ChoreDayCell(choreId: daily.id, dayOfWeek: 1),
        ]
        let cells = ChoreSchedule.missingDueCells(chores: [daily], existing: existing, throughDay: 2)
        XCTAssertEqual(cells, [ChoreDayCell(choreId: daily.id, dayOfWeek: 2)])
    }

    func testMissingDueCellsEmptyCases() {
        // No chores at all.
        XCTAssertTrue(ChoreSchedule.missingDueCells(chores: [], existing: [], throughDay: 6).isEmpty)

        // Everything through the day already has a row.
        let daily = makeChore("Make bed", days: ChoreSchedule.everyDay)
        let allDone: Set<ChoreDayCell> = [
            ChoreDayCell(choreId: daily.id, dayOfWeek: 0),
            ChoreDayCell(choreId: daily.id, dayOfWeek: 1),
        ]
        XCTAssertTrue(
            ChoreSchedule.missingDueCells(chores: [daily], existing: allDone, throughDay: 1).isEmpty,
            "All caught up means nothing to insert"
        )

        // Nothing due in range: a Friday chore before Friday.
        let fri = makeChore("Piano", days: [5])
        XCTAssertTrue(ChoreSchedule.missingDueCells(chores: [fri], existing: [], throughDay: 3).isEmpty)
    }

    func testMissingDueCellsFromDayScopesToTodayOnly() {
        // "Mark Today Done" passes fromDay == throughDay: earlier gaps in the
        // week stay open.
        let daily = makeChore("Make bed", days: ChoreSchedule.everyDay)
        let cells = ChoreSchedule.missingDueCells(
            chores: [daily], existing: [], throughDay: 3, fromDay: 3
        )
        XCTAssertEqual(cells, [ChoreDayCell(choreId: daily.id, dayOfWeek: 3)])
    }

    func testMissingDueCellsClampsOutOfRangeDays() {
        let daily = makeChore("Make bed", days: ChoreSchedule.everyDay)
        XCTAssertEqual(
            ChoreSchedule.missingDueCells(chores: [daily], existing: [], throughDay: 42).count,
            7,
            "throughDay clamps to Saturday"
        )
        XCTAssertTrue(
            ChoreSchedule.missingDueCells(chores: [daily], existing: [], throughDay: -1).isEmpty,
            "A negative throughDay is an empty range, not a crash"
        )
    }

    func testDisplayOrderFollowsCalendarFirstWeekday() {
        func calendar(firstWeekday: Int) -> Calendar {
            var c = Calendar(identifier: .gregorian)
            c.firstWeekday = firstWeekday
            return c
        }
        // US, Mexico, Brazil, and the Gulf: Sunday-first, the stored order.
        XCTAssertEqual(ChoreSchedule.displayOrder(calendar: calendar(firstWeekday: 1)),
                       [0, 1, 2, 3, 4, 5, 6])
        // UK, Switzerland, most of Europe: Monday-first.
        XCTAssertEqual(ChoreSchedule.displayOrder(calendar: calendar(firstWeekday: 2)),
                       [1, 2, 3, 4, 5, 6, 0])
        // Saturday-first calendars still cover all seven days exactly once.
        XCTAssertEqual(ChoreSchedule.displayOrder(calendar: calendar(firstWeekday: 7)),
                       [6, 0, 1, 2, 3, 4, 5])
    }
}
