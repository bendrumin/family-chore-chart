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
    @State private var isAnimating = false
    @State private var starScale: CGFloat = 0.5
    @State private var starRotation: Double = 0
    @State private var showText = false
    
    var body: some View {
        ZStack {
            // Gradient background
            Color.choreStarGradient
                .ignoresSafeArea()
            
            VStack(spacing: 30) {
                Spacer()
                
                // Animated star
                ZStack {
                    // Outer glow ring
                    ForEach(0..<3) { index in
                        Circle()
                            .stroke(
                                LinearGradient(
                                    colors: [Color.white.opacity(0.5), Color.choreStarAccent.opacity(0.3)],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                ),
                                lineWidth: 2
                            )
                            .frame(width: 120 + CGFloat(index) * 30, height: 120 + CGFloat(index) * 30)
                            .opacity(isAnimating ? 0 : 0.8)
                            .scaleEffect(isAnimating ? 1.5 : 1.0)
                            .animation(
                                Animation
                                    .easeOut(duration: 1.5)
                                    .repeatForever(autoreverses: false)
                                    .delay(Double(index) * 0.2),
                                value: isAnimating
                            )
                    }
                    
                    // Main star icon
                    Image(systemName: "star.fill")
                        .font(.system(size: 70))
                        .foregroundStyle(
                            LinearGradient(
                                colors: [Color.white, Color.choreStarAccent],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .shadow(color: .black.opacity(0.3), radius: 20, x: 0, y: 10)
                        .scaleEffect(starScale)
                        .rotationEffect(.degrees(starRotation))
                        .onAppear {
                            withAnimation(.spring(response: 0.8, dampingFraction: 0.6)) {
                                starScale = 1.0
                            }
                            
                            withAnimation(
                                Animation
                                    .linear(duration: 3.0)
                                    .repeatForever(autoreverses: false)
                            ) {
                                starRotation = 360
                            }
                        }
                }
                .frame(height: 200)
                
                // App name
                VStack(spacing: 12) {
                    Text("ChoreStar")
                        .font(.system(size: 48, weight: .bold, design: .rounded))
                        .foregroundColor(.white)
                        .shadow(color: .black.opacity(0.2), radius: 4, x: 0, y: 2)
                        .opacity(showText ? 1 : 0)
                        .offset(y: showText ? 0 : 20)
                        .animation(.spring(response: 0.6, dampingFraction: 0.8).delay(0.3), value: showText)
                    
                    Text("Make chores fun!")
                        .font(.title3)
                        .foregroundColor(.white.opacity(0.9))
                        .opacity(showText ? 1 : 0)
                        .offset(y: showText ? 0 : 20)
                        .animation(.spring(response: 0.6, dampingFraction: 0.8).delay(0.5), value: showText)
                    
                    // Animated loading dots
                    HStack(spacing: 8) {
                        ForEach(0..<3) { index in
                            Circle()
                                .fill(Color.white)
                                .frame(width: 8, height: 8)
                                .opacity(isAnimating ? 0.3 : 1.0)
                                .animation(
                                    Animation
                                        .easeInOut(duration: 0.6)
                                        .repeatForever(autoreverses: true)
                                        .delay(Double(index) * 0.2),
                                    value: isAnimating
                                )
                        }
                    }
                    .padding(.top, 20)
                    .opacity(showText ? 1 : 0)
                    .animation(.spring(response: 0.6, dampingFraction: 0.8).delay(0.7), value: showText)
                }
                
                Spacer()
                Spacer()
            }
        }
        .onAppear {
            isAnimating = true
            showText = true
        }
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

            HistoryView()
                .tabItem {
                    Label("Stats", systemImage: "chart.bar.fill")
                }
                .tag(3)

            SettingsView()
                .tabItem {
                    Label("Settings", systemImage: "gearshape.fill")
                }
                .tag(4)
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
