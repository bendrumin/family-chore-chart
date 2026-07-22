import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var manager: SupabaseManager
    @EnvironmentObject var themeManager: ThemeManager
    @ObservedObject var soundManager = SoundManager.shared
    @Environment(\.colorScheme) var colorScheme
    @AppStorage("darkModePreference") private var darkModePreference: DarkModePreference = .system
    @AppStorage("seasonalTheme") private var seasonalThemeSetting: String = "auto"
    @State private var buttonPressCount = 0
    @State private var showingChangePassword = false
    @State private var showingPaywall = false
    @State private var showingWhatsNew = false
    @AppStorage("dailyReminderEnabled") private var reminderEnabled = false
    @AppStorage("dailyReminderTime") private var reminderTimeStorage: Double = NotificationsManager.defaultReminderTimeInterval

    private var reminderTimeBinding: Binding<Date> {
        Binding(
            get: { Date(timeIntervalSinceReferenceDate: reminderTimeStorage) },
            set: { reminderTimeStorage = $0.timeIntervalSinceReferenceDate }
        )
    }
    
    enum DarkModePreference: String, CaseIterable {
        case light = "Light"
        case dark = "Dark"
        case system = "System"
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Appearance") {
                    Picker("Theme", selection: $darkModePreference) {
                        ForEach(DarkModePreference.allCases, id: \.self) { preference in
                            HStack {
                                Image(systemName: iconForPreference(preference))
                                Text(preference.rawValue)
                            }
                            .tag(preference)
                        }
                    }
                    .pickerStyle(.menu)
                    
                    HStack {
                        Image(systemName: colorScheme == .dark ? "moon.fill" : "sun.max.fill")
                            .foregroundColor(colorScheme == .dark ? .purple : .orange)
                        Text("Current Theme")
                        Spacer()
                        Text(colorScheme == .dark ? "Dark" : "Light")
                            .foregroundColor(.choreStarTextSecondary)
                    }
                }
                
                Section {
                    ThemeGalleryView(
                        selection: $seasonalThemeSetting,
                        isPremiumUser: manager.isPremium,
                        onPremiumLocked: { showingPaywall = true }
                    )
                    .listRowInsets(EdgeInsets(top: 8, leading: 0, bottom: 8, trailing: 0))
                    .listRowBackground(Color.clear)
                } header: {
                    Text("Theme")
                } footer: {
                    if let activeTheme = themeManager.activeTheme {
                        Text("Active: \(activeTheme.emoji) \(activeTheme.displayName)")
                    }
                }
                
                Section("Audio") {
                    Toggle(isOn: $soundManager.isSoundEnabled) {
                        HStack {
                            Image(systemName: soundManager.isSoundEnabled ? "speaker.wave.3.fill" : "speaker.slash.fill")
                                .foregroundColor(soundManager.isSoundEnabled ? .choreStarSuccess : .choreStarTextSecondary)
                            Text("Sound Effects")
                        }
                    }
                    .onChange(of: soundManager.isSoundEnabled) { _, newValue in
                        if newValue {
                            SoundManager.shared.play(.cheer)
                        }
                    }
                }
                
                Section("Subscription") {
                    HStack {
                        Text("Plan")
                            .foregroundColor(.choreStarTextSecondary)
                        Spacer()
                        HStack(spacing: 6) {
                            Image(systemName: manager.isPremium ? "crown.fill" : "star")
                                .foregroundColor(manager.isPremium ? .choreStarAccent : .choreStarTextSecondary)
                            Text(manager.subscriptionType.capitalized)
                                .fontWeight(.semibold)
                                .foregroundColor(manager.isPremium ? .choreStarAccent : .choreStarTextPrimary)
                        }
                    }
                    
                    if !manager.isPremium {
                        Button(action: { showingPaywall = true }) {
                            HStack {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("Upgrade to Premium")
                                        .fontWeight(.semibold)
                                        .foregroundColor(.choreStarPrimary)
                                    Text("Unlimited children, chores & more")
                                        .font(.caption)
                                        .foregroundColor(.choreStarTextSecondary)
                                }
                                Spacer()
                                Image(systemName: "crown.fill")
                                    .foregroundColor(.choreStarAccent)
                            }
                        }

                        Button(action: {
                            Task { await StoreKitManager.shared.restorePurchases() }
                        }) {
                            Text("Restore Purchases")
                                .font(.subheadline)
                                .foregroundColor(.choreStarPrimary)
                        }
                    }
                    
                    HStack {
                        Text("Children")
                            .foregroundColor(.choreStarTextSecondary)
                        Spacer()
                        Text("\(manager.children.count)/\(manager.isPremium ? "∞" : "\(manager.childLimit)")")
                            .foregroundColor(.choreStarTextSecondary)
                    }
                    
                    HStack {
                        Text("Chores")
                            .foregroundColor(.choreStarTextSecondary)
                        Spacer()
                        Text("\(manager.chores.count)/\(manager.isPremium ? "∞" : "\(manager.choreLimit)")")
                            .foregroundColor(.choreStarTextSecondary)
                    }
                }
                
                Section("Account") {
                    HStack {
                        Text("Email")
                            .foregroundColor(.choreStarTextSecondary)
                        Spacer()
                        Text(manager.currentUserEmail ?? "Not signed in")
                            .foregroundColor(.choreStarTextPrimary)
                    }
                    
                    Button(action: { showingChangePassword = true }) {
                        HStack {
                            Text("Change Password")
                            Spacer()
                            Image(systemName: "lock.rotation")
                                .foregroundColor(.choreStarPrimary)
                        }
                    }
                }
                
                Section("Family") {
                    NavigationLink {
                        FamilySharingView()
                    } label: {
                        HStack {
                            Image(systemName: "person.2.fill")
                                .foregroundColor(.choreStarPrimary)
                            Text("Family Sharing & Kid Login")
                        }
                    }
                }

                Section {
                    Toggle(isOn: $reminderEnabled) {
                        HStack {
                            Image(systemName: "bell.badge.fill")
                                .foregroundColor(reminderEnabled ? .choreStarAccent : .choreStarTextSecondary)
                            Text("Daily Reminder")
                        }
                    }
                    .onChange(of: reminderEnabled) { _, enabled in
                        Task {
                            if enabled {
                                let granted = await NotificationsManager.shared.requestAuthorization()
                                if granted {
                                    NotificationsManager.shared.scheduleDailyReminder(
                                        at: Date(timeIntervalSinceReferenceDate: reminderTimeStorage)
                                    )
                                } else {
                                    reminderEnabled = false
                                }
                            } else {
                                NotificationsManager.shared.cancelDailyReminder()
                            }
                        }
                    }

                    if reminderEnabled {
                        DatePicker(
                            "Reminder Time",
                            selection: reminderTimeBinding,
                            displayedComponents: .hourAndMinute
                        )
                        .onChange(of: reminderTimeStorage) { _, newValue in
                            NotificationsManager.shared.scheduleDailyReminder(
                                at: Date(timeIntervalSinceReferenceDate: newValue)
                            )
                        }
                    }
                } header: {
                    Text("Notifications")
                } footer: {
                    Text("A gentle nudge to check off today's chores.")
                }

                Section("Data") {
                    Button("Refresh Data") {
                        manager.refreshData()
                    }
                }

                Section("About") {
                    Button(action: { showingWhatsNew = true }) {
                        HStack {
                            Text("What's New")
                            Spacer()
                            Image(systemName: "sparkles")
                                .foregroundColor(.choreStarAccent)
                        }
                    }
                }
                
                Section {
                    Button("Sign Out", role: .destructive) {
                        manager.signOut()
                    }
                }
                #if DEBUG
                Section("Debug Info") {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack { 
                            Text("Supabase URL").fontWeight(.medium)
                            Spacer()
                            Text(manager.debugSupabaseURL ?? "-")
                                .foregroundColor(.secondary)
                                .font(.caption)
                                .lineLimit(2)
                        }
                        
                        HStack { 
                            Text("Anon Key").fontWeight(.medium)
                            Spacer()
                            Text(manager.debugHasKey ? "✅ Present" : "❌ Missing")
                                .foregroundColor(manager.debugHasKey ? .green : .red)
                        }
                        
                        HStack { 
                            Text("User ID").fontWeight(.medium)
                            Spacer()
                            Text(manager.debugUserId ?? "❌ None")
                                .foregroundColor(manager.debugUserId != nil ? .green : .red)
                                .font(.caption)
                                .lineLimit(2)
                        }
                        
                        HStack { 
                            Text("Auth Status").fontWeight(.medium)
                            Spacer()
                            Text(manager.isAuthenticated ? "✅ Authenticated" : "❌ Not Authenticated")
                                .foregroundColor(manager.isAuthenticated ? .green : .red)
                        }
                        
                        HStack { 
                            Text("Children Count").fontWeight(.medium)
                            Spacer()
                            Text("\(manager.children.count)")
                                .foregroundColor(.secondary)
                        }
                        
                        HStack { 
                            Text("Chores Count").fontWeight(.medium)
                            Spacer()
                            Text("\(manager.chores.count)")
                                .foregroundColor(.secondary)
                        }
                    }
                }
                
                Section("Last Error") {
                    if let err = manager.debugLastError, !err.isEmpty {
                        Text(err)
                            .font(.caption)
                            .foregroundColor(.red)
                    } else {
                        Text("No errors")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                #endif
            }
            .navigationTitle("Settings")
            .sheet(isPresented: $showingChangePassword) {
                ChangePasswordView()
            }
            .sheet(isPresented: $showingPaywall) {
                PaywallView()
            }
            .sheet(isPresented: $showingWhatsNew) {
                WhatsNewView()
            }
        }
    }
    
    private func iconForPreference(_ preference: DarkModePreference) -> String {
        switch preference {
        case .light:
            return "sun.max.fill"
        case .dark:
            return "moon.fill"
        case .system:
            return "gear"
        }
    }
}

