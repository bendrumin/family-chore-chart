import SwiftUI
import TipKit

@main
struct ChoreStarApp: App {
    @StateObject private var supabaseManager = SupabaseManager.shared
    @StateObject private var themeManager = ThemeManager.shared

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
