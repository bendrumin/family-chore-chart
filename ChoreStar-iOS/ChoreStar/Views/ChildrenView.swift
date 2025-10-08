import SwiftUI

struct ChildrenView: View {
    @EnvironmentObject var manager: SupabaseManager

    var body: some View {
        NavigationView {
            ScrollView {
                LazyVStack(spacing: 16) {
                    // Header
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            VStack(alignment: .leading) {
                                Text("Family Members")
                                    .font(.title2)
                                    .fontWeight(.bold)
                                    .foregroundColor(.choreStarTextPrimary)

                                Text("Manage your family and track their progress")
                                    .font(.subheadline)
                                    .foregroundColor(.choreStarTextSecondary)
                            }
                            Spacer()
                        }
                        .padding(.horizontal, 20)
                        .padding(.top, 10)
                    }

                    // Children Grid
                    if manager.children.isEmpty {
                        EmptyChildrenView()
                    } else {
                        LazyVGrid(columns: [
                            GridItem(.flexible(), spacing: 16),
                            GridItem(.flexible(), spacing: 16)
                        ], spacing: 16) {
                            ForEach(Array(manager.children.enumerated()), id: \.element.id) { index, child in
                                ChildDetailCard(child: child, index: index, manager: manager)
                            }
                        }
                        .padding(.horizontal, 20)
                    }

                    Spacer(minLength: 100) // Bottom padding for tab bar
                }
                .padding(.top, 10)
            }
            .background(Color.choreStarBackground)
            .navigationTitle("Family")
            .navigationBarTitleDisplayMode(.large)
        }
    }
}

struct ChildDetailCard: View {
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
    
    private var totalEarnings: Double {
        childChores.filter { manager.isChoreCompleted($0) }.reduce(0) { $0 + $1.reward }
    }
    
    private var completionPercentage: Double {
        guard totalChores > 0 else { return 0 }
        return Double(completedChores) / Double(totalChores)
    }
    
    var body: some View {
        VStack(spacing: 16) {
            // Avatar
            Circle()
                .fill(Color.fromString(child.avatarColor))
                .frame(width: 80, height: 80)
                .overlay(
                    Text(child.initials)
                        .font(.largeTitle)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                )
            
            // Child info
            VStack(spacing: 8) {
                Text(child.name)
                    .font(.title3)
                    .fontWeight(.bold)
                    .foregroundColor(.choreStarTextPrimary)
                
                Text("Age \(child.age)")
                    .font(.subheadline)
                    .foregroundColor(.choreStarTextSecondary)
                
                // Progress circle
                ZStack {
                    Circle()
                        .stroke(Color.choreStarSecondary.opacity(0.3), lineWidth: 8)
                        .frame(width: 60, height: 60)
                    
                    Circle()
                        .trim(from: 0, to: completionPercentage)
                        .stroke(Color.fromString(child.avatarColor), lineWidth: 8)
                        .frame(width: 60, height: 60)
                        .rotationEffect(.degrees(-90))
                        .animation(.easeInOut(duration: 0.5), value: completionPercentage)
                    
                    VStack(spacing: 2) {
                        Text("\(completedChores)")
                            .font(.headline)
                            .fontWeight(.bold)
                            .foregroundColor(.choreStarTextPrimary)
                        Text("/\(totalChores)")
                            .font(.caption2)
                            .foregroundColor(.choreStarTextSecondary)
                    }
                }
                
                // Earnings
                HStack(spacing: 4) {
                    Image(systemName: "dollarsign.circle.fill")
                        .foregroundColor(.choreStarAccent)
                    Text("$\(totalEarnings, specifier: "%.2f")")
                        .font(.headline)
                        .fontWeight(.semibold)
                        .foregroundColor(.choreStarTextPrimary)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(Color.choreStarAccent.opacity(0.1))
                .cornerRadius(12)
            }
        }
        .padding(20)
        .background(Color.choreStarCardBackground)
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 2)
    }
}

struct EmptyChildrenView: View {
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "person.3.fill")
                .font(.system(size: 60))
                .foregroundColor(.choreStarTextSecondary)
            
            Text("No family members yet")
                .font(.title3)
                .fontWeight(.semibold)
                .foregroundColor(.choreStarTextPrimary)
            
            Text("Add family members to get started")
                .font(.subheadline)
                .foregroundColor(.choreStarTextSecondary)
        }
        .padding(40)
    }
}

#Preview {
    ChildrenView().environmentObject(SupabaseManager.shared)
}
