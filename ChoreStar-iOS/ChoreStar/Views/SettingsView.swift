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
                    .onChange(of: soundManager.isSoundEnabled) { newValue in
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
                    .onChange(of: reminderEnabled) { enabled in
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
                        .onChange(of: reminderTimeStorage) { newValue in
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
        VStack(alignment: .leading, spacing: 16) {
            themeRow(title: nil, items: [.auto, .none])
            themeRow(title: "Holidays", items: SeasonalTheme.holidayThemes.map { .theme($0) })
            themeRow(title: "Seasons", items: SeasonalTheme.seasonThemes.map { .theme($0) })
            themeRow(title: "Premium", items: SeasonalTheme.premiumThemes.map { .theme($0) })
        }
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

        var isPremium: Bool {
            if case .theme(let theme) = self { return theme.isPremium }
            return false
        }
    }

    private func themeRow(title: String?, items: [ThemeItem]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            if let title = title {
                Text(title)
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(.choreStarTextSecondary)
                    .padding(.horizontal, 20)
            }

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(items) { item in
                        themeCard(item)
                    }
                }
                .padding(.horizontal, 20)
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
            VStack(spacing: 6) {
                ZStack(alignment: .topTrailing) {
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .fill(item.gradient)
                        .frame(width: 84, height: 64)
                        .overlay(
                            Text(item.emoji)
                                .font(.system(size: 28))
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: 16, style: .continuous)
                                .strokeBorder(
                                    isSelected ? Color.choreStarTextPrimary : Color.clear,
                                    lineWidth: 2.5
                                )
                        )
                        .opacity(isLocked ? 0.55 : 1)

                    if isLocked {
                        Image(systemName: "lock.fill")
                            .font(.caption2)
                            .foregroundColor(.white)
                            .padding(5)
                            .background(.black.opacity(0.45))
                            .clipShape(Circle())
                            .padding(4)
                    } else if isSelected {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.subheadline)
                            .foregroundColor(.white)
                            .shadow(color: .black.opacity(0.4), radius: 2)
                            .padding(5)
                    }
                }

                Text(item.name)
                    .font(.caption2)
                    .fontWeight(isSelected ? .bold : .medium)
                    .foregroundColor(isSelected ? .choreStarTextPrimary : .choreStarTextSecondary)
                    .lineLimit(1)
            }
            .scaleEffect(isSelected ? 1.05 : 1.0)
            .animation(.spring(response: 0.3, dampingFraction: 0.6), value: isSelected)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

#Preview {
    SettingsView()
        .environmentObject(SupabaseManager.shared)
        .environmentObject(ThemeManager.shared)
}
