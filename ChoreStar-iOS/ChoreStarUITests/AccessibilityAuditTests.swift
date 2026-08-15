import XCTest

/// Automated accessibility audits (`performAccessibilityAudit`, iOS 17+) over
/// ChoreStar's reachable screens, in both light and dark appearance.
///
/// Follows the same conventions as ChoreStarUITests: fresh-clone launches,
/// generous waits, auth-state adaptive. Signed-in audits read
/// TEST_USER_EMAIL / TEST_USER_PASSWORD from the runner environment (pass via
/// TEST_RUNNER_* env vars) and skip when absent.
final class AccessibilityAuditTests: XCTestCase {

    private var app: XCUIApplication!

    /// Cold clone + network auth check can hold the launch screen a while.
    private let launchTimeout: TimeInterval = 45

    override func setUpWithError() throws {
        // Collect every audit issue in a run instead of stopping at the first.
        continueAfterFailure = true
        app = XCUIApplication()
        app.launch()
    }

    override func tearDownWithError() throws {
        XCUIDevice.shared.appearance = .light
    }

    // MARK: - Shared helpers (mirrors ChoreStarUITests)

    private func waitForLaunch(file: StaticString = #filePath, line: UInt = #line) -> Bool {
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

    private func tabButton(_ name: String) -> XCUIElement {
        let inTabBar = app.tabBars.buttons[name].firstMatch
        return inTabBar.exists ? inTabBar : app.buttons[name].firstMatch
    }

    // MARK: - Audit helper

    /// Runs the full accessibility audit on the current screen in light and
    /// dark appearance. Each unhandled issue is recorded as a test failure
    /// pointing at the offending element.
    private func auditBothAppearances(screen: String) {
        for (label, style) in [("light", XCUIDevice.Appearance.light), ("dark", .dark)] {
            XCUIDevice.shared.appearance = style
            // Let SwiftUI finish re-rendering for the new appearance.
            RunLoop.current.run(until: Date().addingTimeInterval(1.0))

            do {
                try app.performAccessibilityAudit { issue in
                    let element = issue.element.map(String.init(describing:)) ?? "unknown element"

                    // WCAG 1.4.3 exempts inactive controls from contrast
                    // minimums (e.g. the dimmed submit button before the
                    // form is valid).
                    if issue.auditType == .contrast, issue.element?.isEnabled == false {
                        return true
                    }

                    // Decorative emoji are hidden from VoiceOver; the audit
                    // still measures their full-color glyphs as text.
                    if let text = issue.element?.label,
                       text.count == 1, text.unicodeScalars.contains(where: { $0.properties.isEmojiPresentation }) {
                        return true
                    }

                    // Single-line fields scroll horizontally; content wider
                    // than the field truncates at rest by platform design.
                    if issue.auditType == .textClipped,
                       let type = issue.element?.elementType, type == .textField || type == .secureTextField {
                        return true
                    }

                    // "Nearly passed" is the audit's warning band — it flags
                    // Apple's own secondaryLabel-on-white pairing. Log it,
                    // don't fail the suite on it.
                    let isWarning = issue.compactDescription.localizedCaseInsensitiveContains("nearly")
                    print("A11Y-\(isWarning ? "WARN" : "ISSUE") [\(screen)/\(label)] \(issue.compactDescription) :: \(element) :: \(issue.detailedDescription)")
                    return isWarning
                }
            } catch {
                XCTFail("Accessibility audit could not run on \(screen) (\(label)): \(error)")
            }
        }
    }

    // MARK: - Signed-out screens

    func testAuthScreenAudit() throws {
        guard !waitForLaunch() else {
            throw XCTSkip("Device is signed in; this audit needs the auth screen")
        }
        auditBothAppearances(screen: "auth")
    }

    func testKidLoginSheetAudit() throws {
        guard !waitForLaunch() else {
            throw XCTSkip("Device is signed in; this audit needs the auth screen")
        }

        let kidButton = app.buttons["auth.kidLoginButton"].firstMatch
        XCTAssertTrue(kidButton.waitForExistence(timeout: 5), "Auth screen should offer kid login")
        kidButton.tap()
        XCTAssertTrue(
            app.staticTexts["Kid Login"].waitForExistence(timeout: 5),
            "Kid login sheet should open"
        )

        auditBothAppearances(screen: "kid login")
    }

    // MARK: - Signed-in screens

    func testSignedInTabsAudit() throws {
        if !waitForLaunch() {
            guard let email = ProcessInfo.processInfo.environment["TEST_USER_EMAIL"],
                  let password = ProcessInfo.processInfo.environment["TEST_USER_PASSWORD"],
                  !email.isEmpty, !password.isEmpty else {
                throw XCTSkip("Signed out and TEST_USER_EMAIL / TEST_USER_PASSWORD not provided")
            }

            let emailField = app.textFields["auth.emailField"].firstMatch
            XCTAssertTrue(emailField.waitForExistence(timeout: 5))
            emailField.tap()
            emailField.typeText(email)

            let passwordField = app.secureTextFields["auth.passwordField"].firstMatch
            passwordField.tap()
            passwordField.typeText(password)

            app.buttons["auth.submitButton"].firstMatch.tap()

            let deadline = Date().addingTimeInterval(30)
            var landed = false
            while Date() < deadline, !landed {
                landed = tabButton("Home").exists && tabButton("Settings").exists
                RunLoop.current.run(until: Date().addingTimeInterval(0.5))
            }
            XCTAssertTrue(landed, "Signing in should land on the dashboard tabs")
            guard landed else { return }
        }

        for tabName in ["Home", "Family", "Chores", "Stats", "Settings"] {
            let tab = tabButton(tabName)
            XCTAssertTrue(tab.waitForExistence(timeout: 5), "Missing tab: \(tabName)")
            tab.tap()
            RunLoop.current.run(until: Date().addingTimeInterval(1.0))
            auditBothAppearances(screen: "\(tabName) tab")
        }
    }
}
