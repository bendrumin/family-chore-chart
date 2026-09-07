import SwiftUI

// MARK: - Card Modifier
// Restraint pass (docs/DESIGN.md): hairline shadows only — radius ≤ 6,
// y ≤ 2, opacity ≤ 0.08.
struct CardModifier: ViewModifier {
    var padding: CGFloat = 16
    var shadowRadius: CGFloat = 6
    var shadowY: CGFloat = 2

    func body(content: Content) -> some View {
        content
            .padding(padding)
            .background(Color.choreStarCardBackground)
            .cornerRadius(16)
            .shadow(
                color: Color.black.opacity(0.08),
                radius: shadowRadius,
                x: 0,
                y: shadowY
            )
    }
}

// MARK: - Gradient Button Style
/// Historical name, solid fill. The restraint pass (docs/DESIGN.md) reserves
/// the brand gradient for the seasonal hero and celebrations; primary buttons
/// are flat choreStarFill, darkening to choreStarFillPressed while pressed.
struct GradientButtonStyle: ButtonStyle {
    var fill: Color = .choreStarFill
    var pressedFill: Color = .choreStarFillPressed
    var foregroundColor: Color = .white

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .fontWeight(.semibold)
            .foregroundColor(foregroundColor)
            .padding(.horizontal, 24)
            .padding(.vertical, 14)
            .background(configuration.isPressed ? pressedFill : fill)
            .cornerRadius(12)
            .shadow(color: Color.black.opacity(0.08), radius: 6, x: 0, y: 2)
            .scaleEffect(configuration.isPressed ? 0.96 : 1.0)
            .animation(.spring(response: 0.3, dampingFraction: 0.7), value: configuration.isPressed)
    }
}

// MARK: - Bouncy Scale Effect
struct BouncyPressEffect: ViewModifier {
    var onPress: () -> Void
    @State private var isPressed = false
    
    func body(content: Content) -> some View {
        content
            .scaleEffect(isPressed ? 0.95 : 1.0)
            .animation(.spring(response: 0.3, dampingFraction: 0.6), value: isPressed)
            .simultaneousGesture(
                DragGesture(minimumDistance: 0)
                    .onChanged { _ in
                        if !isPressed {
                            isPressed = true
                            let impactMed = UIImpactFeedbackGenerator(style: .medium)
                            impactMed.impactOccurred()
                        }
                    }
                    .onEnded { _ in
                        isPressed = false
                        onPress()
                    }
            )
    }
}

// MARK: - Shimmer Effect
struct ShimmerModifier: ViewModifier {
    @State private var phase: CGFloat = 0
    var duration: Double = 1.5
    
    func body(content: Content) -> some View {
        content
            .overlay(
                LinearGradient(
                    colors: [
                        .clear,
                        .white.opacity(0.3),
                        .clear
                    ],
                    startPoint: .leading,
                    endPoint: .trailing
                )
                .offset(x: phase)
                .mask(content)
            )
            .onAppear {
                withAnimation(
                    Animation
                        .linear(duration: duration)
                        .repeatForever(autoreverses: false)
                ) {
                    phase = 400
                }
            }
    }
}

// MARK: - Floating Animation
struct FloatingModifier: ViewModifier {
    @State private var isFloating = false
    var offset: CGFloat = 8
    var duration: Double = 2.0
    
    func body(content: Content) -> some View {
        content
            .offset(y: isFloating ? -offset : offset)
            .animation(
                Animation
                    .easeInOut(duration: duration)
                    .repeatForever(autoreverses: true),
                value: isFloating
            )
            .onAppear {
                isFloating = true
            }
    }
}

// MARK: - View Extensions
extension View {
    func cardStyle(padding: CGFloat = 16, shadowRadius: CGFloat = 6, shadowY: CGFloat = 2) -> some View {
        modifier(CardModifier(padding: padding, shadowRadius: shadowRadius, shadowY: shadowY))
    }

    /// Card shadows, all clamped to the hairline budget (radius ≤ 6, y ≤ 2,
    /// opacity ≤ 0.08). The old "playful" indigo glow is retired — glow
    /// effects are out per docs/DESIGN.md.
    func cardShadow(intensity: ShadowIntensity = .medium) -> some View {
        switch intensity {
        case .light:
            return AnyView(self.shadow(color: Color.black.opacity(0.06), radius: 4, x: 0, y: 2))
        case .medium, .heavy, .playful:
            return AnyView(self.shadow(color: Color.black.opacity(0.08), radius: 6, x: 0, y: 2))
        }
    }
    
    func bouncyPress(onPress: @escaping () -> Void) -> some View {
        modifier(BouncyPressEffect(onPress: onPress))
    }
    
    func shimmer(duration: Double = 1.5) -> some View {
        modifier(ShimmerModifier(duration: duration))
    }
    
    func floating(offset: CGFloat = 8, duration: Double = 2.0) -> some View {
        modifier(FloatingModifier(offset: offset, duration: duration))
    }
}

enum ShadowIntensity {
    case light, medium, heavy, playful
}

