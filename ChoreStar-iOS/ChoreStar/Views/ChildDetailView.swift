import SwiftUI

struct ChildDetailView: View {
    let child: Child
    @EnvironmentObject var manager: SupabaseManager
    @Environment(\.dismiss) var dismiss
    @State private var showingAddChore = false
    
    private var childChores: [Chore] {
        manager.chores.filter { $0.childId == child.id }
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
    
    private var completionPercentage: Double {
        guard childChores.count > 0 else { return 0 }
        return Double(completedChores.count) / Double(childChores.count)
    }
    
    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Header with child info
                VStack(spacing: 16) {
                    // Avatar
                    ZStack {
                        Circle()
                            .fill(
                                LinearGradient(
                                    colors: [Color.fromString(child.avatarColor), Color.fromString(child.avatarColor).opacity(0.7)],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                            .frame(width: 100, height: 100)
                            .shadow(color: Color.fromString(child.avatarColor).opacity(0.4), radius: 15, x: 0, y: 8)
                        
                        Text(child.initials)
                            .font(.system(size: 40, weight: .bold, design: .rounded))
                            .foregroundColor(.white)
                    }
                    
                    VStack(spacing: 8) {
                        Text(child.name)
                            .font(.system(size: 32, weight: .bold, design: .rounded))
                            .foregroundColor(.choreStarTextPrimary)
                        
                        Text("Age \(child.age)")
                            .font(.title3)
                            .foregroundColor(.choreStarTextSecondary)
                    }
                    
                    // Stats cards
                    HStack(spacing: 12) {
                        StatCard(
                            icon: "checkmark.circle.fill",
                            value: "\(completedChores.count)",
                            label: "Completed",
                            color: .choreStarSuccess
                        )
                        
                        StatCard(
                            icon: "clock.fill",
                            value: "\(pendingChores.count)",
                            label: "Pending",
                            color: .choreStarWarning
                        )
                        
                        StatCard(
                            icon: "dollarsign.circle.fill",
                            value: String(format: "$%.2f", totalEarnings),
                            label: "Earned",
                            color: .choreStarAccent
                        )
                    }
                    
                    // Progress bar
                    VStack(spacing: 12) {
                        HStack {
                            Text("Today's Progress")
                                .font(.headline)
                                .foregroundColor(.choreStarTextPrimary)
                            Spacer()
                            Text("\(Int(completionPercentage * 100))%")
                                .font(.headline)
                                .fontWeight(.bold)
                                .foregroundStyle(Color.choreStarGradient)
                        }
                        
                        GeometryReader { geometry in
                            ZStack(alignment: .leading) {
                                RoundedRectangle(cornerRadius: 10)
                                    .fill(Color.choreStarBackground)
                                    .frame(height: 12)
                                
                                RoundedRectangle(cornerRadius: 10)
                                    .fill(
                                        LinearGradient(
                                            colors: [Color.fromString(child.avatarColor), Color.fromString(child.avatarColor).opacity(0.7)],
                                            startPoint: .leading,
                                            endPoint: .trailing
                                        )
                                    )
                                    .frame(width: geometry.size.width * completionPercentage, height: 12)
                                    .animation(.spring(response: 0.6, dampingFraction: 0.8), value: completionPercentage)
                            }
                        }
                        .frame(height: 12)
                    }
                    .padding(16)
                    .background(Color.choreStarCardBackground)
                    .cornerRadius(16)
                    .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 3)
                }
                .padding(.horizontal, 20)
                .padding(.top, 20)
                
                // Chores section
                VStack(alignment: .leading, spacing: 16) {
                    Text("\(child.name)'s Chores")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.choreStarTextPrimary)
                        .padding(.horizontal, 20)
                    
                    if childChores.isEmpty {
                        EmptyChoresMessage(childName: child.name)
                    } else {
                        // Pending chores
                        if !pendingChores.isEmpty {
                            VStack(alignment: .leading, spacing: 12) {
                                Text("To Do")
                                    .font(.headline)
                                    .foregroundColor(.choreStarTextSecondary)
                                    .padding(.horizontal, 20)
                                
                                ForEach(pendingChores) { chore in
                                    ChildChoreCard(chore: chore, manager: manager)
                                        .padding(.horizontal, 20)
                                }
                            }
                        }
                        
                        // Completed chores
                        if !completedChores.isEmpty {
                            VStack(alignment: .leading, spacing: 12) {
                                Text("Completed")
                                    .font(.headline)
                                    .foregroundColor(.choreStarTextSecondary)
                                    .padding(.horizontal, 20)
                                
                                ForEach(completedChores) { chore in
                                    ChildChoreCard(chore: chore, manager: manager)
                                        .padding(.horizontal, 20)
                                }
                            }
                        }
                    }
                }
                .padding(.bottom, 40)
            }
        }
        .background(Color.choreStarBackground)
        .navigationTitle("")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button(action: {
                    showingAddChore = true
                }) {
                    Image(systemName: "plus.circle.fill")
                        .font(.title2)
                        .foregroundStyle(Color.choreStarGradient)
                }
            }
        }
        .sheet(isPresented: $showingAddChore) {
            AddEditChoreView(chore: nil, preselectedChildId: child.id)
        }
    }
}

