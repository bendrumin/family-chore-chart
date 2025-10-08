import SwiftUI

struct ContentView: View {
    @EnvironmentObject var supabaseManager: SupabaseManager
    @State private var isLoading = true

    var body: some View {
        Group {
            if isLoading {
                LoadingView()
            } else if supabaseManager.isChildSession {
                ChildMainView()
            } else if supabaseManager.isAuthenticated {
                MainTabs()
            } else {
                AuthView()
            }
        }
        .onAppear {
            Task {
                await supabaseManager.checkAuthStatus()
                await supabaseManager.checkChildSession()
                isLoading = false
            }
        }
    }
}

struct LoadingView: View {
    var body: some View {
        VStack(spacing: 20) {
            ProgressView()
                .scaleEffect(1.5)
                .tint(.choreStarPrimary)

            Text("ChoreStar")
                .font(.title)
                .fontWeight(.bold)
                .foregroundColor(.choreStarTextPrimary)

            Text("Loading...")
                .font(.subheadline)
                .foregroundColor(.choreStarTextSecondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.choreStarBackground)
    }
}

struct MainTabs: View {
    @EnvironmentObject var manager: SupabaseManager

    var body: some View {
        TabView {
            DashboardView()
                .tabItem {
                    Label("Home", systemImage: "house.fill")
                }
                .tag(0)

            ChildrenView()
                .tabItem {
                    Label("Family", systemImage: "figure.2.and.child.holdinghands")
                }
                .tag(1)

            ChoresView()
                .tabItem {
                    Label("Chores", systemImage: "list.bullet.clipboard")
                }
                .tag(2)

            SettingsView()
                .tabItem {
                    Label("Settings", systemImage: "gearshape.fill")
                }
                .tag(3)
        }
        .accentColor(.choreStarPrimary)
        .onAppear {
            // Customize tab bar appearance
            let appearance = UITabBarAppearance()
            appearance.configureWithOpaqueBackground()
            appearance.backgroundColor = UIColor(Color.choreStarCardBackground)
            appearance.shadowColor = UIColor.black.withAlphaComponent(0.1)

            // Selected item
            appearance.stackedLayoutAppearance.selected.iconColor = UIColor(Color.choreStarPrimary)
            appearance.stackedLayoutAppearance.selected.titleTextAttributes = [
                .foregroundColor: UIColor(Color.choreStarPrimary),
                .font: UIFont.systemFont(ofSize: 12, weight: .semibold)
            ]

            // Normal item
            appearance.stackedLayoutAppearance.normal.iconColor = UIColor(Color.choreStarTextSecondary)
            appearance.stackedLayoutAppearance.normal.titleTextAttributes = [
                .foregroundColor: UIColor(Color.choreStarTextSecondary),
                .font: UIFont.systemFont(ofSize: 12, weight: .medium)
            ]

            UITabBar.appearance().standardAppearance = appearance
            UITabBar.appearance().scrollEdgeAppearance = appearance
        }
    }
}

// Placeholder for child view
struct ChildMainView: View {
    var body: some View {
        VStack {
            Text("Child View")
                .font(.title)
            Text("Coming soon!")
                .foregroundColor(.secondary)
        }
    }
}

#Preview {
    ContentView().environmentObject(SupabaseManager.shared)
}
