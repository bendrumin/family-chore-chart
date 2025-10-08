import SwiftUI

extension Color {
    // Using standard SwiftUI colors for immediate compatibility
    static let choreStarPrimary = Color.purple
    static let choreStarSecondary = Color.cyan
    static let choreStarAccent = Color.orange
    static let choreStarSuccess = Color.green
    static let choreStarBackground = Color(.systemGroupedBackground)
    static let choreStarCardBackground = Color(.secondarySystemGroupedBackground)
    static let choreStarTextPrimary = Color(.label)
    static let choreStarTextSecondary = Color(.secondaryLabel)
    
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