struct StatCard: View {
    let icon: String
    let value: String
    let label: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(color)
            
            Text(value)
                .font(.title3)
                .fontWeight(.bold)
                .foregroundColor(.choreStarTextPrimary)
            
            Text(label)
                .font(.caption)
                .foregroundColor(.choreStarTextSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 16)
        .background(Color.choreStarCardBackground)
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 3)
    }
}

struct ChildChoreCard: View {
    let chore: Chore
    @ObservedObject var manager: SupabaseManager
    @State private var showingEditSheet = false
    @State private var showingDeleteAlert = false
    
    private var isCompleted: Bool {
        manager.isChoreCompleted(chore)
    }
    
    var body: some View {
        HStack(spacing: 14) {
            // Completion button
            Button(action: {
                let impact = UIImpactFeedbackGenerator(style: .medium)
                impact.impactOccurred()
                Task {
                    await manager.toggleChoreCompletion(chore)
                }
            }) {
                ZStack {
                    Circle()
                        .strokeBorder(
                            isCompleted ? Color.choreStarSuccess : Color.choreStarTextSecondary.opacity(0.3),
                            lineWidth: 2.5
                        )
                        .frame(width: 28, height: 28)
                    
                    if isCompleted {
                        Image(systemName: "checkmark")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(.choreStarSuccess)
                            .transition(.scale.combined(with: .opacity))
                    }
                }
                .animation(.spring(response: 0.4, dampingFraction: 0.6), value: isCompleted)
            }
            .buttonStyle(PlainButtonStyle())
            
            VStack(alignment: .leading, spacing: 4) {
                Text(chore.name)
                    .font(.body)
                    .fontWeight(.semibold)
                    .foregroundColor(isCompleted ? .choreStarTextSecondary : .choreStarTextPrimary)
                    .strikethrough(isCompleted, color: .choreStarTextSecondary)
                
                if let description = chore.description, !description.isEmpty {
                    Text(description)
                        .font(.caption)
                        .foregroundColor(.choreStarTextSecondary)
                        .lineLimit(2)
                }
            }
            
            Spacer()
            
            // Reward
            HStack(spacing: 4) {
                Image(systemName: "dollarsign.circle.fill")
                    .font(.caption)
                    .foregroundStyle(Color.choreStarWarningGradient)
                Text(String(format: "%.2f", chore.reward))
                    .font(.subheadline)
                    .fontWeight(.bold)
                    .foregroundStyle(Color.choreStarWarningGradient)
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(Color.choreStarAccent.opacity(0.15))
            .cornerRadius(8)
        }
        .padding(14)
        .background(
            LinearGradient(
                colors: [
                    Color.choreStarCardBackground,
                    isCompleted ? Color.choreStarSuccess.opacity(0.05) : Color.choreStarCardBackground
                ],
                startPoint: .leading,
                endPoint: .trailing
            )
        )
        .cornerRadius(14)
        .shadow(color: .black.opacity(0.05), radius: 6, x: 0, y: 2)
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(
                    isCompleted ? Color.choreStarSuccess.opacity(0.3) : Color.choreStarBackground,
                    lineWidth: 1
                )
        )
        .scaleEffect(isCompleted ? 0.98 : 1.0)
        .animation(.spring(response: 0.4, dampingFraction: 0.7), value: isCompleted)
        .contextMenu {
            Button(action: { showingEditSheet = true }) {
                Label("Edit", systemImage: "pencil")
            }
            
            Button(role: .destructive, action: { showingDeleteAlert = true }) {
                Label("Delete", systemImage: "trash")
            }
        }
        .sheet(isPresented: $showingEditSheet) {
            AddEditChoreView(chore: chore)
        }
        .alert("Delete \(chore.name)?", isPresented: $showingDeleteAlert) {
            Button("Cancel", role: .cancel) { }
            Button("Delete", role: .destructive) {
                Task {
                    try? await manager.deleteChore(choreId: chore.id)
                }
            }
        } message: {
            Text("This action cannot be undone.")
        }
    }
}

struct EmptyChoresMessage: View {
    let childName: String
    
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "checkmark.circle")
                .font(.system(size: 50))
                .foregroundColor(.choreStarSuccess)
            
            Text("All Done!")
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(.choreStarTextPrimary)
            
            Text("\(childName) has no chores assigned yet")
                .font(.body)
                .foregroundColor(.choreStarTextSecondary)
                .multilineTextAlignment(.center)
        }
        .padding(40)
        .frame(maxWidth: .infinity)
    }
}

#Preview {
    NavigationView {
        ChildDetailView(
            child: Child(
                id: UUID(),
                name: "Emma",
                age: 8,
                avatarColor: "pink",
                avatarUrl: nil,
                avatarFile: nil,
                userId: UUID(),
                childPin: nil,
                childAccessEnabled: false,
                createdAt: Date(),
                updatedAt: Date()
            )
        )
        .environmentObject(SupabaseManager.shared)
    }
}

