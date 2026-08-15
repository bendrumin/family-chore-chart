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
}
