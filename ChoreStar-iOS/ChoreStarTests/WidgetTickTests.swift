import XCTest
@testable import ChoreStar

final class WidgetTickTests: XCTestCase {

    private func makeChore(_ name: String, days: [Int] = ChoreSchedule.everyDay, icon: String? = nil) -> Chore {
        Chore(id: UUID(), name: name, childId: UUID(), reward: 0.25, description: nil,
              category: nil, icon: icon, color: nil, notes: nil, sortOrder: 0,
              daysOfWeek: days, createdAt: Date(), updatedAt: Date())
    }

    private func decide(
        _ chore: Chore,
        chores: [Chore]? = nil,
        today: Int = 2,
        vacation: Bool = false,
        done: Set<UUID> = [],
        pending: [UUID: UUID] = [:],
        kid: Bool = false
    ) -> WidgetTicks.Decision {
        WidgetTicks.decision(
            choreId: chore.id,
            chores: chores ?? [chore],
            todayIndex: today,
            onVacationToday: vacation,
            done: done,
            pending: pending,
            kidSessionActive: kid
        )
    }

    // MARK: - Decision

    func testDueUndoneChoreCompletes() {
        XCTAssertEqual(decide(makeChore("Make bed")), .complete)
    }

    func testChoreNotScheduledTodayIsRefused() {
        let monOnly = makeChore("Trash", days: [1])
        XCTAssertEqual(decide(monOnly, today: 2), .notDueToday)
        XCTAssertEqual(decide(monOnly, today: 1), .complete)
    }

    func testVacationDayRefusesEveryTick() {
        XCTAssertEqual(decide(makeChore("Make bed"), vacation: true), .onVacation)
    }

    func testDoneChoreIsNeverToggledOff() {
        let chore = makeChore("Make bed")
        XCTAssertEqual(decide(chore, done: [chore.id]), .alreadyDone)
    }

    func testPendingKidTickIsApproved() {
        let chore = makeChore("Make bed")
        let completionId = UUID()
        XCTAssertEqual(decide(chore, pending: [chore.id: completionId]), .approve(completionId: completionId))
    }

    func testKidSessionRefusesBeforeAnythingElse() {
        let chore = makeChore("Make bed")
        XCTAssertEqual(decide(chore, pending: [chore.id: UUID()], kid: true), .kidSessionActive,
                       "A kid on the device must not approve their own pending tick")
    }

    func testUnknownChoreIsRefused() {
        let chore = makeChore("Make bed")
        XCTAssertEqual(decide(chore, chores: [makeChore("Other")]), .unknownChore)
    }

    // MARK: - Remaining rows

    func testRemainingItemsDropDoneAndFlagPending() {
        let bed = makeChore("Make bed", icon: "🛏️")
        let dishes = makeChore("Dishes", icon: "fork.knife")
        let trash = makeChore("Trash")
        let items = WidgetTicks.remainingItems(due: [bed, dishes, trash], done: [bed.id], pending: [trash.id])
        XCTAssertEqual(items.map(\.name), ["Dishes", "Trash"], "Order follows the due list")
        XCTAssertNil(items[0].isPending)
        XCTAssertEqual(items[1].isPending, true)
        XCTAssertNil(items[0].emoji, "SF Symbol names are not emoji")
    }

    func testEmojiDetection() {
        XCTAssertEqual(WidgetTicks.emoji(from: "🧹"), "🧹")
        XCTAssertNil(WidgetTicks.emoji(from: "checklist"))
        XCTAssertNil(WidgetTicks.emoji(from: "1"), "ASCII digits count as emoji scalars but are not icons")
        XCTAssertNil(WidgetTicks.emoji(from: nil))
    }

    // MARK: - Snapshot

    private func snapshot(day: String?, canTick: Bool?) -> (WidgetSnapshot, UUID) {
        let choreId = UUID()
        let child = WidgetSnapshot.ChildProgress(
            id: UUID(), name: "Emma", colorName: "pink", done: 1, total: 3,
            remaining: [
                WidgetSnapshot.ChoreItem(id: choreId, name: "Dishes"),
                WidgetSnapshot.ChoreItem(id: UUID(), name: "Trash"),
            ]
        )
        let snap = WidgetSnapshot(
            completedToday: 1, totalToday: 3, earnedTodayFormatted: "$0.25",
            children: [child], generatedAt: Date(), day: day, canTick: canTick
        )
        return (snap, choreId)
    }

    func testMarkingDoneMovesTheRowIntoDone() throws {
        let (snap, choreId) = snapshot(day: nil, canTick: true)
        let marked = try XCTUnwrap(snap.markingDone(choreId: choreId))
        XCTAssertEqual(marked.completedToday, 2)
        XCTAssertEqual(marked.children[0].done, 2)
        XCTAssertEqual(marked.children[0].remaining?.map(\.name), ["Trash"])
        XCTAssertNil(marked.markingDone(choreId: choreId), "A chore can only be marked once")
    }

    func testTicksNeedAParentSnapshotFromToday() {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "America/Chicago")!
        let now = calendar.date(from: DateComponents(year: 2026, month: 9, day: 24, hour: 7))!
        let today = WidgetSnapshot.dayKey(for: now, calendar: calendar)
        XCTAssertEqual(today, "2026-09-24")

        XCTAssertTrue(snapshot(day: today, canTick: true).0.allowsTicks(at: now, calendar: calendar))
        XCTAssertFalse(snapshot(day: "2026-09-23", canTick: true).0.allowsTicks(at: now, calendar: calendar),
                       "Yesterday's rows are not tickable")
        XCTAssertFalse(snapshot(day: today, canTick: false).0.allowsTicks(at: now, calendar: calendar))
        XCTAssertFalse(snapshot(day: nil, canTick: nil).0.allowsTicks(at: now, calendar: calendar),
                       "A snapshot from an older build stays display-only")
    }

    func testOldSnapshotStillDecodes() throws {
        let json = """
        {"completedToday":1,"totalToday":2,"earnedTodayFormatted":"$1.00","generatedAt":0,
         "children":[{"id":"\(UUID().uuidString)","name":"Liam","colorName":"blue","done":1,"total":2}]}
        """
        let snap = try JSONDecoder().decode(WidgetSnapshot.self, from: Data(json.utf8))
        XCTAssertNil(snap.children[0].remaining)
        XCTAssertFalse(snap.allowsTicks())
    }
}
