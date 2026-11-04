import XCTest

/// Smoke tests for ChoreStar's main flows.
///
/// Tests run on fresh simulator clones, so the app starts signed OUT and cold —
/// waits are generous because the launch screen holds until the auth check
/// finishes. Tests adapt to auth state: signed out they exercise the auth and
/// kid-login screens; signed in they exercise tab navigation. Flows needing
/// credentials read TEST_USER_EMAIL / TEST_USER_PASSWORD from the runner
/// environment (pass via TEST_RUNNER_* env vars) and skip when absent.
final class ChoreStarUITests: XCTestCase {

    private var app: XCUIApplication!

    /// Cold clone + network auth check can hold the launch screen a while.
    private let launchTimeout: TimeInterval = 45

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launch()
    }

    /// Waits out the launch screen, then reports auth state.
    /// Returns true when the tab bar (signed in) is visible, false when the
    /// auth screen is. Fails the test if neither ever appears.
    private func waitForLaunch(file: StaticString = #filePath, line: UInt = #line) -> Bool {
        // On iPad the TabView renders as a floating top bar that is NOT
        // exposed as tabBars — detect signed-in state via the tab buttons.
        let submitButton = app.buttons["auth.submitButton"].firstMatch

        let deadline = Date().addingTimeInterval(launchTimeout)
        while Date() < deadline {
            if tabButton("Home").exists && tabButton("Settings").exists { return true }
            if submitButton.exists { return false }
            RunLoop.current.run(until: Date().addingTimeInterval(0.5))
        }

        XCTFail("Neither the tab bar nor the auth screen appeared within \(Int(launchTimeout))s", file: file, line: line)
        return false
    }

    /// Tab bar buttons: bottom bar on iPhone, floating top bar on iPad —
    /// both expose the tab as a plain button with the tab's title.
    /// Signed-out tests drop any saved session first: the simulator keychain
    /// survives reinstalls, so a used simulator otherwise never shows the
    /// auth screen and these tests only ever skipped.
    private func relaunchSignedOut() {
        app.terminate()
        // `-saved_email ""` overrides the remembered email for this launch, so
        // a test that types one starts from an empty field.
        app.launchArguments = ["-chorestar-fresh", "-saved_email", ""]
        app.launch()
    }

    /// Signed-in tests sign in with TEST_USER_EMAIL / TEST_USER_PASSWORD when
    /// given (pass via TEST_RUNNER_*), else use whatever session is saved.
    private func relaunchSignedInIfPossible() {
        let env = ProcessInfo.processInfo.environment
        guard let email = env["TEST_USER_EMAIL"], let password = env["TEST_USER_PASSWORD"],
              !email.isEmpty, !password.isEmpty else { return }
        app.terminate()
        app.launchArguments = ["-chorestar-fresh", "-chorestar-signin", email, password]
        app.launch()
        // The launch-arg login signs out, pauses, then signs in, so the auth
        // screen shows for a moment; wait for the tabs, not the first screen.
        let deadline = Date().addingTimeInterval(45)
        while Date() < deadline, !(tabButton("Home").exists && tabButton("Settings").exists) {
            RunLoop.current.run(until: Date().addingTimeInterval(0.5))
        }
    }

    private func tabButton(_ name: String) -> XCUIElement {
        let inTabBar = app.tabBars.buttons[name].firstMatch
        return inTabBar.exists ? inTabBar : app.buttons[name].firstMatch
    }

    // MARK: - Launch

    func testLaunchShowsAuthOrDashboard() throws {
        _ = waitForLaunch()
        // waitForLaunch fails the test if neither state appears
    }

    // MARK: - Signed-out flows

    func testKidLoginOpensFromAuthScreen() throws {
        relaunchSignedOut()
        guard !waitForLaunch() else {
            throw XCTSkip("Device is signed in; this test needs the auth screen")
        }

        let kidButton = app.buttons["auth.kidLoginButton"].firstMatch
        XCTAssertTrue(kidButton.waitForExistence(timeout: 5), "Auth screen should offer kid login")
        kidButton.tap()

        XCTAssertTrue(
            app.staticTexts["Kid Login"].waitForExistence(timeout: 5),
            "Kid login sheet should open"
        )
    }

    func testSignUpToggleShowsConfirmField() throws {
        relaunchSignedOut()
        guard !waitForLaunch() else {
            throw XCTSkip("Device is signed in; this test needs the auth screen")
        }

        let signUpSegment = app.buttons["Sign Up"].firstMatch
        XCTAssertTrue(signUpSegment.waitForExistence(timeout: 5))
        signUpSegment.tap()

        XCTAssertTrue(
            app.secureTextFields["auth.confirmPasswordField"].waitForExistence(timeout: 5),
            "Sign Up mode should show a confirm password field"
        )
    }

    // MARK: - Signed-in flows

    func testTabNavigation() throws {
        relaunchSignedInIfPossible()
        guard waitForLaunch() else {
            throw XCTSkip("Device is signed out; this test needs an authenticated session")
        }

        for (tabName, expectedTitle) in [
            ("Family", "Family"),
            ("Chores", "Chores"),
            ("Stats", "Stats & History"),
            ("Settings", "Settings"),
            ("Home", "Home"),
        ] {
            let tab = tabButton(tabName)
            XCTAssertTrue(tab.waitForExistence(timeout: 5), "Missing tab: \(tabName)")
            tab.tap()
            XCTAssertTrue(
                app.navigationBars[expectedTitle].waitForExistence(timeout: 5),
                "Tab \(tabName) should show '\(expectedTitle)' navigation title"
            )
        }
    }

    func testSettingsShowsFamilySharing() throws {
        relaunchSignedInIfPossible()
        guard waitForLaunch() else {
            throw XCTSkip("Device is signed out; this test needs an authenticated session")
        }

        tabButton("Settings").tap()

        // Further down Settings since Appearance moved to its own screen; the
        // list builds rows lazily, so scroll until it exists.
        let familyRow = app.staticTexts["Family Sharing & Kid Login"].firstMatch
        for _ in 0..<6 where !familyRow.waitForExistence(timeout: 1) {
            app.swipeUp()
        }
        XCTAssertTrue(familyRow.exists, "Settings should link to Family Sharing")
        familyRow.tap()

        XCTAssertTrue(
            app.navigationBars["Family Sharing"].waitForExistence(timeout: 5),
            "Family Sharing screen should open"
        )
    }

    func testParentSignIn() throws {
        relaunchSignedOut()
        guard !waitForLaunch() else {
            throw XCTSkip("Device is signed in; this test needs the auth screen")
        }

        guard let email = ProcessInfo.processInfo.environment["TEST_USER_EMAIL"],
              let password = ProcessInfo.processInfo.environment["TEST_USER_PASSWORD"],
              !email.isEmpty, !password.isEmpty else {
            throw XCTSkip("TEST_USER_EMAIL / TEST_USER_PASSWORD not provided")
        }

        let emailField = app.textFields["auth.emailField"].firstMatch
        XCTAssertTrue(emailField.waitForExistence(timeout: 5))
        emailField.tap()
        emailField.typeText(email)

        let passwordField = app.secureTextFields["auth.passwordField"].firstMatch
        passwordField.tap()
        // Pasted, not typed: typeText mistypes symbols ("!") on the simulator
        // keyboard, so a password with one never signed in.
        UIPasteboard.general.string = password
        passwordField.press(forDuration: 1.2)
        let paste = app.menuItems["Paste"].firstMatch
        if paste.waitForExistence(timeout: 3) {
            paste.tap()
        } else {
            passwordField.typeText(password)
        }
        UIPasteboard.general.string = ""

        app.buttons["auth.submitButton"].firstMatch.tap()

        let deadline = Date().addingTimeInterval(30)
        var landed = false
        while Date() < deadline, !landed {
            landed = tabButton("Home").exists && tabButton("Settings").exists
            RunLoop.current.run(until: Date().addingTimeInterval(0.5))
        }
        XCTAssertTrue(landed, "Signing in should land on the dashboard tabs")
    }
}
