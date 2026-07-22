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
        .onChange(of: progress) { newValue in
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
        .appCard(padding: 14)
    }
}
