import SwiftUI

extension Color {
    // Brand colors matching web app (indigo/purple palette)
    static let choreStarPrimary = Color(red: 0.388, green: 0.400, blue: 0.945)      // #6366f1 (Indigo)
    static let choreStarPrimaryLight = Color(red: 0.506, green: 0.549, blue: 0.973) // #818cf8 (Light Indigo)
    static let choreStarPurple = Color(red: 0.545, green: 0.361, blue: 0.965)       // #8b5cf6 (Purple)
    static let choreStarSecondary = Color(red: 0.063, green: 0.725, blue: 0.506)    // #10b981 (Emerald)
    static let choreStarAccent = Color(red: 0.961, green: 0.620, blue: 0.043)       // #f59e0b (Amber)
    static let choreStarSuccess = Color(red: 0.063, green: 0.725, blue: 0.506)      // #10b981 (Emerald)
    static let choreStarWarning = Color(red: 0.961, green: 0.620, blue: 0.043)      // #f59e0b (Amber)
    static let choreStarDanger = Color(red: 0.937, green: 0.267, blue: 0.267)       // #ef4444 (Red)

    // UI colors (adapt automatically to dark mode)
    static let choreStarBackground = Color(UIColor.systemGroupedBackground)
    static let choreStarCardBackground = Color(UIColor.secondarySystemGroupedBackground)
    static let choreStarTextPrimary = Color(UIColor.label)
    static let choreStarTextSecondary = Color(UIColor.secondaryLabel)

    // Brand gradient (indigo → purple, matching web)
    static var choreStarGradient: LinearGradient {
        LinearGradient(
            colors: [Color.choreStarPrimary, Color.choreStarPurple],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    static var choreStarSuccessGradient: LinearGradient {
        LinearGradient(
            colors: [Color.choreStarSuccess, Color(red: 0.039, green: 0.694, blue: 0.831)], // #10b981 to #0ab1d4
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    static var choreStarWarningGradient: LinearGradient {
        LinearGradient(
            colors: [Color.choreStarWarning, Color(red: 0.976, green: 0.451, blue: 0.086)], // #f59e0b to #f97316
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    // Child-specific playful gradients
    static var childGradient1: LinearGradient {
        LinearGradient(
            colors: [Color(red: 0.506, green: 0.549, blue: 0.973), Color(red: 0.647, green: 0.506, blue: 0.976)], // #818cf8 to #a581f9
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
            colors: [Color(red: 0.388, green: 0.400, blue: 0.945), Color(red: 0.545, green: 0.361, blue: 0.965)], // #6366f1 to #8b5cf6
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
