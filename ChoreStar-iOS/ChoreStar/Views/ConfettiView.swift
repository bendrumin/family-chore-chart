import SwiftUI

struct ConfettiView: View {
    @State private var confettiPieces: [ConfettiPiece] = []
    @State private var isAnimating = false
    
    var body: some View {
        GeometryReader { geometry in
            ZStack {
                ForEach(confettiPieces) { piece in
                    ConfettiShape(type: piece.type)
                        .fill(piece.color)
                        .frame(width: piece.size, height: piece.size)
                        .position(x: piece.x, y: piece.y)
                        .rotationEffect(.degrees(piece.rotation))
                        .opacity(piece.opacity)
                }
            }
            .onAppear {
                generateConfetti(in: geometry.size)
            }
        }
        .allowsHitTesting(false)
    }
    
    private func generateConfetti(in size: CGSize) {
        let colors: [Color] = [
            .choreStarPrimary,
            .choreStarSuccess,
            .choreStarAccent,
            .pink,
            .yellow,
            .purple,
            .cyan
        ]
        
        let shapes: [ConfettiType] = [.circle, .square, .triangle, .star]
        
        confettiPieces = (0..<60).map { i in
            let xOffset = CGFloat.random(in: -50...50)
            let baseX = size.width / 2 + xOffset
            
            return ConfettiPiece(
                id: i,
                type: shapes.randomElement()!,
                color: colors.randomElement()!,
                size: CGFloat.random(in: 8...16),
                x: baseX,
                y: -20,
                rotation: Double.random(in: 0...360),
                opacity: 1.0
            )
        }
        
        // Animate each piece
        for (index, var piece) in confettiPieces.enumerated() {
            let delay = Double.random(in: 0...0.3)
            let duration = Double.random(in: 1.5...2.5)
            let horizontalMovement = CGFloat.random(in: -100...100)
            let verticalDistance = size.height + 50
            
            withAnimation(.easeOut(duration: duration).delay(delay)) {
                piece.y = verticalDistance
                piece.x = piece.x + horizontalMovement
                piece.rotation += Double.random(in: 360...720)
                piece.opacity = 0.0
                
                if index < confettiPieces.count {
                    confettiPieces[index] = piece
                }
            }
        }
    }
}

struct ConfettiPiece: Identifiable {
    let id: Int
    let type: ConfettiType
    let color: Color
    let size: CGFloat
    var x: CGFloat
    var y: CGFloat
    var rotation: Double
    var opacity: Double
}

enum ConfettiType {
    case circle, square, triangle, star
}

struct ConfettiShape: Shape {
    let type: ConfettiType
    
    func path(in rect: CGRect) -> Path {
        switch type {
        case .circle:
            return Path(ellipseIn: rect)
            
        case .square:
            return Path(rect)
            
        case .triangle:
            var path = Path()
            path.move(to: CGPoint(x: rect.midX, y: rect.minY))
            path.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY))
            path.addLine(to: CGPoint(x: rect.minX, y: rect.maxY))
            path.closeSubpath()
            return path
            
        case .star:
            var path = Path()
            let center = CGPoint(x: rect.midX, y: rect.midY)
            let outerRadius = min(rect.width, rect.height) / 2
            let innerRadius = outerRadius * 0.4
            let angleIncrement = .pi / 5
            
            for i in 0..<10 {
                let angle = -CGFloat.pi / 2 + angleIncrement * CGFloat(i)
                let radius = i.isMultiple(of: 2) ? outerRadius : innerRadius
                let x = center.x + radius * cos(angle)
                let y = center.y + radius * sin(angle)
                
                if i == 0 {
                    path.move(to: CGPoint(x: x, y: y))
                } else {
                    path.addLine(to: CGPoint(x: x, y: y))
                }
            }
            path.closeSubpath()
            return path
        }
    }
}

// Confetti Modifier
struct ConfettiModifier: ViewModifier {
    @Binding var isPresented: Bool
    
    func body(content: Content) -> some View {
        ZStack {
            content
            
            if isPresented {
                ConfettiView()
                    .edgesIgnoringSafeArea(.all)
                    .onAppear {
                        // Auto-dismiss after animation
                        DispatchQueue.main.asyncAfter(deadline: .now() + 2.5) {
                            isPresented = false
                        }
                    }
            }
        }
    }
}

extension View {
    func confetti(isPresented: Binding<Bool>) -> some View {
        self.modifier(ConfettiModifier(isPresented: isPresented))
    }
}

#Preview {
    VStack {
        Text("Tap to celebrate!")
            .font(.title)
    }
    .confetti(isPresented: .constant(true))
}

