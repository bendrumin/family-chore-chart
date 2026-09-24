import SwiftUI
import TipKit
import UserNotifications

@main
struct ChoreStarApp: App {
    @StateObject private var supabaseManager = SupabaseManager.shared
    @StateObject private var themeManager = ThemeManager.shared
    @StateObject private var deepLinks = DeepLinkRouter.shared
    // SwiftUI apps have no AppDelegate by default, but APNs delivers the device
    // token only through UIApplicationDelegate callbacks.
    @UIApplicationDelegateAdaptor(PushDelegate.self) private var pushDelegate

    init() {
        // Screenshot runs (fastlane snapshot injects "-FASTLANE_SNAPSHOT YES",
        // dash included) must not have tip cards photobombing the captures.
        let snapshotArgs = ProcessInfo.processInfo.arguments
        if snapshotArgs.contains("-FASTLANE_SNAPSHOT") || snapshotArgs.contains("FASTLANE_SNAPSHOT") {
            Tips.hideAllTipsForTesting()
        }
        try? Tips.configure([
            .displayFrequency(.immediate),
            .datastoreLocation(.applicationDefault),
        ])
        // Display face (Bricolage Grotesque) on large navigation titles —
        // parent chrome only; kid screens use inline titles or custom headers.
        AppTypography.installNavigationTitleFont()
        ReviewPrompter.recordLaunch()
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(supabaseManager)
                .environmentObject(themeManager)
                .environmentObject(deepLinks)
                .onOpenURL { url in
                    deepLinks.handle(url)
                }
        }
    }
}


// MARK: - Deep links (push taps + widget taps)

/**
 Shared router for `chorestar://` URLs and APNs custom payloads.

 Kept in this file (not a new .swift) because the app target is not a
 file-system-synchronized group — new files mean hand-editing project.pbxproj.
 */
@MainActor
final class DeepLinkRouter: ObservableObject {
    static let shared = DeepLinkRouter()

    /// Switch MainTabs to Home.
    @Published var wantToday = false
    /// Present ChildDetailView for this id when the parent is signed in.
    @Published var pendingChildId: UUID?
    /// Open Add Chore (Home Screen quick action, `chorestar://new-chore`).
    @Published var wantNewChore = false
    /// Open kid mode: the on-device kid picker when a parent is signed in,
    /// kid login when not (`chorestar://kid-mode`).
    @Published var wantKidMode = false

    private init() {}

    func handle(_ url: URL) {
        guard url.scheme?.lowercased() == "chorestar" else { return }
        let host = (url.host ?? "").lowercased()
        let parts = url.pathComponents.filter { $0 != "/" }

        if host == "today" || (host.isEmpty && parts.first?.lowercased() == "today") {
            wantToday = true
            pendingChildId = nil
            return
        }

        if host == "new-chore" {
            wantNewChore = true
            return
        }

        if host == "kid-mode" {
            wantKidMode = true
            return
        }

        if host == "child", let idString = parts.first, let id = UUID(uuidString: idString) {
            pendingChildId = id
            return
        }

        if host.isEmpty,
           parts.first?.lowercased() == "child",
           parts.count >= 2,
           let id = UUID(uuidString: parts[1]) {
            pendingChildId = id
        }
    }

    func handlePushUserInfo(_ userInfo: [AnyHashable: Any]) {
        if let childId = userInfo["childId"] as? String, let id = UUID(uuidString: childId) {
            pendingChildId = id
            return
        }
        wantToday = true
    }

    func consumeWantToday() {
        wantToday = false
    }

    func consumePendingChildId() -> UUID? {
        let id = pendingChildId
        pendingChildId = nil
        return id
    }

    // MARK: Home Screen quick actions

    /// Same three as the web app's manifest shortcuts and the Android
    /// launcher shortcuts. Each type is the deep link it opens.
    static func installQuickActions() {
        UIApplication.shared.shortcutItems = [
            UIApplicationShortcutItem(
                type: "chorestar://today",
                localizedTitle: String(localized: "Today"),
                localizedSubtitle: nil,
                icon: UIApplicationShortcutIcon(systemImageName: "house.fill")
            ),
            UIApplicationShortcutItem(
                type: "chorestar://new-chore",
                localizedTitle: String(localized: "Add a Chore"),
                localizedSubtitle: nil,
                icon: UIApplicationShortcutIcon(systemImageName: "plus.circle.fill")
            ),
            UIApplicationShortcutItem(
                type: "chorestar://kid-mode",
                localizedTitle: String(localized: "Kid Mode"),
                localizedSubtitle: nil,
                icon: UIApplicationShortcutIcon(systemImageName: "figure.child.circle.fill")
            ),
        ]
    }

