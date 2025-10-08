import SwiftUI

struct DashboardView: View {
    @EnvironmentObject var manager: SupabaseManager

    private var completedChores: Int {
        manager.chores.filter { manager.isChoreCompleted($0) }.count
    }

    private var totalChores: Int {
        manager.chores.count
    }

    private var completionPercentage: Double {
        guard totalChores > 0 else { return 0 }
        return Double(completedChores) / Double(totalChores)
    }

    var body: some View {
        NavigationView {
            ScrollView {
                LazyVStack(spacing: 20) {
                    // Header with greeting
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            VStack(alignment: .leading) {
                                Text("Good morning! 👋")
                                    .font(.title2)
                                    .fontWeight(.semibold)
                                    .foregroundColor(.choreStarTextPrimary)

                                Text("Let's see how everyone is doing today")
                                    .font(.subheadline)
                                    .foregroundColor(.choreStarTextSecondary)
                            }
                            Spacer()
                        }
                        .padding(.horizontal, 20)
                        .padding(.top, 10)
                    }

                    // Progress Card
                    VStack(spacing: 16) {
                        HStack {
                            Text("Today's Progress")
                                .font(.headline)
                                .fontWeight(.semibold)
                                .foregroundColor(.choreStarTextPrimary)
                            Spacer()
                            Text("\(completedChores)/\(totalChores)")
                                .font(.title2)
                                .fontWeight(.bold)
                                .foregroundColor(.choreStarPrimary)
                        }

                        // Progress Bar
                        GeometryReader { geometry in
                            ZStack(alignment: .leading) {
                                RoundedRectangle(cornerRadius: 8)
                                    .fill(Color.choreStarSecondary)
                                    .frame(height: 12)

                                RoundedRectangle(cornerRadius: 8)
                                    .fill(
                                        LinearGradient(
                                            colors: [.choreStarPrimary, .choreStarSuccess],
                                            startPoint: .leading,
                                            endPoint: .trailing
                                        )
                                    )
                                    .frame(width: geometry.size.width * completionPercentage, height: 12)
                                    .animation(.easeInOut(duration: 0.5), value: completionPercentage)
                            }
                        }
                        .frame(height: 12)

                        Text("\(Int(completionPercentage * 100))% Complete")
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundColor(.choreStarTextSecondary)
                    }
                    .padding(20)
                    .background(Color.choreStarCardBackground)
                    .cornerRadius(16)
                    .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 2)
                    .padding(.horizontal, 20)

                    // Children Cards
                    if !manager.children.isEmpty {
                        VStack(alignment: .leading, spacing: 12) {
                            HStack {
                                Text("Family Members")
                                    .font(.headline)
                                    .fontWeight(.semibold)
                                    .foregroundColor(.choreStarTextPrimary)
                                Spacer()
                            }
                            .padding(.horizontal, 20)

                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 16) {
                                    ForEach(Array(manager.children.enumerated()), id: \.element.id) { index, child in
                                        ChildCard(child: child, index: index, manager: manager)
                                    }
                                }
                                .padding(.horizontal, 20)
                            }
                        }
                    }

                    // Today's Chores
                    if !manager.chores.isEmpty {
                        VStack(alignment: .leading, spacing: 12) {
                            HStack {
                                Text("Today's Chores")
                                    .font(.headline)
                                    .fontWeight(.semibold)
                                    .foregroundColor(.choreStarTextPrimary)
                                Spacer()
                            }
                            .padding(.horizontal, 20)

                            LazyVStack(spacing: 8) {
                                ForEach(manager.chores, id: \.id) { chore in
                                    ChoreCard(chore: chore, manager: manager)
                                }
                            }
                            .padding(.horizontal, 20)
                        }
                    }

                    Spacer(minLength: 100) // Bottom padding for tab bar
                }
                .padding(.top, 10)
            }
            .background(Color.choreStarBackground)
            .navigationTitle("Dashboard")
            .navigationBarTitleDisplayMode(.large)
        }
    }
}

struct ChildCard: View {
    let child: Child
    let index: Int
    let manager: SupabaseManager
    
    private var childChores: [Chore] {
        manager.chores.filter { $0.childId == child.id }
    }
    
    private var completedChores: Int {
        childChores.filter { manager.isChoreCompleted($0) }.count
    }
    
    private var totalChores: Int {
        childChores.count
    }
    
    var body: some View {
        VStack(spacing: 12) {
            // Avatar
            Circle()
                .fill(Color.fromString(child.avatarColor))
                .frame(width: 60, height: 60)
                .overlay(
                    Text(child.initials)
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                )
            
            // Name and progress
            VStack(spacing: 4) {
                Text(child.name)
                    .font(.headline)
                    .fontWeight(.semibold)
                    .foregroundColor(.choreStarTextPrimary)
                
                Text("\(completedChores)/\(totalChores)")
                    .font(.subheadline)
                    .foregroundColor(.choreStarTextSecondary)
                
                // Mini progress bar
                if totalChores > 0 {
                    GeometryReader { geometry in
                        ZStack(alignment: .leading) {
                            RoundedRectangle(cornerRadius: 4)
                                .fill(Color.choreStarSecondary.opacity(0.3))
                                .frame(height: 6)
                            
                            RoundedRectangle(cornerRadius: 4)
                                .fill(Color.fromString(child.avatarColor))
                                .frame(width: geometry.size.width * (Double(completedChores) / Double(totalChores)), height: 6)
                        }
                    }
                    .frame(height: 6)
                }
            }
        }
        .padding(16)
        .frame(width: 140)
        .background(Color.choreStarCardBackground)
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
    }
}

struct ChoreCard: View {
    let chore: Chore
    let manager: SupabaseManager
    
    private var isCompleted: Bool {
        manager.isChoreCompleted(chore)
    }
    
    private var childName: String {
        manager.children.first { $0.id == chore.childId }?.name ?? "Unknown"
    }
    
    var body: some View {
        HStack(spacing: 12) {
            // Completion button
            Button(action: {
                Task {
                    await manager.toggleChoreCompletion(chore)
                }
            }) {
                Image(systemName: isCompleted ? "checkmark.circle.fill" : "circle")
                    .font(.title2)
                    .foregroundColor(isCompleted ? .choreStarSuccess : .choreStarTextSecondary)
            }
            .buttonStyle(PlainButtonStyle())
            
            // Chore info
            VStack(alignment: .leading, spacing: 4) {
                Text(chore.name)
                    .font(.headline)
                    .fontWeight(.medium)
                    .foregroundColor(.choreStarTextPrimary)
                    .strikethrough(isCompleted)
                
                HStack {
                    Text(childName)
                        .font(.subheadline)
                        .foregroundColor(.choreStarTextSecondary)
                    
                    Spacer()
                    
                    Text("$\(chore.reward, specifier: "%.2f")")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(.choreStarAccent)
                }
            }
            
            Spacer()
        }
        .padding(16)
        .background(Color.choreStarCardBackground)
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
        .opacity(isCompleted ? 0.7 : 1.0)
        .animation(.easeInOut(duration: 0.2), value: isCompleted)
    }
}

#Preview {
    DashboardView().environmentObject(SupabaseManager.shared)
}
