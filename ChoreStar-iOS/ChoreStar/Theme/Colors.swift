import SwiftUI

extension Color {
    // Brand colors matching web app - Playful coral/pink palette! 🎨
    static let choreStarPrimary = Color(red: 1.0, green: 0.42, blue: 0.42)      // #ff6b6b (Coral Red)
    static let choreStarPrimaryLight = Color(red: 1.0, green: 0.54, blue: 0.54) // #ff8a8a (Lighter coral)
    static let choreStarSecondary = Color(red: 0.18, green: 0.84, blue: 0.45)   // #2ed573 (Success Green)
    static let choreStarAccent = Color(red: 1.0, green: 0.65, blue: 0.01)       // #ffa502 (Warning Orange)
    static let choreStarSuccess = Color(red: 0.18, green: 0.84, blue: 0.45)     // #2ed573 (Green)
    static let choreStarWarning = Color(red: 1.0, green: 0.65, blue: 0.01)      // #ffa502 (Orange)
    static let choreStarDanger = Color(red: 1.0, green: 0.28, blue: 0.34)       // #ff4757 (Error Red)
    
    // UI colors
    static let choreStarBackground = Color(red: 0.96, green: 0.97, blue: 0.98)  // #f5f7fa
    static let choreStarCardBackground = Color.white
    static let choreStarTextPrimary = Color(red: 0.13, green: 0.13, blue: 0.13) // #212121
    static let choreStarTextSecondary = Color(red: 0.46, green: 0.46, blue: 0.46) // #757575
    
    // Playful Gradients matching web app 🌈
    static var choreStarGradient: LinearGradient {
        LinearGradient(
            colors: [Color.choreStarPrimary, Color.choreStarPrimaryLight],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }
    
    static var choreStarSuccessGradient: LinearGradient {
        LinearGradient(
            colors: [Color.choreStarSuccess, Color(red: 0.09, green: 0.75, blue: 0.92)], // #2ed573 to #17c0eb
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }
    
    static var choreStarWarningGradient: LinearGradient {
        LinearGradient(
            colors: [Color.choreStarWarning, Color(red: 1.0, green: 0.84, blue: 0.0)], // #ffa502 to #ffd700
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }
    
    // Child-specific playful gradients 🎨
    static var childGradient1: LinearGradient {
        LinearGradient(
            colors: [Color(red: 1.0, green: 0.6, blue: 0.62), Color(red: 0.996, green: 0.812, blue: 0.937)], // #ff9a9e to #fecfef
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }
    
    static var childGradient2: LinearGradient {
        LinearGradient(
            colors: [Color(red: 0.659, green: 0.929, blue: 0.918), Color(red: 0.996, green: 0.839, blue: 0.89)], // #a8edea to #fed6e3
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }
    
    static var childGradient3: LinearGradient {
        LinearGradient(
            colors: [Color(red: 1.0, green: 0.925, blue: 0.824), Color(red: 0.988, green: 0.714, blue: 0.624)], // #ffecd2 to #fcb69f
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }
    
    static var childGradient4: LinearGradient {
        LinearGradient(
            colors: [Color(red: 0.659, green: 0.792, blue: 0.729), Color(red: 0.365, green: 0.306, blue: 0.459)], // #a8caba to #5d4e75
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }
    
    static let childGradients: [LinearGradient] = [
        childGradient1, childGradient2, childGradient3, childGradient4
    ]
    
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
