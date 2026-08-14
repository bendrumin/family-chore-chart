import XCTest

/// End-to-end pass over a brand-new family against the production backend:
/// login → first-run onboarding → add a child → create a chore through the
/// 3-step wizard (proving the `activity_category` enum insert) → delete the
/// account, which doubles as cleanup so the test is re-runnable with a fresh
/// signup. The account is created out-of-band (see scripts in the session that
/// added this test) because signup rate limiting makes in-test signup flaky.
final class NewFamilyFlowTests: XCTestCase {

    // Throwaway account, auto-confirmed by /api/auth/signup, deleted by the
    // final step of the test itself.
    // Alphanumeric password on purpose: typeText mistypes layout-dependent
    // symbols if the simulator keyboard is not US English.
    // Credentials come from the environment so nothing secret-shaped is
    // committed: run with CHORESTAR_UITEST_EMAIL / CHORESTAR_UITEST_PASSWORD
    // set to a THROWAWAY account (create one via POST /api/auth/signup).
    // Must be a virgin account (no children) or the onboarding assertion
    // fails; the final deletion step keeps it clean when a run completes.
    private var email: String {
        ProcessInfo.processInfo.environment["CHORESTAR_UITEST_EMAIL"] ?? ""
    }
    private var password: String {
        ProcessInfo.processInfo.environment["CHORESTAR_UITEST_PASSWORD"] ?? ""
    }


    private let childName = "Testy"
    private let choreName = "Feed the goldfish"

    /// Focuses the field, wipes any remembered value (the login form restores
    /// the last-used email), then types. Deleting via keystrokes is used
    /// instead of Select All because the edit menu is flaky across locales.
    private func clearAndType(_ element: XCUIElement, text: String, in app: XCUIApplication) {
        element.tap()
        if let current = element.value as? String,
           !current.isEmpty, current != "you@example.com" {
            // Move the caret to the end, then backspace everything out.
            let end = element.coordinate(withNormalizedOffset: CGVector(dx: 0.95, dy: 0.5))
            end.tap()
            element.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: current.count + 8))
        }
        element.typeText(text)
    }

    func testNewFamilyOnboardingChoreWizardAndDeletion() throws {
        let app = XCUIApplication()
        // DEBUG-only deterministic login (see ContentView launch overrides);
        // typing into the auth form is flaky: remembered emails, layouts.
        app.launchArguments = ["-chorestar-fresh", "-chorestar-signin", email, password]
        app.launch()

        // ── Onboarding wizard (fresh family ⇒ must appear) ───────────────
        let welcome = app.staticTexts["Welcome to ChoreStar!"]
        XCTAssertTrue(welcome.waitForExistence(timeout: 20), "Onboarding did not appear for a childless account")

        let next = app.buttons["Next"]
        next.tap() // → Add Your Kids
        XCTAssertTrue(app.staticTexts["Add Your Kids"].waitForExistence(timeout: 5))
        next.tap() // → Chores & Routines
        XCTAssertTrue(app.staticTexts["Chores & Routines"].waitForExistence(timeout: 5))
        next.tap() // → Hand It to Your Kid
        XCTAssertTrue(app.staticTexts["Hand It to Your Kid"].waitForExistence(timeout: 5))

        let cta = app.buttons["Add Your First Child"]
        XCTAssertTrue(cta.waitForExistence(timeout: 5))
        cta.tap()

        // ── Add a child (wizard lands on the Family tab) ─────────────────
        let addChildButton = app.buttons["family.addChildButton"]
        XCTAssertTrue(addChildButton.waitForExistence(timeout: 10), "No add-child button on Family tab")
        addChildButton.tap()

        let nameField = app.textFields["Enter name"]
        XCTAssertTrue(nameField.waitForExistence(timeout: 10))
        nameField.tap()
        nameField.typeText(childName)

        app.buttons["Add"].tap()

        // Child card should appear once the insert round-trips.
        XCTAssertTrue(app.staticTexts[childName].waitForExistence(timeout: 20), "Child was not created")

        // ── Create a chore through the 3-step wizard ─────────────────────
        let choresTab = app.tabBars.buttons["Chores"]
        XCTAssertTrue(choresTab.waitForExistence(timeout: 10))
        choresTab.tap()

        let newChore = app.buttons.matching(
            NSPredicate(format: "label CONTAINS[c] 'new chore' OR label CONTAINS[c] 'add chore'")
        ).firstMatch
        XCTAssertTrue(newChore.waitForExistence(timeout: 10), "No new-chore button on Chores tab")
        newChore.tap()

        // Step 1 — who & what
        XCTAssertTrue(app.staticTexts["Who is this chore for?"].waitForExistence(timeout: 10))
        app.buttons[childName].firstMatch.tap()

        let choreNameField = app.textFields["e.g., Make bed"]
        choreNameField.tap()
        choreNameField.typeText(choreName)

        app.buttons["Next"].tap()

        // Step 2 — style (defaults are fine)
        XCTAssertTrue(app.staticTexts["Pick an icon"].waitForExistence(timeout: 5))
        app.buttons["Next"].tap()

        // Step 3 — reward & create
        let create = app.buttons["Create Chore"]
        XCTAssertTrue(create.waitForExistence(timeout: 5))
        create.tap()

        // The wizard dismisses only on a successful insert — this is the
        // regression check for the activity_category enum bug.
        XCTAssertTrue(
            app.staticTexts[choreName].waitForExistence(timeout: 20),
            "Chore did not appear after creation — insert failed"
        )

        // ── Delete the account (cleanup + validates the flow) ────────────
        // Tab-bar taps race sheet-dismiss animations; retry until Settings
        // actually becomes the frontmost screen.
        let settingsTab = app.tabBars.buttons["Settings"]
        XCTAssertTrue(settingsTab.waitForExistence(timeout: 10))
        let settingsNav = app.navigationBars["Settings"]
        for _ in 0..<3 where !settingsNav.exists {
            settingsTab.tap()
            _ = settingsNav.waitForExistence(timeout: 3)
        }
        XCTAssertTrue(settingsNav.exists, "Never reached the Settings tab")

        // The row sits at the bottom of Settings; SwiftUI lists only put
        // on-screen rows in the accessibility tree, so scroll until found.
        let deleteRow = app.buttons["Delete Account"].firstMatch
        var swipes = 0
        while !deleteRow.exists && swipes < 8 {
            app.swipeUp()
            swipes += 1
        }
        XCTAssertTrue(deleteRow.waitForExistence(timeout: 10), "Delete Account row not found after scrolling")
        deleteRow.tap()

        let confirmField = app.textFields["DELETE"]
        XCTAssertTrue(confirmField.waitForExistence(timeout: 10))
        confirmField.tap()
        confirmField.typeText("DELETE")

        let deleteButton = app.buttons["Delete My Account"]
        XCTAssertTrue(deleteButton.waitForExistence(timeout: 5))
        deleteButton.tap()

        // Deletion signs the user out; the login screen coming back is proof.
        XCTAssertTrue(
            app.textFields["auth.emailField"].waitForExistence(timeout: 30),
            "Did not return to login after account deletion"
        )
    }
}
