import SwiftUI

enum SeasonalTheme: String, CaseIterable, Identifiable {
    case christmas
    case thanksgiving
    case halloween
    case easter
    case valentine
    case stpatricks
    case newYear
    case spring
    case summer
    case fall
    case winter
    case ocean
    case sunset
    case forest
    case aurora
    case coral
    case lavender
    
    var id: String { rawValue }
    
    var displayName: String {
        switch self {
        case .christmas: return "Christmas"
        case .thanksgiving: return "Thanksgiving"
        case .halloween: return "Halloween"
        case .easter: return "Easter"
        case .valentine: return "Valentine's Day"
        case .stpatricks: return "St. Patrick's Day"
        case .newYear: return "New Year"
        case .spring: return "Spring"
        case .summer: return "Summer"
        case .fall: return "Fall"
        case .winter: return "Winter"
        case .ocean: return "Ocean"
        case .sunset: return "Sunset"
        case .forest: return "Forest"
        case .aurora: return "Aurora"
        case .coral: return "Coral"
        case .lavender: return "Lavender"
        }
    }
    
    var emoji: String {
        switch self {
        case .christmas: return "🎄"
        case .thanksgiving: return "🦃"
        case .halloween: return "🎃"
        case .easter: return "🐰"
        case .valentine: return "💕"
        case .stpatricks: return "☘️"
        case .newYear: return "🎉"
        case .spring: return "🌸"
        case .summer: return "☀️"
        case .fall: return "🍂"
        case .winter: return "❄️"
        case .ocean: return "🌊"
        case .sunset: return "🌅"
        case .forest: return "🌲"
        case .aurora: return "🌌"
        case .coral: return "🪸"
        case .lavender: return "💜"
        }
    }
    
    var primaryColor: Color {
        switch self {
        case .christmas: return Color(red: 0.86, green: 0.15, blue: 0.15) // #dc2626
        case .thanksgiving: return Color(red: 0.92, green: 0.53, blue: 0.07) // #ea8811
        case .halloween: return Color(red: 0.97, green: 0.58, blue: 0.02) // #f79307
        case .easter: return Color(red: 0.66, green: 0.33, blue: 0.97) // #a855f7
        case .valentine: return Color(red: 0.93, green: 0.27, blue: 0.55) // #ec4899
        case .stpatricks: return Color(red: 0.13, green: 0.72, blue: 0.31) // #22b84e
        case .newYear: return Color(red: 0.39, green: 0.40, blue: 0.95) // #6366f1
        case .spring: return Color(red: 0.93, green: 0.24, blue: 0.42) // #ee3c6b cherry blossom (web parity)
        case .summer: return Color(red: 0.23, green: 0.60, blue: 0.64) // #3a9aa3 flamingo teal (web parity)
        case .fall: return Color(red: 0.70, green: 0.12, blue: 0.07) // #b31e11 autumn ember (web parity)
        case .winter: return Color(red: 0.10, green: 0.13, blue: 0.69) // #1a22b0 frozen valley (web parity)
        case .ocean: return Color(red: 0.02, green: 0.52, blue: 0.84) // #0284c7
        case .sunset: return Color(red: 0.92, green: 0.30, blue: 0.14) // #ea4c23
        case .forest: return Color(red: 0.08, green: 0.53, blue: 0.32) // #158750
        case .aurora: return Color(red: 0.35, green: 0.18, blue: 0.73) // #592eba
        case .coral: return Color(red: 0.96, green: 0.42, blue: 0.36) // #f56b5b
        case .lavender: return Color(red: 0.58, green: 0.40, blue: 0.87) // #9466dd
        }
    }
    
