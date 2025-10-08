import SwiftUI

struct ChildMainView: View {
    @EnvironmentObject var manager: SupabaseManager
    
    private var childChores: [Chore] {
        guard let child = manager.currentChild else { return [] }
        return manager.chores.filter { $0.childId == child.id }
    }
    
    private var completedChores: [Chore] {
        childChores.filter { manager.isChoreCompleted($0) }
    }
    
    private var pendingChores: [Chore] {
        childChores.filter { !manager.isChoreCompleted($0) }
    }
    
    private var totalEarnings: Double {
        completedChores.reduce(0) { $0 + $1.reward }
    }
    
    var body: some View {
        if let child = manager.currentChild {
            ZStack {
                // Fun background gradient
                LinearGradient(
                    colors: [
                        Color.fromString(child.avatarColor).opacity(0.1),
                        Color.choreStarBackground
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .ignoresSafeArea()
                
                VStack(spacing: 0) {
                    // Header
                    VStack(spacing: 16) {
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Hi, \(child.name)! 👋")
                                    .font(.system(size: 32, weight: .bold, design: .rounded))
                                    .foregroundColor(.choreStarTextPrimary)
                                
                                Text("Let's get some chores done!")
                                    .font(.headline)
                                    .foregroundColor(.choreStarTextSecondary)
                            }
                            
                            Spacer()
                            
                            // Sign out button
                            Button(action: {
                                manager.signOutChild()
                            }) {
                                Image(systemName: "rectangle.portrait.and.arrow.right")
                                    .font(.title3)
                                    .foregroundColor(.choreStarDanger)
                                    .padding(12)
                                    .background(Color.choreStarDanger.opacity(0.1))
                                    .cornerRadius(12)
                            }
                        }
                        .padding(.horizontal, 20)
                        .padding(.top, 20)
                        
                        // Big stats card
                        HStack(spacing: 16) {
                            StatBubble(
                                icon: "checkmark.circle.fill",
                                value: "\(completedChores.count)",
                                label: "Done",
                                color: .choreStarSuccess
                            )
                            
                            StatBubble(
                                icon: "clock.fill",
                                value: "\(pendingChores.count)",
                                label: "To Do",
                                color: .choreStarWarning
                            )
                            
                            StatBubble(
                                icon: "star.fill",
                                value: String(format: "$%.0f", totalEarnings),
                                label: "Earned",
                                color: .choreStarAccent
                            )
                        }
                        .padding(.horizontal, 20)
                    }
                    .padding(.bottom, 20)
                    .background(Color.choreStarCardBackground)
                    .shadow(color: .black.opacity(0.05), radius: 10, x: 0, y: 2)
                    
                    // Chores list
                    ScrollView {
                        VStack(spacing: 24) {
                            // Pending chores
                            if !pendingChores.isEmpty {
                                VStack(alignment: .leading, spacing: 16) {
                                    Text("Your Chores")
                                        .font(.title2)
                                        .fontWeight(.bold)
                                        .foregroundColor(.choreStarTextPrimary)
                                        .padding(.horizontal, 20)
                                    
                                    ForEach(pendingChores) { chore in
                                        BigChoreCard(chore: chore, child: child, manager: manager)
                                            .padding(.horizontal, 20)
                                    }
                                }
                                .padding(.top, 20)
                            }
                            
                            // Completed chores
                            if !completedChores.isEmpty {
                                VStack(alignment: .leading, spacing: 16) {
                                    Text("Completed! 🎉")
                                        .font(.title2)
                                        .fontWeight(.bold)
                                        .foregroundColor(.choreStarSuccess)
                                        .padding(.horizontal, 20)
                                    
                                    ForEach(completedChores) { chore in
                                        BigChoreCard(chore: chore, child: child, manager: manager)
                                            .padding(.horizontal, 20)
                                    }
                                }
                                .padding(.top, 20)
                            }
                            
                            if childChores.isEmpty {
                                VStack(spacing: 20) {
                                    Image(systemName: "party.popper.fill")
                                        .font(.system(size: 60))
                                        .foregroundStyle(Color.choreStarGradient)
                                    
                                    Text("No Chores Yet!")
                                        .font(.title)
                                        .fontWeight(.bold)
                                        .foregroundColor(.choreStarTextPrimary)
                                    
                                    Text("Check back later")
                                        .font(.headline)
                                        .foregroundColor(.choreStarTextSecondary)
                                }
                                .padding(40)
                            }
                            
                            Spacer(minLength: 40)
                        }
                    }
                }
            }
        } else {
            Text("No child selected")
                .foregroundColor(.choreStarTextSecondary)
        }
    }
}

