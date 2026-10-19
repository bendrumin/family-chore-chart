import XCTest
@testable import ChoreStar

/// Routine upgrades (migration 032), matching chorestar-nextjs/lib/routines.
final class RoutineUpgradesTests: XCTestCase {
    // MARK: Finish-by

    func testTimeStatusPhasesAreGentle() {
        XCTAssertEqual(RoutineUpgrades.timeStatus(elapsedSeconds: 0, targetSeconds: 600).phase, .plenty)
        XCTAssertEqual(RoutineUpgrades.timeStatus(elapsedSeconds: 350, targetSeconds: 600).phase, .some)
        XCTAssertEqual(RoutineUpgrades.timeStatus(elapsedSeconds: 500, targetSeconds: 600).phase, .little)
        let over = RoutineUpgrades.timeStatus(elapsedSeconds: 700, targetSeconds: 600)
        XCTAssertEqual(over.phase, .over)
        XCTAssertTrue(over.overTime)
        XCTAssertEqual(over.remainingSeconds, 0)
        XCTAssertEqual(over.fractionLeft, 0)
        XCTAssertEqual(RoutineUpgrades.timeStatus(elapsedSeconds: 150.9, targetSeconds: 600).remainingSeconds, 450)
    }

    func testFinishedEarlyOnlyCountsAtLeastThirtySeconds() {
        XCTAssertEqual(RoutineUpgrades.finishedEarlyBy(durationSeconds: 420, targetSeconds: 600), 180)
        XCTAssertNil(RoutineUpgrades.finishedEarlyBy(durationSeconds: 590, targetSeconds: 600))
        XCTAssertNil(RoutineUpgrades.finishedEarlyBy(durationSeconds: 700, targetSeconds: 600))
        XCTAssertNil(RoutineUpgrades.finishedEarlyBy(durationSeconds: 100, targetSeconds: nil))
    }

    func testClockAndEarlyCopy() {
        XCTAssertEqual(RoutineUpgrades.formatClock(725), "12:05")
        XCTAssertEqual(RoutineUpgrades.formatClock(-3), "0:00")
        XCTAssertEqual(RoutineUpgrades.formatEarly(180), "3 min")
        XCTAssertEqual(RoutineUpgrades.formatEarly(45), "45 sec")
        XCTAssertEqual(RoutineUpgrades.formatEarly(90), "1 min 30 sec")
    }

    func testTargetMinutesClampToTheColumn() {
        XCTAssertNil(RoutineUpgrades.targetSeconds(fromMinutes: 0))
        XCTAssertEqual(RoutineUpgrades.targetSeconds(fromMinutes: 15), 900)
        XCTAssertEqual(RoutineUpgrades.targetSeconds(fromMinutes: 500), 7200)
    }

    func testSuggestedTargetAddsSlack() {
        XCTAssertNil(RoutineUpgrades.suggestedTargetSeconds(stepDurations: [nil, 0]))
        // 10 min of timers + 10% = 11 min.
        XCTAssertEqual(RoutineUpgrades.suggestedTargetSeconds(stepDurations: [300, 300, nil]), 660)
        XCTAssertEqual(RoutineUpgrades.suggestedTargetSeconds(stepDurations: [10]), 60, "at least a minute")
    }

    func testFinishByChange() {
        XCTAssertEqual(RoutineUpgrades.FinishByChange.from(before: nil, after: nil), .unchanged)
        XCTAssertEqual(RoutineUpgrades.FinishByChange.from(before: 600, after: 600), .unchanged)
        XCTAssertEqual(RoutineUpgrades.FinishByChange.from(before: nil, after: 900), .set(900))
        XCTAssertEqual(RoutineUpgrades.FinishByChange.from(before: 600, after: nil), .clear)
    }

    // MARK: Live progress

    func testLiveLine() {
        XCTAssertEqual(RoutineUpgrades.liveLine(childName: "Maya", stepIndex: 2, stepsTotal: 6, stepTitle: "Brush teeth"), "Maya is on step 3 of 6: Brush teeth")
        XCTAssertEqual(RoutineUpgrades.liveLine(childName: "Leo", stepIndex: 9, stepsTotal: 4, stepTitle: " "), "Leo is on step 4 of 4")
    }

