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
        default: return .blue
        }
    }

    static let childAvatarColors: [Color] = [
        .red, .blue, .green, .orange, .purple, .pink, .yellow, .teal
    ]
}