struct StatBubble: View {
    let icon: String
    let value: String
    let label: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title)
                .foregroundColor(color)
            
            Text(value)
                .font(.system(size: 24, weight: .bold, design: .rounded))
                .foregroundColor(.choreStarTextPrimary)
            
            Text(label)
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundColor(.choreStarTextSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 20)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(color.opacity(0.1))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .strokeBorder(color.opacity(0.3), lineWidth: 2)
        )
    }
}

struct BigChoreCard: View {
    let chore: Chore
    let child: Child
    let manager: SupabaseManager
    
    private var isCompleted: Bool {
        manager.isChoreCompleted(chore)
    }
    
    var body: some View {
        Button(action: {
            let impact = UIImpactFeedbackGenerator(style: .heavy)
            impact.impactOccurred()
            Task {
                await manager.toggleChoreCompletion(chore)
            }
        }) {
            VStack(spacing: 16) {
                HStack {
                    // Chore icon (emoji)
                    if let icon = chore.icon {
                        Text(icon)
                            .font(.system(size: 36))
                            .frame(width: 60, height: 60)
                            .background(Color.fromString(chore.color ?? child.avatarColor).opacity(0.15))
                            .cornerRadius(16)
                    }
                    
                    VStack(alignment: .leading, spacing: 6) {
                        Text(chore.name)
                            .font(.title3)
                            .fontWeight(.bold)
                            .foregroundColor(isCompleted ? .choreStarTextSecondary : .choreStarTextPrimary)
                            .strikethrough(isCompleted)
                        
                        if let description = chore.description, !description.isEmpty {
                            Text(description)
                                .font(.subheadline)
                                .foregroundColor(.choreStarTextSecondary)
                                .lineLimit(2)
                        }
                    }
                    
                    Spacer()
                    
                    // Completion checkmark
                    ZStack {
                        Circle()
                            .strokeBorder(
                                isCompleted ? Color.choreStarSuccess : Color.choreStarTextSecondary.opacity(0.3),
                                lineWidth: 3
                            )
                            .frame(width: 40, height: 40)
                        
                        if isCompleted {
                            Image(systemName: "checkmark")
                                .font(.title3)
                                .fontWeight(.bold)
                                .foregroundColor(.choreStarSuccess)
                                .transition(.scale.combined(with: .opacity))
                        }
                    }
                    .animation(.spring(response: 0.4, dampingFraction: 0.6), value: isCompleted)
                }
                
                // Reward
                HStack {
                    Spacer()
                    HStack(spacing: 6) {
                        Image(systemName: "star.fill")
                            .foregroundColor(.choreStarAccent)
                        Text("Earn \(String(format: "$%.2f", chore.reward))")
                            .font(.headline)
                            .fontWeight(.bold)
                            .foregroundColor(.choreStarAccent)
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(Color.choreStarAccent.opacity(0.15))
                    .cornerRadius(12)
                }
            }
            .padding(20)
            .background(
                LinearGradient(
                    colors: [
                        Color.choreStarCardBackground,
                        isCompleted ? Color.choreStarSuccess.opacity(0.08) : Color.choreStarCardBackground
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
            .cornerRadius(20)
            .shadow(color: isCompleted ? Color.choreStarSuccess.opacity(0.15) : Color.black.opacity(0.08), radius: 12, x: 0, y: 4)
            .overlay(
                RoundedRectangle(cornerRadius: 20)
                    .strokeBorder(
                        isCompleted ? Color.choreStarSuccess.opacity(0.4) : Color.fromString(chore.color ?? child.avatarColor).opacity(0.2),
                        lineWidth: 2
                    )
            )
        }
        .buttonStyle(PlainButtonStyle())
        .scaleEffect(isCompleted ? 0.98 : 1.0)
        .animation(.spring(response: 0.4, dampingFraction: 0.7), value: isCompleted)
    }
}

#Preview {
    ChildMainView()
        .environmentObject(SupabaseManager.shared)
}

