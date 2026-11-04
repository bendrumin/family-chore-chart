import SwiftUI
import Combine

class ThemeManager: ObservableObject {
    static let shared = ThemeManager()
    
    @AppStorage("seasonalTheme") private var seasonalThemeSetting: String = "auto"
    
    @Published var activeTheme: SeasonalTheme?
    
    private var cancellable: AnyCancellable?
    
    private static let customAccentKey = "customAccentHex"

    private init() {
        // Restored before any network call so the accent paints on first frame,
        // and so a standalone kid device keeps the family's color between
        // launches (it has no family_settings to reload it from).
        customAccentHex = UserDefaults.standard.string(forKey: Self.customAccentKey)
        resolveTheme()

        cancellable = UserDefaults.standard.publisher(for: \.seasonalTheme)
            .sink { [weak self] _ in
                self?.resolveTheme()
            }
    }
    
    /// False once the family's Premium has ended (SupabaseManager sets it from
    /// `canUse(.themes)`). A Premium theme they picked stays stored, so it comes
    /// back on resubscribe, but shows only while this is true; same rule as the
    /// web's themeForPlan. True until the profile answers, so subscribers never
    /// see their theme flicker off.
    @Published var premiumThemesAllowed = true {
        didSet { if premiumThemesAllowed != oldValue { resolveTheme() } }
    }

    private func resolveTheme() {
        activeTheme = Self.effectiveTheme(setting: seasonalThemeSetting, premiumAllowed: premiumThemesAllowed)
    }

    /// The theme a family sees for its stored setting. A Premium theme without
    /// Premium falls back to "auto", the default every new family starts on.
    static func effectiveTheme(setting: String, premiumAllowed: Bool, now: Date = Date()) -> SeasonalTheme? {
        if setting == "auto" { return SeasonalTheme.current(date: now) }
        if setting == "none" { return nil }
        guard let picked = SeasonalTheme(rawValue: setting) ?? SeasonalTheme(rawValue: iosSeasonalId(fromWeb: setting)) else { return nil }
        if picked.isPremium && !premiumAllowed { return SeasonalTheme.current(date: now) }
        return picked
    }
    
    /**
     Custom accent, synced with web through family_settings.custom_theme.

     Highest precedence, matching web's resolveActiveTheme: custom accent >
     named theme > auto-seasonal. Published by SupabaseManager after settings
     load and after the picker writes.
     */
    @Published var customAccentHex: String?

    @MainActor
    func applyCustomAccent(_ hex: String?) {
        customAccentHex = hex
        if let hex, !hex.isEmpty {
            UserDefaults.standard.set(hex, forKey: Self.customAccentKey)
        } else {
            UserDefaults.standard.removeObject(forKey: Self.customAccentKey)
        }
    }

    /// The whole shared theme payload at once: accent first (highest
    /// precedence), then the seasonal preference. Used by kid mode, which gets
    /// the family's theme from /api/kid/child rather than family_settings.
    @MainActor
    func apply(customTheme theme: CustomThemePayload?) {
        applyCustomAccent(theme?.accentColor)
        applySeasonalFromCustomTheme(theme)
    }

    /// "#rrggbb" for the current accent, for surfaces that cannot take a Color
    /// (the widget snapshot, Live Activity attributes).
    var accentHex: String? { accentColor.hexRGBString }
    var secondaryHex: String? { secondaryColor.hexRGBString }

    /**
     Apply seasonal preference from the shared custom_theme JSON.

     Web shape: `{ autoSeasonal: bool, seasonalTheme: string|null }`.
     iOS AppStorage: "auto" | "none" | SeasonalTheme.rawValue.
     */
    @MainActor
    func applySeasonalFromCustomTheme(_ theme: CustomThemePayload?) {
        guard let theme else { return }
        let next: String
        if theme.autoSeasonal == true {
            next = "auto"
        } else if let id = theme.seasonalTheme, !id.isEmpty {
            next = Self.iosSeasonalId(fromWeb: id)
        } else {
            next = "none"
        }
        guard next != seasonalThemeSetting else {
            resolveTheme()
            return
        }
        seasonalThemeSetting = next
        resolveTheme()
    }

    /// Web uses camelCase for a couple of ids (`stPatricks`, `newYear`).
    static func iosSeasonalId(fromWeb id: String) -> String {
        switch id.lowercased() {
        case "stpatricks": return SeasonalTheme.stpatricks.rawValue
        case "newyear": return SeasonalTheme.newYear.rawValue
        default:
            if let match = SeasonalTheme.allCases.first(where: { $0.rawValue.lowercased() == id.lowercased() }) {
                return match.rawValue
            }
            return id
        }
    }

    /// Persist the id web's appearance tab already understands.
    static func webSeasonalId(fromIOS id: String) -> String {
        switch id.lowercased() {
        case "stpatricks": return "stPatricks"
        case "newyear": return "newYear"
        default: return id
        }
    }

    private var customAccent: Color? {
        customAccentHex.flatMap { Color(hexString: $0) }
    }

    // MARK: - Themed Colors
    
    var accentColor: Color {
        customAccent ?? activeTheme?.primaryColor ?? .choreStarPrimary
    }

    var primaryColor: Color {
        customAccent ?? activeTheme?.primaryColor ?? .choreStarPrimary
    }

    var secondaryColor: Color {
        customAccent ?? activeTheme?.secondaryColor ?? .choreStarPurple
    }
    
    var gradient: LinearGradient {
        // A custom accent renders as a solid fill — the professional look the
        // web landed on — via a single-color "gradient" so every consumer of
        // this property keeps working unchanged.
        if let c = customAccent {
            return LinearGradient(colors: [c, c], startPoint: .topLeading, endPoint: .bottomTrailing)
        }
        return activeTheme?.gradient ?? Color.choreStarGradient
    }
    
    var themeEmoji: String? {
        activeTheme?.emoji
    }
}

// Allow UserDefaults KVO observation of the seasonalTheme key
extension UserDefaults {
    @objc dynamic var seasonalTheme: String {
        string(forKey: "seasonalTheme") ?? "auto"
    }
}