/// Visual theme picker: swatch cards in horizontal rows, grouped like the
/// old dropdown but showing each theme's actual gradient. Premium themes
/// show a lock for free users and open the paywall.
struct ThemeGalleryView: View {
    @Binding var selection: String
    let isPremiumUser: Bool
    let onPremiumLocked: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            themeRow(title: nil, items: [.auto, .none])
            themeRow(title: "Holidays", items: SeasonalTheme.holidayThemes.map { .theme($0) })
            themeRow(title: "Seasons", items: SeasonalTheme.seasonThemes.map { .theme($0) })
            themeRow(title: "Premium", items: SeasonalTheme.premiumThemes.map { .theme($0) })
        }
        .padding(.vertical, 4)
    }

    private enum ThemeItem: Identifiable {
        case auto
        case none
        case theme(SeasonalTheme)

        var id: String {
            switch self {
            case .auto: return "auto"
            case .none: return "none"
            case .theme(let theme): return theme.rawValue
            }
        }

        var name: String {
            switch self {
            case .auto: return "Auto"
            case .none: return "Classic"
            case .theme(let theme): return theme.displayName
            }
        }

        var emoji: String {
            switch self {
            case .auto: return "✨"
            case .none: return "⭐"
            case .theme(let theme): return theme.emoji
            }
        }

        var gradient: LinearGradient {
            switch self {
            case .auto:
                return SeasonalTheme.current()?.gradient ?? Color.choreStarGradient
            case .none:
                return Color.choreStarGradient
            case .theme(let theme):
                return theme.gradient
            }
        }

        var primaryColor: Color {
            switch self {
            case .auto:
                return SeasonalTheme.current()?.primaryColor ?? .choreStarPrimary
            case .none:
                return .choreStarPrimary
            case .theme(let theme):
                return theme.primaryColor
            }
        }

        var secondaryColor: Color {
            switch self {
            case .auto:
                return SeasonalTheme.current()?.secondaryColor ?? .choreStarPurple
            case .none:
                return .choreStarPurple
            case .theme(let theme):
                return theme.secondaryColor
            }
        }

        var isPremium: Bool {
            if case .theme(let theme) = self { return theme.isPremium }
            return false
        }
    }

    private func themeRow(title: String?, items: [ThemeItem]) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            if let title = title {
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(.choreStarTextSecondary)
                    .padding(.horizontal, 20)
            }

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 16) {
                    ForEach(items) { item in
                        themeCard(item)
                    }
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 4)
            }
        }
    }

    private func themeCard(_ item: ThemeItem) -> some View {
        let isSelected = selection == item.id
        let isLocked = item.isPremium && !isPremiumUser

        return Button {
            if isLocked {
                Haptics.light()
                onPremiumLocked()
            } else {
                withAnimation(.spring(response: 0.35, dampingFraction: 0.7)) {
                    selection = item.id
                }
                Haptics.success()
                SoundManager.shared.play(.pop)
            }
        } label: {
            VStack(spacing: 8) {
                ZStack(alignment: .topTrailing) {
                    ThemePreviewCard(
                        gradient: item.gradient,
                        primary: item.primaryColor,
                        secondary: item.secondaryColor,
                        emoji: item.emoji
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 18, style: .continuous)
                            .strokeBorder(
                                isSelected ? item.primaryColor : Color.choreStarTextSecondary.opacity(0.12),
                                lineWidth: isSelected ? 3 : 1
                            )
                    )
                    .opacity(isLocked ? 0.6 : 1)
                    .saturation(isLocked ? 0.5 : 1)

                    if isLocked {
                        Image(systemName: "lock.fill")
                            .font(.caption)
                            .foregroundColor(.white)
                            .padding(6)
                            .background(.black.opacity(0.5))
                            .clipShape(Circle())
                            .padding(6)
                    } else if isSelected {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.title3)
                            .foregroundStyle(.white, item.primaryColor)
                            .background(Circle().fill(.white))
                            .padding(6)
                    }
                }

                Text(item.name)
                    .font(.caption)
                    .fontWeight(isSelected ? .bold : .medium)
                    .foregroundColor(isSelected ? .choreStarTextPrimary : .choreStarTextSecondary)
                    .lineLimit(1)
            }
            .scaleEffect(isSelected ? 1.04 : 1.0)
            .animation(.spring(response: 0.3, dampingFraction: 0.6), value: isSelected)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