    func testFreshness() {
        let now = ISO8601DateFormatter().date(from: "2026-10-19T12:00:00Z")!
        XCTAssertTrue(RoutineUpgrades.isFresh(updatedAt: "2026-10-19T11:45:00.123456+00:00", now: now))
        XCTAssertFalse(RoutineUpgrades.isFresh(updatedAt: "2026-10-19T11:00:00Z", now: now))
        XCTAssertFalse(RoutineUpgrades.isFresh(updatedAt: "garbage", now: now))
    }

    func testThrottledReporterIsLatestWins() {
        var clock: TimeInterval = 0
        var scheduled: [(TimeInterval, () -> Void)] = []
        var sent: [Int] = []
        let reporter = ThrottledReporter<Int>(
            interval: 4,
            now: { clock },
            schedule: { delay, work in
                scheduled.append((delay, work))
                return {}
            },
            send: { sent.append($0) }
        )
        reporter.report(0)
        XCTAssertEqual(sent, [0], "the first report goes at once")
        clock = 1
        reporter.report(1)
        reporter.report(2)
        XCTAssertEqual(sent, [0], "held inside the window")
        XCTAssertEqual(scheduled.count, 1, "one timer for the window")
        XCTAssertEqual(scheduled[0].0, 3, accuracy: 0.001)
        clock = 4
        scheduled[0].1()
        XCTAssertEqual(sent, [0, 2], "only the newest held report is sent")
        clock = 5
        reporter.report(3)
        reporter.cancel()
        clock = 20
        reporter.flush()
        XCTAssertEqual(sent, [0, 2], "cancel drops the held one")
        reporter.report(4)
        XCTAssertEqual(sent, [0, 2, 4])
    }

    // MARK: Picture steps

    func testStepPhotoPathsStayInTheFamilyFolder() {
        let owner = "5b0c2d3e-1111-4a2b-9c3d-aaaaaaaaaaaa"
        let child = "6f1c2b9e-2222-4a2b-9c3d-bbbbbbbbbbbb"
        let photo = "7a1c2b9e-3333-4a2b-9c3d-cccccccccccc"
        let path = "\(owner)/\(child)/\(photo).jpg"
        XCTAssertTrue(RoutineUpgrades.isStepPhotoPath(path, ownerId: owner))
        XCTAssertTrue(RoutineUpgrades.isStepPhotoPath(path, ownerId: owner.uppercased(), childId: child))
        XCTAssertFalse(RoutineUpgrades.isStepPhotoPath(path, ownerId: "00000000-0000-0000-0000-000000000000"))
        XCTAssertFalse(RoutineUpgrades.isStepPhotoPath(path, ownerId: owner, childId: photo))
        XCTAssertFalse(RoutineUpgrades.isStepPhotoPath("\(owner)/\(child)/x.jpg", ownerId: owner))
        XCTAssertFalse(RoutineUpgrades.isStepPhotoPath("\(owner)/\(child)/\(photo).png", ownerId: owner))
        XCTAssertFalse(RoutineUpgrades.isStepPhotoPath("../\(owner)/\(child)/\(photo).jpg", ownerId: owner))
        XCTAssertFalse(RoutineUpgrades.isStepPhotoPath(nil, ownerId: owner))
    }

    func testFreeFamiliesKeepOnlyExistingPictures() {
        let owner = "5b0c2d3e-1111-4a2b-9c3d-aaaaaaaaaaaa"
        let child = "6f1c2b9e-2222-4a2b-9c3d-bbbbbbbbbbbb"
        let old = "\(owner)/\(child)/7a1c2b9e-3333-4a2b-9c3d-cccccccccccc.jpg"
        let new = "\(owner)/\(child)/8a1c2b9e-4444-4a2b-9c3d-dddddddddddd.jpg"
        XCTAssertEqual(RoutineUpgrades.allowedImagePath(new, ownerId: owner, childId: child, premium: true, existing: []), new)
        XCTAssertNil(RoutineUpgrades.allowedImagePath(new, ownerId: owner, childId: child, premium: false, existing: [old]))
        XCTAssertEqual(RoutineUpgrades.allowedImagePath(old, ownerId: owner, childId: child, premium: false, existing: [old]), old)
        XCTAssertEqual(RoutineUpgrades.orphanedPhotos(before: [old, new, nil], after: [new]), [old])
    }

    // MARK: Build with AI

