import XCTest
@testable import ChoreStar

/// The getting-started card's step logic (GettingStartedProgress). The card
/// aims at the measured signup-funnel leak (kid added, then no chores), so
/// the step order and the all-done latch are behavior, not decoration.
final class GettingStartedTests: XCTestCase {

    func testFreshAccountHasEverythingToDo() {
        let p = GettingStartedProgress(hasKids: false, hasChores: false, hasCompletion: false)
        XCTAssertFalse(p.allDone)
        XCTAssertEqual(p.nextStep, 0)
        XCTAssertEqual(p.steps, [false, false, false])
    }

    func testTheMeasuredLeak_kidAddedNoChores() {
        let p = GettingStartedProgress(hasKids: true, hasChores: false, hasCompletion: false)
        XCTAssertEqual(p.nextStep, 1, "kid added, chores pending: the card should point at chores")
        XCTAssertFalse(p.allDone)
    }

    func testChoresExistButNothingCheckedOff() {
        let p = GettingStartedProgress(hasKids: true, hasChores: true, hasCompletion: false)
        XCTAssertEqual(p.nextStep, 2, "chores exist: the card should point at the kid-login handoff")
        XCTAssertFalse(p.allDone)
    }

    func testCompleteFunnelIsDone() {
        let p = GettingStartedProgress(hasKids: true, hasChores: true, hasCompletion: true)
        XCTAssertTrue(p.allDone)
        XCTAssertNil(p.nextStep)
    }

    func testOutOfOrderStateStillPointsAtFirstGap() {
        // A shared-device oddity: completions synced but the kid rows were
        // deleted. The card points at the first gap, never crashes on order.
        let p = GettingStartedProgress(hasKids: false, hasChores: true, hasCompletion: true)
        XCTAssertEqual(p.nextStep, 0)
        XCTAssertFalse(p.allDone)
    }
}
