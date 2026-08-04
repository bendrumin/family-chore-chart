import SwiftUI
import Combine

class ThemeManager: ObservableObject {
    static let shared = ThemeManager()
    
    @AppStorage("seasonalTheme") private var seasonalThemeSetting: String = "auto"
    
    @Published var activeTheme: SeasonalTheme?
    
    private var cancellable: AnyCancellable?
    
    private init() {
        resolveTheme()
        
        cancellable = UserDefaults.standard.publisher(for: \.seasonalTheme)
            .sink { [weak self] _ in
                self?.resolveTheme()
            }
    }
    
    private func resolveTheme() {
        if seasonalThemeSetting == "auto" {
            activeTheme = SeasonalTheme.current()
        } else if seasonalThemeSetting == "none" {
            activeTheme = nil
        } else {
            activeTheme = SeasonalTheme(rawValue: seasonalThemeSetting)
        }
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
