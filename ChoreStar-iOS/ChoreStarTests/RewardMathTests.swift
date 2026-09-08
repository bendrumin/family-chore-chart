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

// MARK: - Vacation mode (migration 019)

final class VacationModeTests: XCTestCase {

    private let calendar = Calendar(identifier: .gregorian)

    private func day(_ year: Int, _ month: Int, _ dayOfMonth: Int) -> Date {
        var c = DateComponents()
        c.year = year
        c.month = month
        c.day = dayOfMonth
        return calendar.startOfDay(for: calendar.date(from: c)!)
    }

    // MARK: Date-string parsing

    func testParseReadsPostgresDateStringsAsLocalDays() {
        XCTAssertEqual(VacationMode.parse("2026-09-08", calendar: calendar), day(2026, 9, 8))
        XCTAssertNil(VacationMode.parse(nil, calendar: calendar))
        XCTAssertNil(VacationMode.parse("", calendar: calendar))
        XCTAssertNil(VacationMode.parse("not-a-date", calendar: calendar))
        XCTAssertNil(VacationMode.parse("2026-13-01", calendar: calendar), "Month 13 is not a date")
    }

    func testStringRoundTripsThroughParse() {
        let noon = calendar.date(byAdding: .hour, value: 12, to: day(2026, 12, 31))!
        let encoded = VacationMode.string(from: noon, calendar: calendar)
        XCTAssertEqual(encoded, "2026-12-31")
        XCTAssertEqual(VacationMode.parse(encoded, calendar: calendar), day(2026, 12, 31))
    }

    // MARK: Window membership

    func testCoversIsInclusiveOnBothEnds() {
        let start = "2026-09-08"
        let end = "2026-09-12"
        XCTAssertTrue(VacationMode.covers(day(2026, 9, 8), startsOn: start, endsOn: end, calendar: calendar))
        XCTAssertTrue(VacationMode.covers(day(2026, 9, 10), startsOn: start, endsOn: end, calendar: calendar))
        XCTAssertTrue(VacationMode.covers(day(2026, 9, 12), startsOn: start, endsOn: end, calendar: calendar))
        XCTAssertFalse(VacationMode.covers(day(2026, 9, 7), startsOn: start, endsOn: end, calendar: calendar))
        XCTAssertFalse(VacationMode.covers(day(2026, 9, 13), startsOn: start, endsOn: end, calendar: calendar))
    }

    func testCoversComparesCalendarDaysNotInstants() {
        // 11pm on the last day is still inside the window.
        let lateNight = calendar.date(byAdding: .hour, value: 23, to: day(2026, 9, 12))!
        XCTAssertTrue(VacationMode.covers(lateNight, startsOn: "2026-09-08", endsOn: "2026-09-12", calendar: calendar))
    }

    func testCoversToleratesMissingColumnsAndBadPairs() {
        // A pre-migration row decodes both columns as nil: never on vacation.
        XCTAssertFalse(VacationMode.covers(day(2026, 9, 10), startsOn: nil, endsOn: nil, calendar: calendar))
        // A half-set or inverted pair is treated as no window, not a crash.
        XCTAssertFalse(VacationMode.covers(day(2026, 9, 10), startsOn: "2026-09-08", endsOn: nil, calendar: calendar))
        XCTAssertFalse(VacationMode.covers(day(2026, 9, 10), startsOn: "2026-09-12", endsOn: "2026-09-08", calendar: calendar))
    }

    // MARK: Pre-migration tolerance

    func testFamilySettingsDecodesWithoutVacationColumns() throws {
        // A row from a database that has not run migration 019: select("*")
        // simply omits the columns. The pair must decode as nil, and nil must
        // read as "not on vacation" — the app behaves exactly as before.
        let row = """
        {
          "id": "11111111-1111-1111-1111-111111111111",
          "user_id": "22222222-2222-2222-2222-222222222222",
          "daily_reward_cents": 7,
          "weekly_bonus_cents": 50,
          "timezone": "UTC"
        }
        """
        let settings = try JSONDecoder().decode(FamilySettings.self, from: Data(row.utf8))
        XCTAssertNil(settings.vacationStartsOn)
        XCTAssertNil(settings.vacationEndsOn)
        XCTAssertFalse(VacationMode.covers(
            Date(),
            startsOn: settings.vacationStartsOn,
            endsOn: settings.vacationEndsOn,
            calendar: calendar
        ))
    }