/// A miniature ChoreStar screen wearing the theme — the wallpaper-picker
/// pattern: you see the app itself in each theme, not just a swatch.
private struct ThemePreviewCard: View {
    let gradient: LinearGradient
    let primary: Color
    let secondary: Color
    let emoji: String

    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            // Theme backdrop
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .fill(gradient)

            // Miniature app screen
            VStack(alignment: .leading, spacing: 10) {
                // Mini hero: greeting bar + progress ring
                HStack(spacing: 10) {
                    VStack(alignment: .leading, spacing: 5) {
                        Capsule()
                            .fill(Color.primary.opacity(0.45))
                            .frame(width: 52, height: 6)
                        Capsule()
                            .fill(Color.primary.opacity(0.18))
                            .frame(width: 36, height: 5)
                    }

                    Spacer(minLength: 0)

                    ZStack {
                        Circle()
                            .stroke(primary.opacity(0.22), lineWidth: 4.5)
                        Circle()
                            .trim(from: 0, to: 0.68)
                            .stroke(primary, style: StrokeStyle(lineWidth: 4.5, lineCap: .round))
                            .rotationEffect(.degrees(-90))
                    }
                    .frame(width: 30, height: 30)
                }

                // One mini chore row, roomy
                HStack(spacing: 8) {
                    Circle()
                        .fill(primary)
                        .frame(width: 11, height: 11)
                        .overlay(
                            Image(systemName: "checkmark")
                                .font(.system(size: 6, weight: .black))
                                .foregroundColor(.white)
                        )

                    Capsule()
                        .fill(Color.primary.opacity(0.22))
                        .frame(width: 48, height: 5)

                    Spacer(minLength: 0)

                    Capsule()
                        .fill(secondary.opacity(0.6))
                        .frame(width: 18, height: 6)
                }
                .padding(.horizontal, 9)
                .padding(.vertical, 8)
                .background(Color.primary.opacity(0.05))
                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
            }
            .padding(12)
            .background(Color(uiColor: .systemBackground))
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .shadow(color: .black.opacity(0.18), radius: 5, y: 2)
            .padding(13)

            // Theme emoji as a small corner charm
            Text(emoji)
                .font(.system(size: 20))
                .padding(5)
                .background(.thinMaterial, in: Circle())
                .padding(8)
        }
        .frame(width: 172, height: 126)
    }
}

#Preview {
    SettingsView()
        .environmentObject(SupabaseManager.shared)
        .environmentObject(ThemeManager.shared)
}