    func handle(_ shortcut: UIApplicationShortcutItem) -> Bool {
        guard let url = URL(string: shortcut.type), url.scheme == "chorestar" else { return false }
        handle(url)
        return true
    }
}

/**
 Receives Home Screen quick actions. A SwiftUI app only gets them through a
 scene delegate: the item arrives in the connection options on a cold launch,
 and through `performActionFor` when the app is already running.
 */
final class QuickActionSceneDelegate: NSObject, UIWindowSceneDelegate {
    func scene(
        _ scene: UIScene,
        willConnectTo session: UISceneSession,
        options connectionOptions: UIScene.ConnectionOptions
    ) {
        guard let shortcut = connectionOptions.shortcutItem else { return }
        Task { @MainActor in
            _ = DeepLinkRouter.shared.handle(shortcut)
        }
    }

    func windowScene(
        _ windowScene: UIWindowScene,
        performActionFor shortcutItem: UIApplicationShortcutItem,
        completionHandler: @escaping (Bool) -> Void
    ) {
        Task { @MainActor in
            completionHandler(DeepLinkRouter.shared.handle(shortcutItem))
        }
    }
}


// MARK: - Push registration (APNs device token plumbing)

/**
 Receives the APNs device token and hands it to SupabaseManager.

 Kept in this file rather than its own, because the app target is NOT a
 file-system-synchronized group — a new .swift file means hand-editing
 project.pbxproj in four places.

 Registration flow: SupabaseManager calls registerForPushNotifications() once a
 parent is authenticated. Asking for display permission and requesting the
 token are separate steps — a token is issued even before the user answers the
 permission prompt; permission only governs whether alerts are shown.
 */
final class PushDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        // Without a delegate, iOS SILENTLY DROPS notifications that arrive while
        // the app is foregrounded — a parent watching the dashboard when their
        // kid finishes would see nothing at all, which is the exact moment the
        // buzz matters most.
        UNUserNotificationCenter.current().delegate = self

        // "Needs your OK" alerts carry an Approve button so a parent can act
        // from the lock screen. The category id matches the server's
        // CHORE_APPROVAL_CATEGORY (lib/push/notify.ts).
        let approve = UNNotificationAction(
            identifier: PushDelegate.approveActionId,
            title: "Approve",
            options: [.authenticationRequired]
        )
        let category = UNNotificationCategory(
            identifier: PushDelegate.choreApprovalCategory,
            actions: [approve],
            intentIdentifiers: [],
            options: []
        )
        UNUserNotificationCenter.current().setNotificationCategories([category])
        Task { @MainActor in DeepLinkRouter.installQuickActions() }
        return true
    }

    func application(
        _ application: UIApplication,
        configurationForConnecting connectingSceneSession: UISceneSession,
        options: UIScene.ConnectionOptions
    ) -> UISceneConfiguration {
        let configuration = UISceneConfiguration(name: nil, sessionRole: connectingSceneSession.role)
        configuration.delegateClass = QuickActionSceneDelegate.self
        return configuration
    }

    static let choreApprovalCategory = "CHORE_APPROVAL"
    static let approveActionId = "APPROVE"


    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification
    ) async -> UNNotificationPresentationOptions {
        [.banner, .sound, .badge]
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse
    ) async {
        let userInfo = response.notification.request.content.userInfo

        // Approve straight from the notification, no app launch needed.
        if response.actionIdentifier == PushDelegate.approveActionId,
           let idString = userInfo["completionId"] as? String,
           let completionId = UUID(uuidString: idString) {
            await SupabaseManager.shared.approveCompletion(id: completionId)
            return
        }

        await MainActor.run {
            DeepLinkRouter.shared.handlePushUserInfo(userInfo)
        }
    }

    func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        let hex = deviceToken.map { String(format: "%02x", $0) }.joined()
        Task { await SupabaseManager.shared.registerPushToken(hex) }
    }

    func application(
        _ application: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        // Simulators can't get APNs tokens — routine there, worth a log on device.
        Task { @MainActor in
            SupabaseManager.shared.debugLastError = "Push registration failed: \(error.localizedDescription)"
        }
    }
}