    func testFamilySettingsDecodesWithVacationColumns() throws {
        let row = """
        {
          "id": "11111111-1111-1111-1111-111111111111",
          "user_id": "22222222-2222-2222-2222-222222222222",
          "daily_reward_cents": 7,
          "weekly_bonus_cents": 50,
          "timezone": "UTC",
          "vacation_starts_on": "2026-09-08",
          "vacation_ends_on": "2026-09-12"
        }
        """
        let settings = try JSONDecoder().decode(FamilySettings.self, from: Data(row.utf8))
        XCTAssertEqual(settings.vacationStartsOn, "2026-09-08")
        XCTAssertEqual(settings.vacationEndsOn, "2026-09-12")
        XCTAssertTrue(VacationMode.covers(
            day(2026, 9, 10),
            startsOn: settings.vacationStartsOn,
            endsOn: settings.vacationEndsOn,
            calendar: calendar
        ))
    }

    // MARK: Week-index dates

    func testDateInCurrentWeekMapsDayIndexesToRealDates() {
        // 2026-09-08 is a Tuesday (day index 2); its week starts Sunday 09-06.
        let tuesday = day(2026, 9, 8)
        XCTAssertEqual(RewardMath.dateInCurrentWeek(dayIndex: 0, reference: tuesday, calendar: calendar), day(2026, 9, 6))
        XCTAssertEqual(RewardMath.dateInCurrentWeek(dayIndex: 2, reference: tuesday, calendar: calendar), tuesday)
        XCTAssertEqual(RewardMath.dateInCurrentWeek(dayIndex: 6, reference: tuesday, calendar: calendar), day(2026, 9, 12))
    }

    // MARK: Streak skip logic

    private func completion(on date: Date) -> HistoricalCompletion {
        HistoricalCompletion(choreId: UUID(), weekStart: "", dayOfWeek: 0, date: date)
    }

    func testStreakCarriesAcrossVacationDays() {
        let today = day(2026, 9, 8)
        // Done yesterday and today; a three-day trip before that; done the
        // three days before the trip.
        let doneOffsets = [0, -1, -5, -6, -7]
        let vacationOffsets: Set<Int> = [-2, -3, -4]
        let completions = doneOffsets.map {
            completion(on: calendar.date(byAdding: .day, value: $0, to: today)!)
        }
        let vacationDays = Set(vacationOffsets.map {
            calendar.date(byAdding: .day, value: $0, to: today)!
        })

        let withVacation = AchievementEngine.currentStreak(
            completions,
            isVacationDay: { vacationDays.contains(self.calendar.startOfDay(for: $0)) },
            calendar: calendar,
            today: today
        )
        XCTAssertEqual(withVacation, 5, "Vacation days are skipped, not broken: the runs join")

        let withoutVacation = AchievementEngine.currentStreak(
            completions,
            calendar: calendar,
            today: today
        )
        XCTAssertEqual(withoutVacation, 2, "Without the vacation record the same gap breaks the run")
    }

    func testStreakSurvivesAnUnfinishedTodayInsideVacation() {
        let today = day(2026, 9, 8)
        // On vacation today and yesterday; the three days before were done.
        let completions = [-2, -3, -4].map {
            completion(on: calendar.date(byAdding: .day, value: $0, to: today)!)
        }
        let vacationDays: Set<Date> = Set([0, -1].map {
            calendar.date(byAdding: .day, value: $0, to: today)!
        })

        let streak = AchievementEngine.currentStreak(
            completions,
            isVacationDay: { vacationDays.contains(self.calendar.startOfDay(for: $0)) },
            calendar: calendar,
            today: today
        )
        XCTAssertEqual(streak, 3, "The streak waits through the whole window")
    }

    func testStreakStillBreaksOnARealMissedDay() {
        let today = day(2026, 9, 8)
        // Done today; a real miss yesterday; done before that.
        let completions = [0, -2, -3].map {
            completion(on: calendar.date(byAdding: .day, value: $0, to: today)!)
        }
        let streak = AchievementEngine.currentStreak(
            completions,
            calendar: calendar,
            today: today
        )
        XCTAssertEqual(streak, 1, "A missed non-vacation day still ends the run")
    }
}