    var secondaryColor: Color {
        switch self {
        case .christmas: return Color(red: 0.13, green: 0.53, blue: 0.20)  // green accent
        case .thanksgiving: return Color(red: 0.78, green: 0.35, blue: 0.05)
        case .halloween: return Color(red: 0.55, green: 0.14, blue: 0.67)  // purple accent
        case .easter: return Color(red: 0.93, green: 0.47, blue: 0.62)     // pink accent
        case .valentine: return Color(red: 0.85, green: 0.18, blue: 0.38)
        case .stpatricks: return Color(red: 0.08, green: 0.53, blue: 0.22)
        case .newYear: return Color(red: 0.55, green: 0.36, blue: 0.97)    // purple accent
        case .spring: return Color(red: 0.91, green: 0.13, blue: 0.42)     // #e7206b blossom highlight
        case .summer: return Color(red: 0.93, green: 0.44, blue: 0.44)     // #ed706f flamingo coral
        case .fall: return Color(red: 0.98, green: 0.42, blue: 0.09)       // #fa6a18 vivid orange
        case .winter: return Color(red: 0.18, green: 0.49, blue: 0.78)     // #2f7cc6 glacier blue
        case .ocean: return Color(red: 0.04, green: 0.36, blue: 0.65)
        case .sunset: return Color(red: 0.96, green: 0.62, blue: 0.04)     // amber accent
        case .forest: return Color(red: 0.05, green: 0.38, blue: 0.22)
        case .aurora: return Color(red: 0.12, green: 0.67, blue: 0.55)     // teal accent
        case .coral: return Color(red: 0.96, green: 0.62, blue: 0.04)
        case .lavender: return Color(red: 0.40, green: 0.25, blue: 0.70)
        }
    }
    
    var gradient: LinearGradient {
        LinearGradient(
            colors: [primaryColor, secondaryColor],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }
    
    var isPremium: Bool {
        switch self {
        case .ocean, .sunset, .forest, .aurora, .coral, .lavender:
            return true
        default:
            return false
        }
    }
    
    // Date range (MM-dd)
    var startDate: (month: Int, day: Int) {
        switch self {
        case .christmas: return (12, 1)
        case .thanksgiving: return (11, 20)
        case .halloween: return (10, 1)
        case .easter: return (4, 1)
        case .valentine: return (2, 10)
        case .stpatricks: return (3, 10)
        case .newYear: return (1, 1)
        case .spring: return (3, 1)
        case .summer: return (6, 1)
        case .fall: return (9, 1)
        case .winter: return (12, 1)
        default: return (1, 1)
        }
    }
    
    var endDate: (month: Int, day: Int) {
        switch self {
        case .christmas: return (12, 31)
        case .thanksgiving: return (11, 30)
        case .halloween: return (10, 31)
        case .easter: return (4, 30)
        case .valentine: return (2, 15)
        case .stpatricks: return (3, 18)
        case .newYear: return (1, 7)
        case .spring: return (5, 31)
        case .summer: return (8, 31)
        case .fall: return (11, 30)
        case .winter: return (2, 28)
        default: return (12, 31)
        }
    }
    
    static func current() -> SeasonalTheme? {
        let calendar = Calendar.current
        let now = Date()
        let month = calendar.component(.month, from: now)
        let day = calendar.component(.day, from: now)
        
        // Holiday themes take priority (check specific holidays first)
        let holidays: [SeasonalTheme] = [.christmas, .thanksgiving, .halloween, .easter, .valentine, .stpatricks, .newYear]
        for theme in holidays {
            if isDateInRange(month: month, day: day, start: theme.startDate, end: theme.endDate) {
                return theme
            }
        }
        
        // Fall back to seasonal
        let seasons: [SeasonalTheme] = [.spring, .summer, .fall, .winter]
        for theme in seasons {
            if isDateInRange(month: month, day: day, start: theme.startDate, end: theme.endDate) {
                return theme
            }
        }
        
        return nil
    }
    
    private static func isDateInRange(month: Int, day: Int, start: (month: Int, day: Int), end: (month: Int, day: Int)) -> Bool {
        let dateVal = month * 100 + day
        let startVal = start.month * 100 + start.day
        let endVal = end.month * 100 + end.day
        
        if startVal <= endVal {
            return dateVal >= startVal && dateVal <= endVal
        } else {
            // Wraps around year boundary (e.g., winter: Dec-Feb)
            return dateVal >= startVal || dateVal <= endVal
        }
    }
    
    static var holidayThemes: [SeasonalTheme] {
        [.christmas, .halloween, .easter, .valentine, .stpatricks, .thanksgiving, .newYear]
    }
    
    static var seasonThemes: [SeasonalTheme] {
        [.spring, .summer, .fall, .winter]
    }
    
    static var premiumThemes: [SeasonalTheme] {
        [.ocean, .sunset, .forest, .aurora, .coral, .lavender]
    }
}
