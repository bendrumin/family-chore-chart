import SwiftUI

extension Color {
    // Brand colors matching web app (indigo/purple palette)
    static let choreStarPrimary = Color(red: 0.388, green: 0.400, blue: 0.945)      // #6366f1 (Indigo)

    /// The solid accent fill for buttons, pills, and selected controls that
    /// carry white text. Matches the web's --primary-fill. #6366f1 is only
    /// ~4.1:1 against white — short of WCAG AA (4.5:1) — so filled controls
    /// use this darker step instead. See docs/DESIGN.md.
    static let choreStarFill = Color(red: 0.369, green: 0.380, blue: 0.898)         // #5e61e5
    /// Pressed/highlighted state of choreStarFill (web --primary-fill-hover).
    static let choreStarFillPressed = Color(red: 0.337, green: 0.353, blue: 0.824)  // #565ad2
    static let choreStarPrimaryLight = Color(red: 0.506, green: 0.549, blue: 0.973) // #818cf8 (Light Indigo)
    static let choreStarPurple = Color(red: 0.545, green: 0.361, blue: 0.965)       // #8b5cf6 (Purple)
    static let choreStarSecondary = Color(red: 0.063, green: 0.725, blue: 0.506)    // #10b981 (Emerald)
    static let choreStarAccent = Color(red: 0.961, green: 0.620, blue: 0.043)       // #f59e0b (Amber)
    static let choreStarSuccess = Color(red: 0.063, green: 0.725, blue: 0.506)      // #10b981 (Emerald)
    static let choreStarWarning = Color(red: 0.961, green: 0.620, blue: 0.043)      // #f59e0b (Amber)
    static let choreStarDanger = Color(red: 0.937, green: 0.267, blue: 0.267)       // #ef4444 (Red)
    /// Darker red for destructive buttons that carry white text. #ef4444 is only
    /// 3.76:1 against white — fine for a tinted label, short of WCAG AA (4.5:1)
    /// for a filled button. This one is 4.83:1.
    static let choreStarDangerStrong = Color(red: 0.863, green: 0.149, blue: 0.149) // #dc2626 (Red 600)

    /// Indigo for tappable text links on app backgrounds. choreStarPrimary
    /// (#6366f1) is 4.46:1 on white — just under WCAG AA — and ~2.2:1 on dark
    /// backgrounds. One Tailwind step deeper than the web's indigo-600/400 so
    /// links stay above 4.5:1 even when a colored button glow tints the
    /// surface behind them.
    static let choreStarLink = Color(UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(red: 0.647, green: 0.706, blue: 0.988, alpha: 1) // #a5b4fc (Indigo 300)
            : UIColor(red: 0.263, green: 0.220, blue: 0.792, alpha: 1) // #4338ca (Indigo 700)
    })

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

    // Map string color names OR hex (#rrggbb) to colors.
    // Web stores avatar_color as hex; iOS historically used names. Accept both
    // so a pink child set on the website doesn't collapse to blue on iPhone.
    static func fromString(_ colorName: String) -> Color {
        let trimmed = colorName.trimmingCharacters(in: .whitespacesAndNewlines)
        if let hex = Color(hexString: trimmed) {
            return hex
        }
        switch trimmed.lowercased() {
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


// MARK: - Hex round-trip (custom accent sync with web)

extension Color {
    /// Parses "#rrggbb" (case-insensitive, # optional). The custom accent is
    /// stored as hex in family_settings.custom_theme so web and iOS share it.
    init?(hexString: String) {
        var v = hexString.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if v.hasPrefix("#") { v.removeFirst() }
        guard v.count == 6, let n = UInt32(v, radix: 16) else { return nil }
        self.init(
            red: Double((n >> 16) & 0xff) / 255.0,
            green: Double((n >> 8) & 0xff) / 255.0,
            blue: Double(n & 0xff) / 255.0
        )
    }

    /// "#rrggbb" for storage. sRGB-converted first, since a ColorPicker can
    /// hand back Display-P3 values whose components exceed 0...1.
    var hexRGBString: String? {
        let ui = UIColor(self)
        var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
        guard ui.getRed(&r, green: &g, blue: &b, alpha: &a) else { return nil }
        let clamp = { (x: CGFloat) in Int((min(max(x, 0), 1) * 255).rounded()) }
        return String(format: "#%02x%02x%02x", clamp(r), clamp(g), clamp(b))
    }
}

// MARK: - Accent ramp (the web's accent-scale.ts / contrast.ts, also in Android's ColorRamp.kt)
extension Color {
    /// Mix ratio per Tailwind step: toward white below 500, toward black above.
    private static let rampRatios: [Int: Double] = [
        50: 0.935, 100: 0.881, 200: 0.758, 300: 0.573, 400: 0.314,
        500: 0, 600: 0.189, 700: 0.312, 800: 0.433, 900: 0.506,
    ]

    private var srgbComponents: (r: Double, g: Double, b: Double) {
        let ui = UIColor(self)
        var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
        guard ui.getRed(&r, green: &g, blue: &b, alpha: &a) else { return (0, 0, 0) }
        let c = { (x: CGFloat) in Double(min(max(x, 0), 1)) }
        return (c(r), c(g), c(b))
    }

    /// Linear mix toward another colour, in sRGB, like the web's `mix`.
    func mixed(toward other: Color, amount: Double) -> Color {
        let a = srgbComponents, b = other.srgbComponents
        return Color(red: a.r + (b.r - a.r) * amount, green: a.g + (b.g - a.g) * amount, blue: a.b + (b.b - a.b) * amount)
    }

    /// The 50→900 step of this colour's ramp (500 is the colour itself).
    func rampStep(_ step: Int) -> Color {
        let ratio = Color.rampRatios[step] ?? 0
        if ratio == 0 { return self }
        return mixed(toward: step < 500 ? .white : .black, amount: ratio)
    }

    var relativeLuminance: Double {
        let c = srgbComponents
        func lin(_ v: Double) -> Double { v <= 0.03928 ? v / 12.92 : pow((v + 0.055) / 1.055, 2.4) }
        return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b)
    }

    func contrastRatio(with other: Color) -> Double {
        let la = relativeLuminance, lb = other.relativeLuminance
        return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)
    }

    /// Moves this colour away from `background` in 5% steps until it reads at `target` (WCAG AA by default).
    func ensuringReadable(on background: Color, target: Double = 4.5) -> Color {
        if contrastRatio(with: background) >= target { return self }
        let toward: Color = background.relativeLuminance > 0.5 ? .black : .white
        var best = self
        for step in 1...20 {
            best = mixed(toward: toward, amount: Double(step) / 20)
            if best.contrastRatio(with: background) >= target { return best }
        }
        return best
    }

    /// Selected-state pair for chips and pills: a pale wash of the accent with dark accent ink in light
    /// mode, the deep step with pale ink in dark mode. Never puts text on a hue that cannot carry it.
    func selectionPair(dark: Bool) -> (fill: Color, ink: Color) {
        if dark {
            let fill = rampStep(800)
            return (fill, rampStep(100).ensuringReadable(on: fill))
        }
        let fill = rampStep(100)
        return (fill, rampStep(800).ensuringReadable(on: fill))
    }
}
