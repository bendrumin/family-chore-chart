import SwiftUI
import UIKit

// MARK: - Haptics

/// Centralized haptic feedback so every interaction feels native.
enum Haptics {
    static func light() {
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
    }

    static func medium() {
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
    }

    static func success() {
        UINotificationFeedbackGenerator().notificationOccurred(.success)
    }

    static func error() {
        UINotificationFeedbackGenerator().notificationOccurred(.error)
    }
}

// MARK: - Progress Ring (Activity-style)

/// An Activity-ring style circular progress indicator with rounded caps.
struct ProgressRing<Center: View>: View {
    let progress: Double // 0...1
    var lineWidth: CGFloat = 10
    var tint: Color = .choreStarPrimary
    @ViewBuilder var center: Center

    @State private var animatedProgress: Double = 0

    var body: some View {
        ZStack {
            Circle()
                .stroke(tint.opacity(0.15), style: StrokeStyle(lineWidth: lineWidth, lineCap: .round))

            Circle()
                .trim(from: 0, to: max(0.001, animatedProgress))
                .stroke(
                    AngularGradient(
                        gradient: Gradient(colors: [tint, tint.opacity(0.7), tint]),
                        center: .center
                    ),
                    style: StrokeStyle(lineWidth: lineWidth, lineCap: .round)
                )
                .rotationEffect(.degrees(-90))

            center
        }
        .onAppear {
            withAnimation(.spring(response: 0.9, dampingFraction: 0.8)) {
                animatedProgress = progress
            }
        }
        .onChange(of: progress) { _, newValue in
            withAnimation(.spring(response: 0.6, dampingFraction: 0.8)) {
                animatedProgress = newValue
            }
        }
    }
}

// MARK: - Quiet Card

/// The app-wide card surface: continuous corners on the grouped background,
/// no drop shadow — like Health / Fitness cards.
struct QuietCardModifier: ViewModifier {
    var padding: CGFloat = 16

    func body(content: Content) -> some View {
        content
            .padding(padding)
            .background(Color.choreStarCardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}

extension View {
    func appCard(padding: CGFloat = 16) -> some View {
        modifier(QuietCardModifier(padding: padding))
    }
}

// MARK: - Section Header

/// Bold inline section header in the style of Health/Fitness.
struct AppSectionHeader: View {
    let title: String
    var trailing: String?

    var body: some View {
        HStack(alignment: .firstTextBaseline) {
            Text(title)
                .font(.title3)
                .fontWeight(.bold)
                .foregroundColor(.choreStarTextPrimary)

            Spacer()

            if let trailing = trailing {
                Text(trailing)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(.choreStarTextSecondary)
            }
        }
    }
}

// MARK: - Avatar Ring Chip (Fitness sharing-style)

/// A child avatar wrapped in their personal progress ring — the Fitness
/// "activity sharing" pattern, one per family member.
struct AvatarRingChip: View {
    let child: Child
    let progress: Double
    let detailText: String

    var body: some View {
        VStack(spacing: 8) {
            ProgressRing(progress: progress, lineWidth: 5, tint: Color.fromString(child.avatarColor)) {
                AvatarView(child: child, size: 58)
            }
            .frame(width: 74, height: 74)

            VStack(spacing: 2) {
                Text(child.name)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(.choreStarTextPrimary)
                    .lineLimit(1)

                Text(detailText)
                    .font(.caption2)
                    .foregroundColor(.choreStarTextSecondary)
            }
        }
        .frame(width: 92)
    }
}

// MARK: - Themed Screen Background (ambient aurora)

/// The app-wide screen backdrop: the grouped background with large, blurred
/// theme-color blobs bleeding in from the corners. Static (no animation), so
/// the blurs render once and cost nothing while scrolling.
struct ThemedScreenBackground: View {
    @EnvironmentObject var themeManager: ThemeManager
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        ZStack {
            Color.choreStarBackground

            GeometryReader { geo in
                let strength = colorScheme == .dark ? 0.30 : 0.28
                ZStack {
                    Circle()
                        .fill(themeManager.primaryColor)
                        .frame(width: geo.size.width * 0.95, height: geo.size.width * 0.95)
                        .blur(radius: 90)
                        .opacity(strength)
                        .offset(x: -geo.size.width * 0.30, y: -geo.size.width * 0.35)

                    Circle()
                        .fill(themeManager.secondaryColor)
                        .frame(width: geo.size.width * 0.85, height: geo.size.width * 0.85)
                        .blur(radius: 100)
                        .opacity(strength * 0.9)
                        .offset(x: geo.size.width * 0.55, y: geo.size.height * 0.10)

                    Circle()
                        .fill(themeManager.primaryColor)
                        .frame(width: geo.size.width * 0.75, height: geo.size.width * 0.75)
                        .blur(radius: 110)
                        .opacity(strength * 0.65)
                        .offset(x: geo.size.width * 0.05, y: geo.size.height * 0.72)
                }
            }
        }
        .ignoresSafeArea()
    }
}

// MARK: - Chore Icon Artwork (OpenMoji line art, CC BY-SA 4.0)

extension String {
    /// Bundled OpenMoji line-art asset for this emoji ("ChoreIcons/1F9F9"),
    /// or nil when no artwork is bundled (callers fall back to the raw emoji).
    var choreIconAssetName: String? {
        let scalars = unicodeScalars.filter { $0.value != 0xFE0F }
        guard !scalars.isEmpty else { return nil }
        let name = "ChoreIcons/" + scalars.map { String(format: "%X", $0.value) }.joined(separator: "-")
        return UIImage(named: name) != nil ? name : nil
    }
}

// MARK: - Adaptive Icon

/// Renders an icon string that may be an emoji (routines/steps created in the
/// web app) or an SF Symbol name (created on iOS), falling back to a symbol
/// when the string is neither.
struct AdaptiveIcon: View {
    let icon: String?
    let fallbackSymbol: String
    var tint: Color = .choreStarPrimary
    /// Set to render bundled OpenMoji line art at this point size (resizable
    /// images ignore .font); leave nil to use emoji/symbol rendering only.
    var iconSize: CGFloat? = nil

