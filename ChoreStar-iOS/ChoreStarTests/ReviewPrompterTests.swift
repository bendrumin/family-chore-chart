import XCTest
@testable import ChoreStar

final class ReviewPrompterTests: XCTestCase {

    private let day: TimeInterval = 86_400
    private let now = Date(timeIntervalSince1970: 1_700_000_000)

    func testPromptsAfterEnoughDaysAndPerfectDays() {
        XCTAssertTrue(ReviewPrompter.shouldPrompt(
            firstLaunch: now.addingTimeInterval(-4 * day),
            perfectDayCount: 2,
            lastPrompt: nil,
            now: now
        ))
    }

    func testNeverPromptsWithoutFirstLaunchStamp() {
        XCTAssertFalse(ReviewPrompter.shouldPrompt(
            firstLaunch: nil, perfectDayCount: 10, lastPrompt: nil, now: now
        ))
    }

    func testTooSoonAfterInstall() {
        XCTAssertFalse(ReviewPrompter.shouldPrompt(
            firstLaunch: now.addingTimeInterval(-2 * day),
            perfectDayCount: 5,
            lastPrompt: nil,
            now: now
        ), "A brand-new family shouldn't be asked on day two")
    }

    func testNotEnoughPerfectDays() {
        XCTAssertFalse(ReviewPrompter.shouldPrompt(
            firstLaunch: now.addingTimeInterval(-30 * day),
            perfectDayCount: 1,
            lastPrompt: nil,
            now: now
        ), "One celebration isn't an established habit yet")
    }

    func testCooldownBetweenPrompts() {
        XCTAssertFalse(ReviewPrompter.shouldPrompt(
            firstLaunch: now.addingTimeInterval(-200 * day),
            perfectDayCount: 40,
            lastPrompt: now.addingTimeInterval(-89 * day),
            now: now
        ), "89 days since the last ask is inside the 90-day cooldown")

        XCTAssertTrue(ReviewPrompter.shouldPrompt(
            firstLaunch: now.addingTimeInterval(-200 * day),
            perfectDayCount: 40,
            lastPrompt: now.addingTimeInterval(-91 * day),
            now: now
        ))
    }

    func testStatefulFlowThroughUserDefaults() {
        let defaults = UserDefaults(suiteName: "ReviewPrompterTests")!
        defaults.removePersistentDomain(forName: "ReviewPrompterTests")

        let install = now.addingTimeInterval(-10 * day)
        ReviewPrompter.recordLaunch(defaults: defaults, now: install)
        // Second call must not move the stamp.
        ReviewPrompter.recordLaunch(defaults: defaults, now: now)

        XCTAssertFalse(ReviewPrompter.recordPerfectDayAndCheck(defaults: defaults, now: now), "First perfect day: below threshold")
        XCTAssertTrue(ReviewPrompter.recordPerfectDayAndCheck(defaults: defaults, now: now), "Second perfect day: prompt")
        XCTAssertFalse(ReviewPrompter.recordPerfectDayAndCheck(defaults: defaults, now: now), "Third: inside cooldown")

        defaults.removePersistentDomain(forName: "ReviewPrompterTests")
    }

    func testMoneyMomentPromptsAfterThreeDays() {
        XCTAssertTrue(ReviewPrompter.shouldPromptAfterMoneyMoment(
            firstLaunch: now.addingTimeInterval(-4 * day), lastPrompt: nil, now: now
        ), "The first payout after a few days of real use is the moment to ask")
    }

    func testMoneyMomentTooSoonAfterInstallOrUnstamped() {
        XCTAssertFalse(ReviewPrompter.shouldPromptAfterMoneyMoment(
            firstLaunch: now.addingTimeInterval(-2 * day), lastPrompt: nil, now: now
        ))
        XCTAssertFalse(ReviewPrompter.shouldPromptAfterMoneyMoment(
            firstLaunch: nil, lastPrompt: nil, now: now
        ))
    }

    func testMoneyMomentSharesCooldownWithPerfectDayAsk() {
        let defaults = UserDefaults(suiteName: "ReviewPrompterTests.money")!
        defaults.removePersistentDomain(forName: "ReviewPrompterTests.money")

        ReviewPrompter.recordLaunch(defaults: defaults, now: now.addingTimeInterval(-10 * day))
        XCTAssertFalse(ReviewPrompter.recordPerfectDayAndCheck(defaults: defaults, now: now))
        XCTAssertTrue(ReviewPrompter.recordPerfectDayAndCheck(defaults: defaults, now: now), "Perfect-day ask fires")
        XCTAssertFalse(
            ReviewPrompter.recordMoneyMomentAndCheck(defaults: defaults, now: now.addingTimeInterval(day)),
            "A payout the next day must not ask again inside the shared cooldown"
        )
        XCTAssertTrue(ReviewPrompter.recordMoneyMomentAndCheck(defaults: defaults, now: now.addingTimeInterval(91 * day)))

        defaults.removePersistentDomain(forName: "ReviewPrompterTests.money")
    }
}
