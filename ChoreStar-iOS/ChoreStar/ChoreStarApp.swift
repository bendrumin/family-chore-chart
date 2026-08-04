import SwiftUI
import TipKit
import UserNotifications

@main
struct ChoreStarApp: App {
    @StateObject private var supabaseManager = SupabaseManager.shared
    @StateObject private var themeManager = ThemeManager.shared
    // SwiftUI apps have no AppDelegate by default, but APNs delivers the device
    // token only through UIApplicationDelegate callbacks.
    @UIApplicationDelegateAdaptor(PushDelegate.self) private var pushDelegate

    init() {
        try? Tips.configure([
            .displayFrequency(.immediate),
            .datastoreLocation(.applicationDefault),
        ])
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(supabaseManager)
                .environmentObject(themeManager)
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
final class PushDelegate: NSObject, UIApplicationDelegate {
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
