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
    @State private var showingDeleteAccount = false
    @State private var customAccent: Color = .choreStarPrimary
    @State private var accentSaveTask: Task<Void, Never>?
    @AppStorage("dailyReminderEnabled") private var reminderEnabled = false
    @AppStorage("dailyReminderTime") private var reminderTimeStorage: Double = NotificationsManager.defaultReminderTimeInterval
    @State private var activityPushEnabled = true

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
                    .onChange(of: seasonalThemeSetting) { _, newValue in
                        Task { await manager.setSeasonalThemePreference(newValue) }
                    }
                } header: {
                    Text("Theme")
                } footer: {
                    if themeManager.customAccentHex != nil {
                        Text("Custom accent overrides the theme colours. Theme choice syncs with the web app.")
                    } else if let activeTheme = themeManager.activeTheme {
                        Text("Active: \(activeTheme.emoji) \(activeTheme.displayName) — synced with the web app.")
                    } else {
                        Text("Theme choice syncs with the web app.")
                    }
                }

                Section {
                    ColorPicker(selection: $customAccent, supportsOpacity: false) {
                        HStack {
                            Image(systemName: "paintpalette.fill")
                                .foregroundColor(themeManager.accentColor)
                            Text("Custom Accent")
                        }
                    }
                    .onChange(of: customAccent) { _, newValue in
                        // ColorPicker fires continuously while dragging; debounce
                        // so we save the colour they settle on, not 60 writes/sec.
                        accentSaveTask?.cancel()
                        guard let hex = newValue.hexRGBString else { return }
                        accentSaveTask = Task {
                            try? await Task.sleep(nanoseconds: 700_000_000)
                            guard !Task.isCancelled else { return }
                            _ = await manager.setCustomAccentColor(hex)
                        }
                    }

                    if themeManager.customAccentHex != nil {
                        Button("Reset to Theme Colours") {
                            accentSaveTask?.cancel()
                            Task { _ = await manager.setCustomAccentColor(nil) }
                        }
                    }
                } header: {
                    Text("Accent Colour")
                } footer: {
                    Text("Synced with the web app — pick a colour once and every device follows.")
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

                    // App Store Guideline 5.1.1(v) requires account deletion to be
                    // reachable inside the app. It lives here, in Account, because
                    // that's the first place anyone (including a reviewer) looks.
                    Button(role: .destructive, action: { showingDeleteAccount = true }) {
                        HStack {
                            Text("Delete Account")
                            Spacer()
                            Image(systemName: "trash")
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

                    NavigationLink {
                        FamilyRewardsSettingsView()
                    } label: {
                        HStack {
                            Image(systemName: "dollarsign.circle.fill")
                                .foregroundColor(.choreStarAccent)
                            Text("Rewards & Currency")
                        }
                    }
                }

                Section {
                    Toggle(isOn: $activityPushEnabled) {
                        HStack {
                            Image(systemName: "iphone.radiowaves.left.and.right")
                                .foregroundColor(activityPushEnabled ? .choreStarPrimary : .choreStarTextSecondary)
                            Text("Activity Alerts")
                        }
                    }
                    .onChange(of: activityPushEnabled) { _, enabled in
                        Task { await manager.setActivityPushEnabled(enabled) }
                    }

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
                    Text("Activity alerts buzz when a kid finishes all chores or a routine. The daily reminder is a local nudge on this device.")
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

                    Link(destination: URL(string: "https://openmoji.org")!) {
                        HStack {
                            Text("Chore icons by OpenMoji")
                            Spacer()
                            Text("CC BY-SA 4.0")
                                .font(.caption)
                                .foregroundColor(.choreStarTextSecondary)
                        }
                    }
                    .foregroundColor(.choreStarTextPrimary)
                }
                
                Section {
                    Button("Sign Out", role: .destructive) {
                        manager.signOut()
                    }
                }
            }
            .onAppear {
                if let hex = themeManager.customAccentHex, let c = Color(hexString: hex) {
                    customAccent = c
                }
                activityPushEnabled = manager.familySettings?.activityPushOn ?? true
            }
            .onChange(of: manager.familySettings?.activityPushOn) { _, enabled in
                if let enabled {
                    activityPushEnabled = enabled
                }
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
            .sheet(isPresented: $showingDeleteAccount) {
                DeleteAccountView()
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

/// Permanent account deletion — App Store Guideline 5.1.1(v).
///
/// Apple requires deletion to be available in-app and says that "only offering
/// to temporarily deactivate or disable an account is insufficient", so this
/// really destroys the account. It does allow confirmation steps to prevent
/// accidents, which is what the typed word below is for: the whole family's
/// chore history goes with it, and there is no undo.
struct DeleteAccountView: View {
    @EnvironmentObject var manager: SupabaseManager
    @Environment(\.dismiss) private var dismiss

    /// Must be typed exactly. Autocorrect and auto-capitalization are disabled
    /// on the field so iOS can't "helpfully" fill this in for the user.
    private static let confirmWord = "DELETE"

    @State private var confirmation = ""
    @State private var isDeleting = false
    /// True when the active subscription is an Apple auto-renewal — resolved
    /// async from StoreKit entitlements; defaults false so the Stripe copy shows
    /// until proven otherwise.
    @State private var billedThroughApple = false
    @State private var errorMessage: String?
    @State private var billingWarning = false

    private var canDelete: Bool {
        confirmation.trimmingCharacters(in: .whitespaces).uppercased() == Self.confirmWord && !isDeleting
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    header

                    VStack(alignment: .leading, spacing: 12) {
                        Text("What gets deleted")
                            .font(.headline)
                            .foregroundColor(.choreStarTextPrimary)

                        ForEach(Self.deletedItems, id: \.self) { item in
                            HStack(alignment: .top, spacing: 10) {
                                Image(systemName: "xmark.circle.fill")
                                    .font(.footnote)
                                    .foregroundColor(.choreStarDanger)
                                    .padding(.top, 2)
                                Text(item)
                                    .font(.subheadline)
                                    .foregroundColor(.choreStarTextSecondary)
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                        }
                    }

                    if manager.isPremium {
                        // Honest per-rail copy. Stripe subscriptions ARE cancelled
                        // by the deletion endpoint; an Apple subscription cannot be
                        // cancelled by any developer — only the user can, in
                        // Settings — and deleting the account does NOT stop Apple
                        // billing. Telling an Apple-billed user "you won't be
                        // billed again" would be false.
                        if billedThroughApple {
                            noticeBox(
                                icon: "exclamationmark.circle",
                                text: "Your subscription is billed by Apple, and deleting your account does not cancel it. Cancel it in Settings → your name → Subscriptions to stop future charges."
                            )
                        } else {
                            noticeBox(
                                icon: "creditcard",
                                text: "Your ChoreStar subscription will be cancelled. You won't be billed again."
                            )
                        }
                    }

                    if manager.familyMembers.count > 1 || manager.isSharedMember {
                        noticeBox(
                            icon: "person.2",
                            text: manager.isSharedMember
                                ? "You'll be removed from the family you joined. The family's own data stays with its owner."
                                : "Anyone sharing this family loses access to its children, chores, and routines."
                        )
                    }

                    confirmField

                    if let errorMessage = errorMessage {
                        Text(errorMessage)
                            .font(.subheadline)
                            .foregroundColor(.choreStarDanger)
                            .fixedSize(horizontal: false, vertical: true)
                    }

                    deleteButton

                    Button("Keep My Account") {
                        dismiss()
                    }
                    .font(.headline)
                    .foregroundColor(.choreStarPrimary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .disabled(isDeleting)
                }
                .padding(24)
            }
            .background(Color.choreStarBackground.ignoresSafeArea())
            .navigationTitle("Delete Account")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .disabled(isDeleting)
                }
            }
            .interactiveDismissDisabled(isDeleting)
            .task {
                billedThroughApple = await StoreKitManager.shared.hasActiveAppleSubscription()
            }
            .alert("Account deleted", isPresented: $billingWarning) {
                Button("OK") { dismiss() }
            } message: {
                Text("Your account is gone, but we couldn't confirm your subscription was cancelled. Please email hi@chorestar.app so we can check your billing.")
            }
        }
    }

    private static let deletedItems = [
        "Your login and profile",
        "Every child, including their avatars and PINs",
        "All chores and your family's completion history",
        "All routines and their step-by-step history",
        "Allowance and earnings totals",
        "Achievement badges and streaks",
        "Family sharing and your kid login code",
    ]

    private var header: some View {
        VStack(alignment: .leading, spacing: 10) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 34))
                .foregroundColor(.choreStarDanger)

            Text("This permanently deletes your account")
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(.choreStarTextPrimary)
                .fixedSize(horizontal: false, vertical: true)

            Text("Your family's chore data is erased from our servers and can't be recovered. There's no way to undo this.")
                .font(.subheadline)
                .foregroundColor(.choreStarTextSecondary)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private func noticeBox(icon: String, text: String) -> some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: icon)
                .foregroundColor(.choreStarAccent)
                .padding(.top, 2)
            Text(text)
                .font(.subheadline)
                .foregroundColor(.choreStarTextPrimary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.choreStarCardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    private var confirmField: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Type \(Self.confirmWord) to confirm")
                .font(.subheadline)
                .fontWeight(.semibold)
                .foregroundColor(.choreStarTextPrimary)

            TextField(Self.confirmWord, text: $confirmation)
                .textInputAutocapitalization(.characters)
                .autocorrectionDisabled()
                .textFieldStyle(.plain)
                .padding(14)
                .background(Color.choreStarCardBackground)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .strokeBorder(canDelete ? Color.choreStarDanger : Color.choreStarTextSecondary.opacity(0.25), lineWidth: 1.5)
                )
                .disabled(isDeleting)
                .accessibilityLabel("Type \(Self.confirmWord) to confirm account deletion")
        }
    }

    private var deleteButton: some View {
        Button(action: performDelete) {
            HStack(spacing: 8) {
                if isDeleting {
                    ProgressView()
                        .tint(.white)
                }
                Text(isDeleting ? "Deleting…" : "Delete My Account")
                    .font(.headline)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            // Enabled: white on #dc2626 rather than the lighter #ef4444, which
            // falls short of 4.5:1 as a filled button. Disabled: dark ink on a
            // pale fill — white on mid-grey was unreadable.
            .foregroundColor(canDelete ? .white : .choreStarTextSecondary)
            .background(canDelete ? Color.choreStarDangerStrong : Color.choreStarTextSecondary.opacity(0.14))
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        }
        .disabled(!canDelete)
    }

    private func performDelete() {
        guard canDelete else { return }
        isDeleting = true
        errorMessage = nil

        Task {
            let result = await manager.deleteAccount(confirmation: Self.confirmWord)
            await MainActor.run {
                isDeleting = false
                switch result {
                case .deleted(let billingCleanupFailed):
                    if billingCleanupFailed {
                        // Hold the sheet open so this can't be missed.
                        billingWarning = true
                    } else {
                        // The manager already cleared auth state, so dismissing
                        // drops the user back on the sign-in screen.
                        dismiss()
                    }
                case .failure(let message):
                    errorMessage = message
                }
            }
        }
    }
}

