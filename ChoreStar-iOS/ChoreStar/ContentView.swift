import SwiftUI

struct ContentView: View {
    @EnvironmentObject var supabaseManager: SupabaseManager
    @EnvironmentObject var themeManager: ThemeManager
    @AppStorage("darkModePreference") private var darkModePreference: String = "System"
    @State private var isLoading = true
    @State private var debugShowKidLogin = false
    @State private var debugShowPaywall = false
    
    private var preferredColorScheme: ColorScheme? {
        switch darkModePreference {
        case "Light":
            return .light
        case "Dark":
            return .dark
        default:
            return nil
        }
    }

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
        .preferredColorScheme(preferredColorScheme)
        .task {
            await supabaseManager.initialize()
            #if DEBUG
            applyDebugLaunchOverrides()
            #endif
            isLoading = false
        }
        .sheet(isPresented: $debugShowKidLogin) {
            KidLoginView()
        }
        .sheet(isPresented: $debugShowPaywall) {
            PaywallView()
        }
    }

    #if DEBUG
    /// Screenshot tooling (like `-chorestar-tab`):
    /// `-chorestar-kid [name]` jumps straight into kid mode for the named
    /// (or first) child, bypassing the PIN; `-chorestar-kidlogin` presents
    /// the standalone kid login sheet.
    private func applyDebugLaunchOverrides() {
        let args = ProcessInfo.processInfo.arguments
        // `-chorestar-fresh` — first-run state for UI tests: forget that
        // onboarding was ever shown. Must run before MainTabs mounts, which
        // is guaranteed here because signin below is what authenticates.
        // `-chorestar-fresh` — drop any restored session so MainTabs
        // re-evaluates for the test login (onboarding flags are per-user-id
        // now, so fresh accounts start clean by construction).
        // `-chorestar-signin email password` — deterministic login for UI
        // tests; typing into the auth form is unreliable (remembered emails,
        // keyboard layouts, autocorrect).
        //
        // One Task, strictly ordered: signOut() is internally fire-and-forget,
        // so running signIn in a sibling task raced it — the sign-out could
        // land AFTER the sign-in and wipe the fresh session.
        // Launch-arg shapes differ by driver: XCUITest sends "-name value…",
        // Maestro sends "name=value" or "name value" (no dash, one value per
        // key — credentials ride space-joined).
        func flagSet(_ name: String) -> Bool {
            args.contains { arg in
                let stripped = arg.hasPrefix("-") ? String(arg.dropFirst()) : arg
                return stripped == name || stripped.hasPrefix("\(name)=")
            }
        }
        func argValues(_ name: String) -> [String] {
            for (i, raw) in args.enumerated() {
                let stripped = raw.hasPrefix("-") ? String(raw.dropFirst()) : raw
                if stripped.hasPrefix("\(name)=") {
                    let value = String(stripped.dropFirst(name.count + 1))
                    return value.split(separator: " ", maxSplits: 1).map(String.init)
                }
                if stripped == name, i + 1 < args.count {
                    if args[i + 1].contains(" ") {
                        return args[i + 1].split(separator: " ", maxSplits: 1).map(String.init)
                    }
                    return Array(args[(i + 1)...].prefix(2))
                }
            }
            return []
        }

        let freshRequested = flagSet("chorestar-fresh")
        var credentials: (email: String, password: String)?
        let signinParts = argValues("chorestar-signin")
        if signinParts.count == 2 {
            credentials = (signinParts[0], signinParts[1])
        }
        if let credentials {
            Task {
                if freshRequested {
                    supabaseManager.signOut()
                    try? await Task.sleep(nanoseconds: 1_500_000_000)
                }
                await supabaseManager.signIn(email: credentials.email, password: credentials.password)
            }
        } else if freshRequested {
            supabaseManager.signOut()
        }
        // `-chorestar-editsmoke` — reproduce the edit-save path without the
        // (untappable-under-XCUITest) category menu: rewrite the first
        // chore's category through the same updateChore call the editor uses.
        if args.contains("-chorestar-editsmoke") {
            Task {
                while !supabaseManager.initialDataLoaded {
                    try? await Task.sleep(nanoseconds: 500_000_000)
                }
                guard let chore = supabaseManager.chores.first else { return }
                try? await supabaseManager.updateChore(
                    choreId: chore.id,
                    name: chore.name,
                    childId: chore.childId,
                    rewardCents: Int((chore.reward * 100).rounded()),
                    category: ChoreCategory.reading.rawValue,
                    icon: chore.icon,
                    color: chore.color,
                    notes: chore.notes
                )
            }
        }
        if args.contains("-chorestar-paywall") {
            debugShowPaywall = true
        } else if args.contains("-chorestar-kidlogin") {
            debugShowKidLogin = true
        } else if let idx = args.firstIndex(of: "-chorestar-kid") {
            let name: String? = (idx + 1 < args.count && !args[idx + 1].hasPrefix("-")) ? args[idx + 1] : nil
            let child = supabaseManager.children.first(where: { c in
                name.map { c.name.caseInsensitiveCompare($0) == .orderedSame } ?? true
            })
            if let child {
                supabaseManager.currentChild = child
                supabaseManager.isChildSession = true
            }
        }
    }
    #endif
}