    private var emojiIcon: String? {
        guard let icon, let first = icon.unicodeScalars.first else { return nil }
        return (first.properties.isEmoji && !first.isASCII) ? icon : nil
    }

    var body: some View {
        if let iconSize, let asset = icon?.choreIconAssetName {
            Image(asset)
                .renderingMode(.template)
                .resizable()
                .scaledToFit()
                .foregroundColor(tint)
                .frame(width: iconSize, height: iconSize)
        } else if let emojiIcon {
            Text(emojiIcon)
        } else if let icon, !icon.isEmpty, UIImage(systemName: icon) != nil {
            Image(systemName: icon)
                .foregroundColor(tint)
        } else {
            Image(systemName: fallbackSymbol)
                .foregroundColor(tint)
        }
    }
}

// MARK: - Chore Icon Chip

/// A chore's emoji in a softly tinted rounded square, keyed to the child's
/// avatar color — gives every row a spot of identity color.
struct ChoreIconChip: View {
    let icon: String?
    let tint: Color
    var size: CGFloat = 34

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: size * 0.28, style: .continuous)
                .fill(tint.opacity(0.16))

            if let asset = icon?.choreIconAssetName {
                Image(asset)
                    .renderingMode(.template)
                    .resizable()
                    .scaledToFit()
                    .foregroundColor(tint)
                    .padding(size * 0.10)
            } else if let icon, !icon.isEmpty {
                Text(icon)
                    .font(.system(size: size * 0.5))
            } else {
                Image(systemName: "star.fill")
                    .font(.system(size: size * 0.42, weight: .semibold))
                    .foregroundColor(tint)
            }
        }
        .frame(width: size, height: size)
    }
}

// MARK: - Theme Particles (living themes)

/// Ambient particles drifting over a themed surface — snow on Winter,
/// hearts on Valentine's, leaves on Fall. Canvas + TimelineView, ~12
/// glyphs, trivially cheap.
struct ThemeParticleOverlay: View {
    let glyph: String
    var particleCount: Int = 12
    var opacity: Double = 0.5

    /// The particle glyph for a theme, or nil for themes that stay calm.
    static func glyph(for theme: SeasonalTheme?) -> String? {
        switch theme {
        case .christmas, .winter: return "❄️"
        case .valentine: return "💕"
        case .halloween: return "🎃"
        case .stpatricks: return "☘️"
        case .newYear: return "🎊"
        case .easter, .spring: return "🌸"
        case .summer: return "✨"
        case .fall, .thanksgiving: return "🍂"
        case .ocean, .coral: return "🫧"
        case .aurora: return "✦"
        case .forest: return "🍃"
        case .sunset: return "✨"
        case .lavender: return "✿"
        case .none: return nil
        }
    }

