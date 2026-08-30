import XCTest

/// App Store screenshots, driven by `fastlane snapshot` (fastlane/Snapfile).
///
/// Replaces the CGEvent/coordinate-calibration pipeline: every tap here is an
/// accessibility query, the status bar is overridden by snapshot (9:41, full
/// battery), and one `fastlane screenshots` run captures every screen for
/// every device in the Snapfile.
///
/// The account is "The Star Family", a dedicated screenshot family seeded by
/// tooling (never a real family): Maya has a 5-day streak, a half-full Lego
/// goal, and a pending store request; Leo has a tick waiting in the approval
/// tray. Reseed with the script kept alongside the roadmap notes if the data
/// drifts. Snapshot names carry the LISTING order prefix; test names only
/// control execution order.
final class ScreenshotTests: XCTestCase {

    private static let email =
        ProcessInfo.processInfo.environment["CHORESTAR_SHOTS_EMAIL"] ?? "bsiegel13+uitest-shots@gmail.com"
    private static let password =
        ProcessInfo.processInfo.environment["CHORESTAR_SHOTS_PASSWORD"] ?? "StarFamily-2026!"

    private let dataTimeout: TimeInterval = 60

    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    /// Launch signed in as the screenshot family, plus any extra debug args.
    @MainActor
    private func launch(_ extra: [String] = []) -> XCUIApplication {
        let app = XCUIApplication()
        setupSnapshot(app)
        app.launchArguments += ["-chorestar-signin", Self.email, Self.password] + extra
        app.launch()
        return app
    }

    /// Tab bar buttons: bottom bar on iPhone, floating top bar on iPad.
    private func tabButton(_ app: XCUIApplication, _ name: String) -> XCUIElement {
        let inTabBar = app.tabBars.buttons[name].firstMatch
        return inTabBar.exists ? inTabBar : app.buttons[name].firstMatch
    }

    /// Sign-in plus the first data load can take a while on a cold clone.
    @MainActor
    private func waitForSignedIn(_ app: XCUIApplication, file: StaticString = #filePath, line: UInt = #line) {
        let deadline = Date().addingTimeInterval(dataTimeout)
        while Date() < deadline {
            if tabButton(app, "Home").exists && tabButton(app, "Settings").exists { return }
            RunLoop.current.run(until: Date().addingTimeInterval(0.5))
        }
        XCTFail("Tab bar never appeared (sign-in or data load failed)", file: file, line: line)
    }

    /// Wait for a text to render anywhere, then let images/animations settle.
    @MainActor
    private func waitFor(_ app: XCUIApplication, text: String, settle: TimeInterval = 2.5,
                         file: StaticString = #filePath, line: UInt = #line) {
        let element = app.staticTexts[text].firstMatch
        XCTAssertTrue(element.waitForExistence(timeout: dataTimeout), "'\(text)' never appeared", file: file, line: line)
        RunLoop.current.run(until: Date().addingTimeInterval(settle))
    }

    // MARK: - Parent

    @MainActor
    func test01Home() throws {
        let app = launch()
        waitForSignedIn(app)
        // Anchor on the Family strip: the tray ("Needs your OK") sits below
        // the fold on iPhone, and off-screen rows in a lazy container do not
        // exist to XCUITest, so it cannot be a HARD anchor. But it is the 2.0
        // selling point of this shot, so give its async load a soft window.
        waitFor(app, text: "Maya", settle: 1)
        _ = app.staticTexts["Needs your OK"].firstMatch.waitForExistence(timeout: 20)
        RunLoop.current.run(until: Date().addingTimeInterval(3))
        snapshot("01-home")
    }

    @MainActor
    func test04Chores() throws {
        let app = launch()
        waitForSignedIn(app)
        tabButton(app, "Chores").tap()
        // Anchor on the FIRST chore: rows below the fold may not exist yet in
        // a lazy container, and "Piano practice" sits several rows down.
        waitFor(app, text: "Feed the dog")
        snapshot("04-chores")
    }

    @MainActor
    func test05Routines() throws {
        // `-chorestar-tab routines` opens the Chores tab on its Routines segment.
        let app = launch(["-chorestar-tab", "routines"])
        waitForSignedIn(app)
        waitFor(app, text: "Morning Routine")
        snapshot("05-routines")
    }

    @MainActor
    func test06Family() throws {
        let app = launch()
        waitForSignedIn(app)
        tabButton(app, "Family").tap()
        waitFor(app, text: "Maya")
        snapshot("06-family")
    }

    @MainActor
    func test07Stats() throws {
        let app = launch()
        waitForSignedIn(app)
        tabButton(app, "Stats").tap()
        waitFor(app, text: "Maya", settle: 3.5)
        snapshot("07-stats")
    }

    // MARK: - Kid mode

    @MainActor
    func test02KidDashboardAndStore() throws {
        // Jumps straight into kid mode for Maya once her data loads.
        let app = launch(["-chorestar-kid", "Maya"])
        waitFor(app, text: "Hi, Maya! 👋")
        // The goal card confirms the wallet fetch landed.
        waitFor(app, text: "Lego set", settle: 3)
        snapshot("02-kid-dashboard")

        // Scroll until the store is on screen.
        let storeTitle = app.staticTexts["Reward Store"].firstMatch
        for _ in 0..<6 where !storeTitle.isHittable {
            app.swipeUp()
        }
        XCTAssertTrue(storeTitle.waitForExistence(timeout: 10), "Reward Store never scrolled into view")
        RunLoop.current.run(until: Date().addingTimeInterval(2))
        snapshot("03-kid-store")
    }

    @MainActor
    func test08KidLogin() throws {
        let app = launch(["-chorestar-kidlogin"])
        waitFor(app, text: "Kid Login", settle: 2)
        snapshot("08-kid-login")
    }
}