    func testDecodesDraftAndMapsWebIcons() throws {
        let json = """
        {"draft":{"name":"School Morning","type":"morning","icon":"wake-up","color":"#fbbf24",
          "steps":[{"title":"Wake up","icon":"wake-up","duration_seconds":60},{"title":"Mystery","icon":"nope"}],
          "tip":"Lay clothes out the night before."},"source":"ai"}
        """
        let decoded = try JSONDecoder().decode(RoutineUpgrades.DraftResponse.self, from: Data(json.utf8))
        XCTAssertEqual(decoded.draft.steps.count, 2)
        XCTAssertNil(decoded.draft.steps[1].duration_seconds)
        XCTAssertEqual(RoutineUpgrades.builderIcon(forDraftIcon: "wake-up"), "☀️")
        XCTAssertEqual(RoutineUpgrades.builderIcon(forDraftIcon: "nope"), "✅")
        XCTAssertEqual(RoutineUpgrades.emoji(forWebIcon: "lights-out"), "💡")
    }

    func testDecodesLiveRoutinesLockedAndOpen() throws {
        let json = """
        {"items":[
          {"routineId":"\(UUID().uuidString)","routineName":"Bedtime","routineColor":null,"childId":"\(UUID().uuidString)","childName":"Maya","childColor":"#f59e0b","startedAt":"2026-10-19T19:00:00Z","updatedAt":"2026-10-19T19:05:00Z","locked":true},
          {"routineId":"\(UUID().uuidString)","routineName":"Morning","routineColor":"#fbbf24","childId":"\(UUID().uuidString)","childName":"Leo","childColor":null,"startedAt":"2026-10-19T07:00:00Z","updatedAt":"2026-10-19T07:02:00Z","locked":false,"stepIndex":2,"stepsTotal":6,"stepTitle":"Brush teeth"}
        ]}
        """
        let decoded = try JSONDecoder().decode(RoutineUpgrades.LiveResponse.self, from: Data(json.utf8))
        XCTAssertTrue(decoded.items[0].locked)
        XCTAssertNil(decoded.items[0].stepIndex)
        XCTAssertEqual(decoded.items[1].stepsTotal, 6)
    }

    func testKidRoutineRowCarriesTheNewColumns() throws {
        let json = """
        {"id":"\(UUID().uuidString)","child_id":"\(UUID().uuidString)","name":"Bedtime","type":"bedtime",
         "auto_read_aloud":true,"target_duration_seconds":900,"reward_minutes":10,"family_premium":true,"family_language":"es",
         "routine_steps":[
           {"id":"\(UUID().uuidString)","title":"Second","order_index":1,"image_path":"a/b/c.jpg","image_url":"https://example.com/c.jpg"},
           {"id":"\(UUID().uuidString)","title":"First","order_index":0}]}
        """
        let row = try JSONDecoder().decode(SupabaseManager.KidRoutineRow.self, from: Data(json.utf8))
        let routine = row.toRoutine()
        XCTAssertTrue(routine.autoReadAloud)
        XCTAssertEqual(routine.targetDurationSeconds, 900)
        XCTAssertEqual(routine.rewardMinutes, 10)
        XCTAssertEqual(routine.steps.map(\.title), ["First", "Second"], "sorted by order_index")
        XCTAssertEqual(routine.steps[1].imageURL?.absoluteString, "https://example.com/c.jpg")
        XCTAssertEqual(row.family_language, "es")
    }

    func testReadAloudVoiceLanguage() {
        XCTAssertEqual(RoutineSpeaker.voiceLanguage(isTemplateTitle: true, familyLanguage: "es", deviceLanguage: "en-US"), "en-US")
        XCTAssertEqual(RoutineSpeaker.voiceLanguage(isTemplateTitle: false, familyLanguage: "es", deviceLanguage: "en-US"), "es")
        XCTAssertEqual(RoutineSpeaker.voiceLanguage(isTemplateTitle: false, familyLanguage: nil, deviceLanguage: "pt-BR"), "pt-BR")
    }

    func testPaywallSourcesMatchTheWeb() {
        XCTAssertEqual(RoutineUpgrades.paywallPhotos, "gate_routine_photos")
        XCTAssertEqual(RoutineUpgrades.paywallTimer, "gate_routine_timer")
        XCTAssertEqual(RoutineUpgrades.paywallAI, "gate_ai_routine")
        XCTAssertEqual(RoutineUpgrades.paywallLive, "gate_routine_live")
    }
}
