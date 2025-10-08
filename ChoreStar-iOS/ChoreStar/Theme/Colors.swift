import SwiftUI

extension Color {
    // Brand colors matching web app
    static let choreStarPrimary = Color(red: 0.4, green: 0.49, blue: 0.92)      // #667eea
    static let choreStarPrimaryLight = Color(red: 0.49, green: 0.58, blue: 0.95) // Lighter shade
    static let choreStarSecondary = Color(red: 0.46, green: 0.82, blue: 0.96)   // #76d1f5
    static let choreStarAccent = Color(red: 1.0, green: 0.76, blue: 0.03)       // #ffc107
    static let choreStarSuccess = Color(red: 0.3, green: 0.69, blue: 0.31)      // #4caf50
    static let choreStarWarning = Color(red: 1.0, green: 0.6, blue: 0.0)        // #ff9800
    static let choreStarDanger = Color(red: 0.96, green: 0.26, blue: 0.21)      // #f44336
    
    // UI colors
    static let choreStarBackground = Color(red: 0.96, green: 0.97, blue: 0.98)  // #f5f7fa
    static let choreStarCardBackground = Color.white
    static let choreStarTextPrimary = Color(red: 0.13, green: 0.13, blue: 0.13) // #212121
    static let choreStarTextSecondary = Color(red: 0.46, green: 0.46, blue: 0.46) // #757575
    
    // Gradients
    static let choreStarGradient = LinearGradient(
        colors: [Color.choreStarPrimary, Color.choreStarSecondary],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
    
    static let choreStarAccentGradient = LinearGradient(
        colors: [Color.choreStarAccent, Color(red: 1.0, green: 0.85, blue: 0.2)],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
    
    static let choreStarSuccessGradient = LinearGradient(
        colors: [Color.choreStarSuccess, Color(red: 0.4, green: 0.8, blue: 0.4)],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
    
    // Map string color names to actual colors
    static func fromString(_ colorName: String) -> Color {
        switch colorName.lowercased() {
        // Basic colors
        case "red": return .red
        case "blue": return .blue
        case "green": return .green
        case "orange": return .orange
        case "purple": return .purple
        case "pink": return .pink
        case "yellow": return .yellow
        case "teal": return .teal
        case "indigo": return .indigo
        case "mint": return .mint
        case "cyan": return .cyan
        case "brown": return .brown
        case "gray", "grey": return .gray
        
        // Extended colors
        case "lime": return Color(red: 0.5, green: 1.0, blue: 0.0)
        case "magenta": return Color(red: 1.0, green: 0.0, blue: 1.0)
        case "coral": return Color(red: 1.0, green: 0.5, blue: 0.31)
        case "turquoise": return Color(red: 0.25, green: 0.88, blue: 0.82)
        case "lavender": return Color(red: 0.9, green: 0.9, blue: 0.98)
        case "peach": return Color(red: 1.0, green: 0.8, blue: 0.6)
        case "sky": return Color(red: 0.53, green: 0.81, blue: 0.92)
        case "rose": return Color(red: 1.0, green: 0.0, blue: 0.5)
        case "emerald": return Color(red: 0.31, green: 0.78, blue: 0.47)
        case "gold": return Color(red: 1.0, green: 0.84, blue: 0.0)
        case "navy": return Color(red: 0.0, green: 0.0, blue: 0.5)
        case "maroon": return Color(red: 0.5, green: 0.0, blue: 0.0)
        case "olive": return Color(red: 0.5, green: 0.5, blue: 0.0)
        case "aqua": return Color(red: 0.0, green: 1.0, blue: 1.0)
        case "violet": return Color(red: 0.93, green: 0.51, blue: 0.93)
        case "salmon": return Color(red: 0.98, green: 0.5, blue: 0.45)
        
        default: return .blue
        }
    }

    static let childAvatarColors: [Color] = [
        .red, .blue, .green, .orange, .purple, .pink, 
        .yellow, .teal, .indigo, .mint, .cyan, .brown,
        Color(red: 1.0, green: 0.5, blue: 0.31),  // coral
        Color(red: 0.25, green: 0.88, blue: 0.82), // turquoise
        Color(red: 1.0, green: 0.0, blue: 0.5),    // rose
        Color(red: 0.31, green: 0.78, blue: 0.47)  // emerald
    ]
}