// MARK: - Rewards & Currency (was web-only)

/// Lets parents edit reward mode, daily/weekly amounts, and currency on device.
/// Writes the same family_settings columns the web Family tab already uses.
struct FamilyRewardsSettingsView: View {
    @EnvironmentObject var manager: SupabaseManager
    @State private var rewardMode: String = "flat"
    @State private var dailyCentsText: String = "7"
    @State private var weeklyCentsText: String = "1"
    @State private var currencyCode: String = "USD"
    @State private var isSaving = false
    @State private var statusMessage: String?

    private let currencies: [(code: String, label: String)] = [
        ("USD", "US Dollar ($)"),
        ("EUR", "Euro (€)"),
        ("GBP", "British Pound (£)"),
        ("CAD", "Canadian Dollar ($)"),
        ("AUD", "Australian Dollar ($)"),
        ("JPY", "Japanese Yen (¥)"),
        ("INR", "Indian Rupee (₹)"),
        ("MXN", "Mexican Peso ($)"),
        ("BRL", "Brazilian Real (R$)"),
        ("CHF", "Swiss Franc (Fr)"),
        ("CNY", "Chinese Yuan (¥)"),
        ("KRW", "Korean Won (₩)"),
    ]

    var body: some View {
        Form {
            Section {
                Picker("Reward mode", selection: $rewardMode) {
                    Text("Daily flat rate").tag("flat")
                    Text("Per chore").tag("per_chore")
                }
                .pickerStyle(.segmented)
            } footer: {
                Text(rewardMode == "per_chore"
                       ? "Kids earn the amount on each chore they finish."
                       : "Kids earn the daily amount when they finish every chore for the day.")
            }

            Section {
                HStack {
                    Text(rewardMode == "per_chore" ? "Default chore" : "Daily reward")
                    Spacer()
                    TextField("7", text: $dailyCentsText)
                        .keyboardType(.numberPad)
                        .multilineTextAlignment(.trailing)
                        .frame(width: 80)
                    Text("¢")
                        .foregroundColor(.choreStarTextSecondary)
                }
                HStack {
                    Text("Weekly bonus")
                    Spacer()
                    TextField("1", text: $weeklyCentsText)
                        .keyboardType(.numberPad)
                        .multilineTextAlignment(.trailing)
                        .frame(width: 80)
                    Text("¢")
                        .foregroundColor(.choreStarTextSecondary)
                }
            } header: {
                Text("Amounts (cents)")
            } footer: {
                Text("Enter amounts in cents — e.g. 100 = \(manager.formatMoney(1.0)). Synced with the web app.")
            }

            Section("Currency") {
                Picker("Currency", selection: $currencyCode) {
                    ForEach(currencies, id: \.code) { item in
                        Text(item.label).tag(item.code)
                    }
                }
            }

            Section {
                Button {
                    Task { await save() }
                } label: {
                    HStack {
                        if isSaving { ProgressView() }
                        Text(isSaving ? "Saving…" : "Save Rewards")
                            .fontWeight(.semibold)
                    }
                    .frame(maxWidth: .infinity)
                }
                .disabled(isSaving)

                if let statusMessage {
                    Text(statusMessage)
                        .font(.caption)
                        .foregroundColor(statusMessage.contains("Saved") ? .choreStarSuccess : .red)
                }
            }
        }
        .navigationTitle("Rewards & Currency")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear { loadFromSettings() }
        .onChange(of: manager.familySettings?.id) { _, _ in loadFromSettings() }
    }

    private func loadFromSettings() {
        guard let s = manager.familySettings else { return }
        rewardMode = s.rewardMode ?? "flat"
        dailyCentsText = String(s.dailyRewardCents)
        weeklyCentsText = String(s.weeklyBonusCents)
        currencyCode = s.currencyCode ?? "USD"
    }

    private func save() async {
        let daily = Int(dailyCentsText.filter(\.isNumber)) ?? 7
        let weekly = Int(weeklyCentsText.filter(\.isNumber)) ?? 0
        isSaving = true
        statusMessage = nil
        let err = await manager.updateFamilyRewards(
            rewardMode: rewardMode,
            dailyRewardCents: max(0, daily),
            weeklyBonusCents: max(0, weekly),
            currencyCode: currencyCode
        )
        await MainActor.run {
            isSaving = false
            statusMessage = err ?? "Saved — synced with the web app."
            if err == nil { Haptics.success() }
        }
    }
}