    var body: some View {
        TimelineView(.animation(minimumInterval: 1.0 / 30.0)) { timeline in
            Canvas { context, size in
                let time = timeline.date.timeIntervalSinceReferenceDate

                for i in 0..<particleCount {
                    // Deterministic per-particle variation
                    let seed = Double(i)
                    let speed = 0.028 + 0.022 * pseudoRandom(seed, 1)      // fall speed
                    let phase = pseudoRandom(seed, 2)                       // start offset
                    let baseX = pseudoRandom(seed, 3)                       // column
                    let driftAmp = 8.0 + 14.0 * pseudoRandom(seed, 4)       // sway
                    let driftFreq = 0.3 + 0.5 * pseudoRandom(seed, 5)
                    let scale = 0.6 + 0.6 * pseudoRandom(seed, 6)

                    let progress = (time * speed + phase).truncatingRemainder(dividingBy: 1.0)
                    let y = progress * (size.height + 30) - 15
                    let x = baseX * size.width + sin(time * driftFreq + seed) * driftAmp

                    var text = context.resolve(
                        Text(glyph).font(.system(size: 13 * scale))
                    )
                    text.shading = .color(.white)

                    context.opacity = opacity * (0.5 + 0.5 * pseudoRandom(seed, 7))
                    context.draw(text, at: CGPoint(x: x, y: y))
                }
            }
        }
        .allowsHitTesting(false)
    }

    /// Cheap deterministic hash → 0...1 (stable per particle, no RNG state)
    private func pseudoRandom(_ seed: Double, _ salt: Double) -> Double {
        let value = sin(seed * 127.1 + salt * 311.7) * 43758.5453
        return value - value.rounded(.down)
    }
}

// MARK: - Perfect Day Celebration

/// Full-screen moment shown when every chore of the day is done.
struct PerfectDayOverlay: View {
    let onDismiss: () -> Void

    @State private var appeared = false

    var body: some View {
        ZStack {
            Color.black.opacity(0.35)
                .ignoresSafeArea()
                .onTapGesture { onDismiss() }

            VStack(spacing: 16) {
                Text("🌟")
                    .font(.system(size: 84))
                    .scaleEffect(appeared ? 1 : 0.2)
                    .rotationEffect(.degrees(appeared ? 0 : -30))

                Text("Perfect Day!")
                    .font(.system(size: 36, weight: .black, design: .rounded))
                    .foregroundColor(.white)

                Text("Every single chore is done. Amazing!")
                    .font(.headline)
                    .foregroundColor(.white.opacity(0.9))
                    .multilineTextAlignment(.center)
            }
            .padding(40)
            .background(Color.choreStarGradient)
            .clipShape(RoundedRectangle(cornerRadius: 28, style: .continuous))
            .shadow(color: .black.opacity(0.3), radius: 30, y: 10)
            .padding(40)
            .scaleEffect(appeared ? 1 : 0.7)
            .opacity(appeared ? 1 : 0)
        }
        .onAppear {
            withAnimation(.spring(response: 0.5, dampingFraction: 0.65)) {
                appeared = true
            }
            Haptics.success()
            SoundManager.shared.play(.cheer)

            DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
                onDismiss()
            }
        }
        .transition(.opacity)
    }
}

// MARK: - Stat Tile

/// Compact stat tile: tinted SF Symbol chip + rounded value + quiet label.
struct StatTile: View {
    let systemImage: String
    let value: String
    let label: String
    let tint: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Image(systemName: systemImage)
                .font(.subheadline)
                .fontWeight(.semibold)
                .foregroundColor(tint)
                .frame(width: 32, height: 32)
                .background(tint.opacity(0.14))
                .clipShape(Circle())

            VStack(alignment: .leading, spacing: 2) {
                Text(value)
                    .font(.system(.title2, design: .rounded).weight(.bold))
                    .foregroundColor(.choreStarTextPrimary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)

                Text(label)
                    .font(.caption)
                    .foregroundColor(.choreStarTextSecondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(
            ZStack {
                Color.choreStarCardBackground
                tint.opacity(0.10)
            }
        )
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}
