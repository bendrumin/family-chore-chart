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
    
    // MARK: - Themed Colors
    
    var accentColor: Color {
        activeTheme?.primaryColor ?? .choreStarPrimary
    }
    
    var gradient: LinearGradient {
        activeTheme?.gradient ?? Color.choreStarGradient
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