struct LoadingView: View {
    @EnvironmentObject var themeManager: ThemeManager
    @State private var isAnimating = false
    @State private var starScale: CGFloat = 0.5
    @State private var starRotation: Double = 0
    @State private var showText = false
    
    var body: some View {
        ZStack {
            themeManager.gradient
                .ignoresSafeArea()
            
            VStack(spacing: 30) {
                Spacer()
                
                ZStack {
                    ForEach(0..<3) { index in
                        Circle()
                            .stroke(
                                LinearGradient(
                                    colors: [Color.white.opacity(0.5), Color.white.opacity(0.2)],
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
                    
                    Image(systemName: "star.fill")
                        .font(.system(size: 70))
                        .foregroundStyle(
                            LinearGradient(
                                colors: [Color.white, Color.white.opacity(0.7)],
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
                
                VStack(spacing: 12) {
                    HStack(spacing: 8) {
                        if let emoji = themeManager.themeEmoji {
                            Text(emoji)
                                .font(.system(size: 36))
                        }
                        Text("ChoreStar")
                            .font(.system(size: 48, weight: .bold, design: .rounded))
                            .foregroundColor(.white)
                            .shadow(color: .black.opacity(0.2), radius: 4, x: 0, y: 2)
                    }
                    .opacity(showText ? 1 : 0)
                    .offset(y: showText ? 0 : 20)
                    .animation(.spring(response: 0.6, dampingFraction: 0.8).delay(0.3), value: showText)
                    
                    Text("Make chores fun!")
                        .font(.title3)
                        .foregroundColor(.white.opacity(0.9))
                        .opacity(showText ? 1 : 0)
                        .offset(y: showText ? 0 : 20)
                        .animation(.spring(response: 0.6, dampingFraction: 0.8).delay(0.5), value: showText)
                    
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
    @EnvironmentObject var themeManager: ThemeManager
    @State private var selectedTab: Int = MainTabs.initialTab()

    // First-run wizard: shown once per ACCOUNT (keyed by user id, not per
    // device — a brand-new family on a phone that saw the wizard before must
    // still get it), and only evaluated after loadRemoteData finishes so the
    // children check runs against real data, not a not-yet-loaded [].
    @State private var showOnboarding = false

    private var onboardingSeenKey: String? {
        manager.debugUserId.map { "hasSeenParentOnboarding.\($0)" }
    }

    private func evaluateOnboarding() {
        guard manager.initialDataLoaded,
              let key = onboardingSeenKey,
              !UserDefaults.standard.bool(forKey: key),
              manager.children.isEmpty else { return }
        showOnboarding = true
    }

    /// DEBUG-only: allows UI verification tooling to open a specific tab, e.g.
    /// `simctl launch <device> com.chorestar.ChoreStar -chorestar-tab chores`
    static func initialTab() -> Int {
        #if DEBUG
        let args = ProcessInfo.processInfo.arguments
        if let idx = args.firstIndex(of: "-chorestar-tab"), idx + 1 < args.count {
            switch args[idx + 1] {
            case "family": return 1
            case "chores", "routines", "week": return 2
            case "stats": return 3
            case "settings": return 4
            default: return 0
            }
        }
        #endif
        return 0
    }

    var body: some View {
        TabView(selection: $selectedTab) {
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
        .tint(themeManager.accentColor)
        .onAppear { evaluateOnboarding() }
        .onChange(of: manager.initialDataLoaded) { _, loaded in
            if loaded { evaluateOnboarding() }
        }
        .fullScreenCover(isPresented: $showOnboarding) {
            OnboardingView { goToFamily in
                if let key = onboardingSeenKey {
                    UserDefaults.standard.set(true, forKey: key)
                }
                showOnboarding = false
                if goToFamily {
                    selectedTab = 1
                }
            }
        }
    }
}

#Preview {
    ContentView()
        .environmentObject(SupabaseManager.shared)
        .environmentObject(ThemeManager.shared)
}
