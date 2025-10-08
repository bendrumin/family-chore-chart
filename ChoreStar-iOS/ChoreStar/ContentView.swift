import SwiftUI

struct ContentView: View {
    @EnvironmentObject var supabaseManager: SupabaseManager
    @State private var isLoading = true
    @State private var showingChildAuth = false

    var body: some View {
        Group {
            if isLoading {
                LoadingView()
            } else if supabaseManager.isChildSession {
                ChildMainView()
            } else if supabaseManager.isAuthenticated {
                ZStack(alignment: .bottomTrailing) {
                    MainTabs()
                    
                    // Floating child mode button
                    if supabaseManager.children.filter({ $0.hasChildAccess }).count > 0 {
                        Button(action: {
                            showingChildAuth = true
                        }) {
                            HStack(spacing: 8) {
                                Image(systemName: "figure.child")
                                    .font(.title3)
                                Text("Kids")
                                    .font(.headline)
                            }
                            .foregroundColor(.white)
                            .padding(.horizontal, 20)
                            .padding(.vertical, 14)
                            .background(Color.choreStarGradient)
                            .cornerRadius(30)
                            .shadow(color: Color.choreStarPrimary.opacity(0.4), radius: 12, x: 0, y: 4)
                        }
                        .padding(.trailing, 20)
                        .padding(.bottom, 100)
                    }
                }
                .sheet(isPresented: $showingChildAuth) {
                    ChildAuthView()
                }
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

// Child view is now in ChildMainView.swift

#Preview {
    ContentView().environmentObject(SupabaseManager.shared)
}
