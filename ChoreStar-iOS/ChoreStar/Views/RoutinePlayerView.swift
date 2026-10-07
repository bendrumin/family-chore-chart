import SwiftUI

struct RoutinePlayerView: View {
    @EnvironmentObject var manager: SupabaseManager
    @Environment(\.dismiss) var dismiss
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    
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
                
                GeometryReader { geo in
                    if horizontalSizeClass == .regular && geo.size.width >= 700 {
                        twoPages(seam: Self.seam(in: geo))
                    } else {
                        VStack(spacing: 0) {
                            headerSection()

                            Spacer()

                            if let step = currentStep {
                                stepContent(step)
                            }

                            Spacer()

                            actionButton
                        }
                        // One readable column on iPads too narrow for two
                        // pages; the gradient behind it runs edge to edge.
                        .frame(maxWidth: 560)
                        .frame(maxWidth: .infinity)
                    }
                }
            }
            .onAppear {
                startTime = Date()
                startTimerIfNeeded()

                let childName = manager.children.first(where: { $0.id == childId })?.name
                    ?? manager.currentChild?.name
                    ?? "Kid"
                RoutineActivityController.shared.start(routine: routine, childName: childName)
            }
            .onDisappear {
                stepTimer?.invalidate()
                RoutineActivityController.shared.end()
            }
        }
    }
    
    // MARK: - Two pages (wide screens)

    /// An open iPhone Duo or an iPad: the step on the left page, the
    /// checklist and the Done button on the right. Propped up half-folded on
    /// a counter, the seam is the fold itself, so nothing a kid has to read
    /// or tap sits on the hinge.
    private func twoPages(seam: (leading: CGFloat, trailing: CGFloat)) -> some View {
        HStack(spacing: 0) {
            VStack(spacing: 0) {
                headerSection(onCard: false)
                Spacer()
                if let step = currentStep {
                    stepContent(step)
                }
                Spacer()
            }
            .frame(width: seam.leading)

            Color.clear.frame(width: seam.trailing - seam.leading)

            VStack(spacing: 16) {
                stepChecklist
                actionButton
            }
            .frame(maxWidth: .infinity)
        }
    }

    /// Where the pages part. On iOS 27.1 an active, vertical division region
    /// is the Duo's fold (half-open, like a book); otherwise split the middle.
    /// Regions can be empty on the first geometry pass, which is fine: the
    /// GeometryReader re-evaluates when they arrive.
    private static func seam(in geo: GeometryProxy) -> (leading: CGFloat, trailing: CGFloat) {
        #if canImport(SwiftUICore, _version: 8.0.85)
        if #available(iOS 27.1, *) {
            let fold = geo.reservedRegions(kind: .division)
                .first { $0.isActive && $0.frame.height > $0.frame.width }
            if let fold {
                return (fold.frame.minX, fold.frame.maxX)
            }
        }
        #endif
        let mid = geo.size.width / 2
        return (mid - 12, mid + 12)
    }

    /// Every step at a glance: done, now, and still to come.
    private var stepChecklist: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Your steps")
                .font(.headline)
                .foregroundColor(.choreStarTextSecondary)

            ScrollView {
                VStack(spacing: 8) {
                    ForEach(Array(routine.steps.enumerated()), id: \.element.id) { index, step in
                        HStack(spacing: 12) {
                            AdaptiveIcon(icon: step.icon, fallbackSymbol: "circle", tint: routineColor, iconSize: 22)
                                .frame(width: 32, height: 32)
                            Text(RoutineTemplate.localizedStepTitle(step.title))
                                .font(.body.weight(index == currentStepIndex ? .bold : .regular))
                                .foregroundColor(index < currentStepIndex ? .choreStarTextSecondary : .choreStarTextPrimary)
                                .strikethrough(index < currentStepIndex)
                                .lineLimit(2)
                            Spacer(minLength: 8)
                            if index < currentStepIndex {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundColor(.choreStarSuccess)
                            } else if index == currentStepIndex {
                                Text("Now")
                                    .font(.caption.weight(.bold))
                                    .foregroundColor(.white)
                                    .padding(.horizontal, 10)
                                    .padding(.vertical, 4)
                                    .background(Capsule().fill(routineColor))
                            }
                        }
                        .padding(.horizontal, 14)
                        .padding(.vertical, 10)
                        .background(
                            RoundedRectangle(cornerRadius: 14, style: .continuous)
                                .fill(index == currentStepIndex ? routineColor.opacity(0.12) : Color.choreStarCardBackground)
                        )
                        .accessibilityElement(children: .combine)
                    }
                }
            }
        }
        .padding(.horizontal, 24)
        .padding(.top, 24)
    }

    // MARK: - Header
    
    /// `onCard` false in the two-page layout, where a white bar ending at
    /// the seam read as cut off; there the header sits on the background.
    private func headerSection(onCard: Bool = true) -> some View {
        VStack(spacing: 16) {
            HStack {
                Button(action: { dismiss() }) {
                    Image(systemName: "xmark.circle.fill")
                        .font(.title2)
                        .foregroundColor(.choreStarTextSecondary)
                }
                
                Spacer()
                
                Text(RoutineTemplate.localizedName(routine.name))
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
        .background(onCard ? Color.choreStarCardBackground : Color.clear)
        .shadow(color: .black.opacity(onCard ? 0.05 : 0), radius: 10, x: 0, y: 2)
    }
    
    // MARK: - Step Content
    
    private func stepContent(_ step: RoutineStep) -> some View {
        VStack(spacing: 24) {
            // Step icon
            ZStack {
                Circle()
                    .fill(routineColor.opacity(0.15))
                    .frame(width: 120, height: 120)
                
                AdaptiveIcon(icon: step.icon, fallbackSymbol: "checkmark.circle.fill", tint: routineColor, iconSize: 56)
                    .font(.system(size: 50))
            }
            .scaleEffect(1.0)
            .animation(.spring(response: 0.5, dampingFraction: 0.6), value: currentStepIndex)
            
            // Step title
            Text(RoutineTemplate.localizedStepTitle(step.title))
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
            RoutineActivityController.shared.update(stepIndex: currentStepIndex, step: currentStep)
        } else {
            RoutineActivityController.shared.end()
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
