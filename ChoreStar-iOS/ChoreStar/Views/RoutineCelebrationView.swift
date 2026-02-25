import SwiftUI

struct RoutineCelebrationView: View {
    @EnvironmentObject var manager: SupabaseManager
    @Environment(\.dismiss) var dismiss
    
    let routine: Routine
    let childId: UUID
    let stepsCompleted: Int
    let durationSeconds: Int
    
    @State private var showContent = false
    @State private var showConfetti = false
    @State private var saved = false
    
    private var pointsEarned: Int {
        stepsCompleted == routine.steps.count ? routine.rewardCents : 0
    }
    
    private var encouragingMessage: String {
        let messages = [
            "Amazing job! You're a superstar!",
            "Way to go! Keep up the great work!",
            "Fantastic! You crushed it!",
            "Incredible! You're on fire!",
            "Awesome! Your parents will be so proud!",
            "You did it! High five!",
        ]
        return messages.randomElement() ?? messages[0]
    }
    
    private var formattedDuration: String {
        let minutes = durationSeconds / 60
        let seconds = durationSeconds % 60
        if minutes > 0 {
            return "\(minutes)m \(seconds)s"
        }
        return "\(seconds)s"
    }
    
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color.choreStarPrimary.opacity(0.1), Color.choreStarAccent.opacity(0.1)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
            
            if showConfetti {
                ConfettiView()
                    .allowsHitTesting(false)
            }
            
            VStack(spacing: 32) {
                Spacer()
                
                // Star icon
                Image(systemName: "star.fill")
                    .font(.system(size: 80))
                    .foregroundStyle(
                        LinearGradient(
                            colors: [.choreStarAccent, .choreStarPrimary],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .scaleEffect(showContent ? 1.0 : 0.3)
                    .opacity(showContent ? 1 : 0)
                    .animation(.spring(response: 0.6, dampingFraction: 0.5).delay(0.2), value: showContent)
                
                VStack(spacing: 12) {
                    Text("Routine Complete!")
                        .font(.system(size: 32, weight: .bold, design: .rounded))
                        .foregroundColor(.choreStarTextPrimary)
                    
                    Text(encouragingMessage)
                        .font(.headline)
                        .foregroundColor(.choreStarTextSecondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 40)
                }
                .opacity(showContent ? 1 : 0)
                .offset(y: showContent ? 0 : 20)
                .animation(.spring(response: 0.6, dampingFraction: 0.8).delay(0.4), value: showContent)
                
                // Stats
                HStack(spacing: 20) {
                    statCard(icon: "checkmark.circle.fill", value: "\(stepsCompleted)/\(routine.steps.count)", label: "Steps", color: .choreStarSuccess)
                    statCard(icon: "clock.fill", value: formattedDuration, label: "Time", color: .choreStarPrimary)
                    statCard(icon: "star.fill", value: String(format: "$%.2f", Double(pointsEarned) / 100.0), label: "Earned", color: .choreStarAccent)
                }
                .padding(.horizontal, 20)
                .opacity(showContent ? 1 : 0)
                .offset(y: showContent ? 0 : 20)
                .animation(.spring(response: 0.6, dampingFraction: 0.8).delay(0.6), value: showContent)
                
                Spacer()
                
                Button(action: { dismiss() }) {
                    HStack {
                        Image(systemName: "house.fill")
                        Text("Back to Home")
                    }
                    .font(.headline)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(Color.choreStarGradient)
                    .cornerRadius(14)
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 40)
                .opacity(showContent ? 1 : 0)
                .animation(.spring(response: 0.6, dampingFraction: 0.8).delay(0.8), value: showContent)
            }
        }
        .onAppear {
            showContent = true
            showConfetti = true
            SoundManager.shared.play(.cheer)
            
            if !saved {
                saved = true
                Task {
                    try? await manager.completeRoutine(
                        routineId: routine.id,
                        childId: childId,
                        stepsCompleted: stepsCompleted,
                        stepsTotal: routine.steps.count,
                        durationSeconds: durationSeconds
                    )
                }
            }
        }
    }
    
    private func statCard(icon: String, value: String, label: String, color: Color) -> some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(color)
            
            Text(value)
                .font(.system(size: 20, weight: .bold, design: .rounded))
                .foregroundColor(.choreStarTextPrimary)
            
            Text(label)
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundColor(.choreStarTextSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 16)
        .background(Color.choreStarCardBackground)
        .cornerRadius(14)
        .shadow(color: .black.opacity(0.06), radius: 8, x: 0, y: 4)
    }
}

#Preview {
    RoutineCelebrationView(
        routine: Routine(
            id: UUID(), childId: UUID(), name: "Morning Routine",
            type: "morning", icon: "sunrise.fill", color: "#f59e0b",
            rewardCents: 7, isActive: true, createdAt: Date(), updatedAt: Date(),
            steps: []
        ),
        childId: UUID(),
        stepsCompleted: 5,
        durationSeconds: 300
    )
    .environmentObject(SupabaseManager.shared)
}
