import SwiftUI

@main
struct ChoreStarApp: App {
    @StateObject private var supabaseManager = SupabaseManager.shared

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(supabaseManager)
                .onAppear {
                    Task {
                        await supabaseManager.initialize()
                    }
                }
        }
    }
}
