import SwiftUI

struct RoutinePlayerView: View {
    @EnvironmentObject var manager: SupabaseManager
    @Environment(\.dismiss) var dismiss
    
    let routine: Routine
    let childId: UUID
    
    @State private var currentStepIndex = 0
    @State private var startTime = Date()
    @State private var showCelebration = false
    @State private var timerRemaining: Int?
    @State private var timerActive = false
    @State private var stepTimer: Timer?
    
    private var currentStep: RoutineStep? {
        guard currentStepIndex < routine.steps.count else { return nil }
        return routine.steps[currentStepIndex]
    }
    
    private var progress: Double {
        guard !routine.steps.isEmpty else { return 0 }
        return Double(currentStepIndex) / Double(routine.steps.count)
    }
    
    private var routineColor: Color {
        Color.fromHex(routine.color)
    }
    
    var body: some View {
        if showCelebration {
            RoutineCelebrationView(
                routine: routine,
                childId: childId,
                stepsCompleted: routine.steps.count,
                durationSeconds: Int(Date().timeIntervalSince(startTime))
            )
        } else {
            ZStack {
                LinearGradient(
                    colors: [routineColor.opacity(0.1), Color.choreStarBackground],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .ignoresSafeArea()
                
                VStack(spacing: 0) {
                    headerSection
                    
                    Spacer()
                    
                    if let step = currentStep {
                        stepContent(step)
                    }
                    
                    Spacer()
                    
                    actionButton
                }
            }
            .onAppear {
                startTime = Date()
                startTimerIfNeeded()
            }
            .onDisappear {
                stepTimer?.invalidate()
            }
        }
    }
    
    // MARK: - Header
    
    private var headerSection: some View {
        VStack(spacing: 16) {
            HStack {
                Button(action: { dismiss() }) {
                    Image(systemName: "xmark.circle.fill")
                        .font(.title2)
                        .foregroundColor(.choreStarTextSecondary)
                }
                
                Spacer()
                
                Text(routine.name)
                    .font(.headline)
                    .fontWeight(.bold)
                    .foregroundColor(.choreStarTextPrimary)
                
                Spacer()
                
                Text("Step \(currentStepIndex + 1)/\(routine.steps.count)")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(.choreStarTextSecondary)
            }
            .padding(.horizontal, 20)
            .padding(.top, 16)
            
            // Progress dots
            HStack(spacing: 6) {
                ForEach(0..<routine.steps.count, id: \.self) { index in
                    Circle()
                        .fill(index < currentStepIndex ? routineColor :
                                index == currentStepIndex ? routineColor : Color.choreStarTextSecondary.opacity(0.3))
                        .frame(width: index == currentStepIndex ? 12 : 8,
                               height: index == currentStepIndex ? 12 : 8)
                        .animation(.spring(response: 0.3, dampingFraction: 0.7), value: currentStepIndex)
                }
            }
            .padding(.bottom, 8)
            
            // Progress bar
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color.choreStarTextSecondary.opacity(0.2))
                        .frame(height: 6)
                    
                    RoundedRectangle(cornerRadius: 4)
                        .fill(routineColor)
                        .frame(width: geometry.size.width * progress, height: 6)
                        .animation(.spring(response: 0.5, dampingFraction: 0.8), value: progress)
                }
            }
            .frame(height: 6)
            .padding(.horizontal, 20)
        }
        .padding(.bottom, 20)
        .background(Color.choreStarCardBackground)
        .shadow(color: .black.opacity(0.05), radius: 10, x: 0, y: 2)
    }
    
    // MARK: - Step Content
    
    private func stepContent(_ step: RoutineStep) -> some View {
        VStack(spacing: 24) {
            // Step icon
            ZStack {
                Circle()
                    .fill(routineColor.opacity(0.15))
                    .frame(width: 120, height: 120)
                
                Image(systemName: step.icon)
                    .font(.system(size: 50))
                    .foregroundColor(routineColor)
            }
            .scaleEffect(1.0)
            .animation(.spring(response: 0.5, dampingFraction: 0.6), value: currentStepIndex)
            
            // Step title
            Text(step.title)
                .font(.system(size: 28, weight: .bold, design: .rounded))
                .foregroundColor(.choreStarTextPrimary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
            
            if let description = step.description, !description.isEmpty {
                Text(description)
                    .font(.body)
                    .foregroundColor(.choreStarTextSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 40)
            }
            
            // Timer (if step has duration)
            if let remaining = timerRemaining {
                timerDisplay(remaining: remaining)
            }
        }
    }
    
    // MARK: - Timer
    
    private func timerDisplay(remaining: Int) -> some View {
        let minutes = remaining / 60
        let seconds = remaining % 60
        let totalDuration = currentStep?.durationSeconds ?? 1
        let timerProgress = 1.0 - (Double(remaining) / Double(totalDuration))
        
        return VStack(spacing: 8) {
            ZStack {
                Circle()
                    .stroke(Color.choreStarTextSecondary.opacity(0.2), lineWidth: 6)
                    .frame(width: 80, height: 80)
                
                Circle()
                    .trim(from: 0, to: timerProgress)
                    .stroke(routineColor, style: StrokeStyle(lineWidth: 6, lineCap: .round))
                    .frame(width: 80, height: 80)
                    .rotationEffect(.degrees(-90))
                    .animation(.linear(duration: 1), value: timerProgress)
                
                Text(String(format: "%d:%02d", minutes, seconds))
                    .font(.system(size: 20, weight: .bold, design: .monospaced))
                    .foregroundColor(.choreStarTextPrimary)
            }
            
            Text(remaining > 0 ? "Time remaining" : "Time's up!")
                .font(.caption)
                .foregroundColor(.choreStarTextSecondary)
        }
    }
    
    // MARK: - Action Button
    
    private var actionButton: some View {
        VStack(spacing: 12) {
            Button(action: completeStep) {
                HStack(spacing: 12) {
                    Image(systemName: currentStepIndex == routine.steps.count - 1 ? "checkmark.circle.fill" : "arrow.right.circle.fill")
                        .font(.title2)
                    
                    Text(currentStepIndex == routine.steps.count - 1 ? "All Done!" : "Done!")
                        .font(.title2)
                        .fontWeight(.bold)
                }
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 18)
                .background(routineColor)
                .cornerRadius(16)
                .shadow(color: routineColor.opacity(0.4), radius: 12, x: 0, y: 4)
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 40)
        }
    }
    
    // MARK: - Actions
    
    private func completeStep() {
        let impact = UIImpactFeedbackGenerator(style: .heavy)
        impact.impactOccurred()
        SoundManager.shared.play(.success)
        
        stepTimer?.invalidate()
        timerRemaining = nil
        
        if currentStepIndex < routine.steps.count - 1 {
            withAnimation(.spring(response: 0.5, dampingFraction: 0.8)) {
                currentStepIndex += 1
            }
            startTimerIfNeeded()
        } else {
            withAnimation {
                showCelebration = true
            }
        }
    }
    
    private func startTimerIfNeeded() {
        guard let step = currentStep,
              let duration = step.durationSeconds, duration > 0 else {
            timerRemaining = nil
            return
        }
        
        timerRemaining = duration
        stepTimer?.invalidate()
        stepTimer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { _ in
            if let remaining = timerRemaining, remaining > 0 {
                timerRemaining = remaining - 1
            } else {
                stepTimer?.invalidate()
            }
        }
    }
}

#Preview {
    RoutinePlayerView(
        routine: Routine(
            id: UUID(), childId: UUID(), name: "Morning Routine",
            type: "morning", icon: "sunrise.fill", color: "#f59e0b",
            rewardCents: 7, isActive: true, createdAt: Date(), updatedAt: Date(),
            steps: [
                RoutineStep(id: UUID(), routineId: UUID(), title: "Brush Teeth", description: "Brush for 2 minutes", icon: "mouth.fill", orderIndex: 0, durationSeconds: 120, createdAt: Date()),
                RoutineStep(id: UUID(), routineId: UUID(), title: "Get Dressed", description: nil, icon: "tshirt.fill", orderIndex: 1, durationSeconds: nil, createdAt: Date()),
            ]
        ),
        childId: UUID()
    )
    .environmentObject(SupabaseManager.shared)
}
