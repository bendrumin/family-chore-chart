import SwiftUI

/// Settings > Appearance: light/dark mode, the theme gallery and the accent
/// colour. These used to sit inline in Settings, where the gallery alone took
/// most of the screen; Settings now shows one summary row that opens this.
struct AppearanceSettingsView: View {
    @EnvironmentObject var manager: SupabaseManager
    @EnvironmentObject var themeManager: ThemeManager
    @Environment(\.colorScheme) var colorScheme
    @AppStorage("darkModePreference") private var darkModePreference: SettingsView.DarkModePreference = .system
    @AppStorage("seasonalTheme") private var seasonalThemeSetting: String = "auto"
    @State private var customAccent: Color = .choreStarPrimary
    @State private var accentSaveTask: Task<Void, Never>?
    @State private var showingPaywall = false

    /// Same ten colours as Android's accent row and the web's picker.
    private static let accentPresets = ["#6366f1", "#8b5cf6", "#ec4899", "#ef4444", "#f97316", "#f59e0b", "#10b981", "#14b8a6", "#0284c7", "#3b82f6"]

    var body: some View {
        Form {
            Section {
                Picker("Mode", selection: $darkModePreference) {
                    ForEach(SettingsView.DarkModePreference.allCases, id: \.self) { preference in
                        Text(LocalizedStringKey(preference.rawValue)).tag(preference)
                    }
                }
                .pickerStyle(.segmented)
            } header: {
                Text("Mode")
            } footer: {
                Text(colorScheme == .dark ? "Showing: Dark" : "Showing: Light")
            }

            Section {
                ThemeGalleryView(
                    selection: $seasonalThemeSetting,
                    isPremiumUser: manager.canUse(.themes),
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
                    Text("Active: \(activeTheme.emoji) \(activeTheme.displayName). Synced with the web app.")
                } else {
                    Text("Theme choice syncs with the web app.")
                }
            }

            Section {
                // The ten preset swatches Android and the web offer; the picker below is for anything else.
                accentSwatches
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
                Text("Synced with the web app. Pick a colour once and every device follows.")
            }
        }
        .navigationTitle("Appearance")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            if let hex = themeManager.customAccentHex, let c = Color(hexString: hex) {
                customAccent = c
            }
        }
        .sheet(isPresented: $showingPaywall) {
            PaywallView(source: "theme_locked")
        }
    }

    private var accentSwatches: some View {
        let current = themeManager.customAccentHex?.lowercased()
        return LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 10), count: 5), spacing: 10) {
            ForEach(Self.accentPresets, id: \.self) { hex in
                let color = Color(hexString: hex) ?? .choreStarPrimary
                let isSelected = current == hex
                Button {
                    Haptics.light()
                    customAccent = color
                } label: {
                    ZStack {
                        Circle().fill(color)
                        if isSelected {
                            Image(systemName: "checkmark")
                                .font(.caption.weight(.bold))
                                .foregroundColor(.white)
                        }
                    }
                    .frame(width: 40, height: 40)
                    .overlay(Circle().strokeBorder(isSelected ? Color.choreStarTextPrimary : Color.clear, lineWidth: 2.5))
                }
                .buttonStyle(PlainButtonStyle())
                .accessibilityLabel(hex)
                .accessibilityAddTraits(isSelected ? .isSelected : [])
            }
        }
        .padding(.vertical, 6)
    }
}

/// The one Settings row that stands in for the whole Appearance screen: a
/// swatch of the current colours and what's in effect.
struct AppearanceSummaryRow: View {
    @EnvironmentObject var themeManager: ThemeManager
    let mode: SettingsView.DarkModePreference

    var body: some View {
        HStack(spacing: 12) {
            RoundedRectangle(cornerRadius: 8)
                .fill(
                    themeManager.customAccentHex != nil
                        ? AnyShapeStyle(themeManager.accentColor)
                        : AnyShapeStyle(themeManager.activeTheme?.gradient ?? Color.choreStarGradient)
                )
                .frame(width: 32, height: 32)
                .overlay(
                    Text(themeManager.activeTheme?.emoji ?? "")
                        .font(.system(size: 15))
                )
            VStack(alignment: .leading, spacing: 2) {
                Text("Appearance")
                    .foregroundColor(.choreStarTextPrimary)
                Text(summary)
                    .font(.caption)
                    .foregroundColor(.choreStarTextSecondary)
                    .lineLimit(1)
            }
        }
        .padding(.vertical, 2)
    }

    private var summary: String {
        let theme: String
        if themeManager.customAccentHex != nil {
            theme = String(localized: "Custom colour")
        } else if let active = themeManager.activeTheme {
            theme = active.displayName
        } else {
            theme = String(localized: "Classic")
        }
        return "\(theme) · \(String(localized: String.LocalizationValue(mode.rawValue)))"
    }
}
