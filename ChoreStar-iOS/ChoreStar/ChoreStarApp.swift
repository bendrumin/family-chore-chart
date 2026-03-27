import SwiftUI

@main
struct ChoreStarApp: App {
    @StateObject private var supabaseManager = SupabaseManager.shared
    @StateObject private var themeManager = ThemeManager.shared

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(supabaseManager)
                .environmentObject(themeManager)
        }
    }
}
