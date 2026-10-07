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

// MARK: - iPhone Duo fold

/// Where the iPhone Duo folds while half-open (Book pose), for layouts that
/// keep interactive content off the hinge. Apple: "except for scrollable
/// content, keep interactive elements away from the hinge", and in grids
/// "increase the spacing around the hinge, keeping each container within its
/// region."
enum DuoFold {
    /// The active, vertical division region in `proxy`'s coordinates; nil when
    /// flat, closed, or not a Duo. Regions can be empty on the first geometry
    /// pass on iOS 27.1, so callers re-read on change (see `readFold`).
    /// The canImport guard is on the SDK: the iOS 27.0 SDK (SwiftUICore
    /// 8.0.84) has no reserved regions; 27.1 ships 8.0.85.
    static func activeVertical(in proxy: GeometryProxy) -> CGRect? {
        #if canImport(SwiftUICore, _version: 8.0.85)
        if #available(iOS 27.1, *) {
            return proxy.reservedRegions(kind: .division)
                .first { $0.isActive && $0.frame.height > $0.frame.width }?
                .frame
        }
        #endif
        return nil
    }
}

extension View {
    /// Keeps `fold` set to the Duo's active fold in this view's own
    /// coordinates (nil when there is none).
    func readFold(_ fold: Binding<CGRect?>) -> some View {
        background {
            GeometryReader { proxy in
                Color.clear
                    .onAppear { fold.wrappedValue = DuoFold.activeVertical(in: proxy) }
                    .onChange(of: DuoFold.activeVertical(in: proxy)) { _, new in fold.wrappedValue = new }
            }
        }
    }
}

/// Two subviews either side of a fold, in the layout's own coordinates:
/// the first ends `gap` before the fold, the second starts `gap` after it.
/// Used for kid mode's stats row on a half-open iPhone Duo.
struct FoldSplitLayout: Layout {
    var foldMinX: CGFloat
    var foldMaxX: CGFloat
    var gap: CGFloat = 12

    private func widths(total: CGFloat) -> (left: CGFloat, rightX: CGFloat, right: CGFloat) {
        let left = max(0, foldMinX - gap)
        let rightX = foldMaxX + gap
        return (left, rightX, max(0, total - rightX))
    }

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let total = proposal.width ?? 0
        let w = widths(total: total)
        let heights = subviews.enumerated().map { index, view in
            view.sizeThatFits(ProposedViewSize(width: index == 0 ? w.left : w.right, height: proposal.height)).height
        }
        return CGSize(width: total, height: heights.max() ?? 0)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let w = widths(total: bounds.width)
        for (index, view) in subviews.enumerated() where index < 2 {
            view.place(
                at: CGPoint(x: bounds.minX + (index == 0 ? 0 : w.rightX), y: bounds.midY),
                anchor: .leading,
                proposal: ProposedViewSize(width: index == 0 ? w.left : w.right, height: bounds.height)
            )
        }
    }
}

/// A two-column grid whose gutter is the fold: items fill left, right, left,
/// right, row by row, each column ending `gap` short of the hinge. Rows are
/// top-aligned like the LazyVGrids it stands in for while a Duo is half-open.
struct FoldColumnsLayout: Layout {
    var foldMinX: CGFloat
    var foldMaxX: CGFloat
    var gap: CGFloat = 12
    var rowSpacing: CGFloat = 8

    private func columns(_ width: CGFloat) -> (leftWidth: CGFloat, rightX: CGFloat, rightWidth: CGFloat) {
        (max(0, foldMinX - gap), foldMaxX + gap, max(0, width - foldMaxX - gap))
    }

    private func rowHeights(_ subviews: Subviews, width: CGFloat) -> [CGFloat] {
        let c = columns(width)
        return stride(from: 0, to: subviews.count, by: 2).map { i in
            let left = subviews[i].sizeThatFits(ProposedViewSize(width: c.leftWidth, height: nil)).height
            let right = i + 1 < subviews.count
                ? subviews[i + 1].sizeThatFits(ProposedViewSize(width: c.rightWidth, height: nil)).height
                : 0
            return max(left, right)
        }
    }

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let width = proposal.width ?? 0
        let rows = rowHeights(subviews, width: width)
        let height = rows.reduce(0, +) + rowSpacing * CGFloat(max(0, rows.count - 1))
        return CGSize(width: width, height: height)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let c = columns(bounds.width)
        var y = bounds.minY
        for (row, height) in rowHeights(subviews, width: bounds.width).enumerated() {
            let i = row * 2
            subviews[i].place(at: CGPoint(x: bounds.minX, y: y), anchor: .topLeading,
                              proposal: ProposedViewSize(width: c.leftWidth, height: nil))
            if i + 1 < subviews.count {
                subviews[i + 1].place(at: CGPoint(x: bounds.minX + c.rightX, y: y), anchor: .topLeading,
                                      proposal: ProposedViewSize(width: c.rightWidth, height: nil))
            }
            y += height + rowSpacing
        }
    }
}
