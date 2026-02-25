import SwiftUI

struct ChoresView: View {
    @EnvironmentObject var manager: SupabaseManager
    @State private var selectedFilter: ChoreFilter = .all
    @State private var showingAddChore = false
    @State private var selectedTab: ChoresTab = .chores
    
    enum ChoresTab: String, CaseIterable {
        case chores = "Chores"
        case routines = "Routines"
    }

    enum ChoreFilter: String, CaseIterable {
        case all = "All"
        case pending = "Pending"
        case completed = "Completed"
    }

    private var filteredChores: [Chore] {
        switch selectedFilter {
        case .all:
            return manager.chores
        case .pending:
            return manager.chores.filter { !manager.isChoreCompleted($0) }
        case .completed:
            return manager.chores.filter { manager.isChoreCompleted($0) }
        }
    }

    private var groupedChores: [String: [Chore]] {
        Dictionary(grouping: filteredChores) { chore in
            manager.children.first(where: { $0.id == chore.childId })?.name ?? "Unassigned"
        }
    }

    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                Picker("View", selection: $selectedTab) {
                    ForEach(ChoresTab.allCases, id: \.self) { tab in
                        Text(tab.rawValue).tag(tab)
                    }
                }
                .pickerStyle(.segmented)
                .padding(.horizontal, 20)
                .padding(.vertical, 10)
                
                if selectedTab == .chores {
                    choresList
                } else {
                    RoutinesListView()
                }
            }
            .background(Color.choreStarBackground)
            .refreshable {
                manager.refreshData()
            }
            .navigationTitle(selectedTab == .chores ? "Chores" : "Routines")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    if selectedTab == .chores {
                        Button(action: {
                            showingAddChore = true
                        }) {
                            Image(systemName: "plus.circle.fill")
                                .font(.title2)
                                .foregroundStyle(Color.choreStarGradient)
                        }
                    }
                }
            }
            .sheet(isPresented: $showingAddChore) {
                AddEditChoreView()
            }
        }
    }
    
    private var choresList: some View {
        ScrollView {
            LazyVStack(spacing: 20) {
                VStack(alignment: .leading, spacing: 16) {
                    HStack {
                        VStack(alignment: .leading) {
                            Text("Chores")
                                .font(.title2)
                                .fontWeight(.bold)
                                .foregroundColor(.choreStarTextPrimary)

                            Text("Track and manage daily tasks")
                                .font(.subheadline)
                                .foregroundColor(.choreStarTextSecondary)
                        }
                        Spacer()
                    }

                    HStack(spacing: 0) {
                        ForEach(ChoreFilter.allCases, id: \.self) { filter in
                            Button(action: {
                                withAnimation(.easeInOut(duration: 0.2)) {
                                    selectedFilter = filter
                                }
                            }) {
                                Text(filter.rawValue)
                                    .font(.subheadline)
                                    .fontWeight(.semibold)
                                    .foregroundColor(selectedFilter == filter ? .white : .choreStarTextSecondary)
                                    .padding(.horizontal, 16)
                                    .padding(.vertical, 8)
                                    .background(
                                        RoundedRectangle(cornerRadius: 8)
                                            .fill(selectedFilter == filter ? Color.choreStarPrimary : Color.clear)
                                    )
                            }
                            .buttonStyle(PlainButtonStyle())
                        }
                        Spacer()
                    }
                    .padding(4)
                    .background(Color.choreStarSecondary.opacity(0.2))
                    .cornerRadius(12)
                }
                .padding(.horizontal, 20)
                .padding(.top, 10)

                if filteredChores.isEmpty {
                    EmptyChoresView(filter: selectedFilter)
                } else {
                    LazyVStack(spacing: 20) {
                        ForEach(groupedChores.keys.sorted(), id: \.self) { childName in
                            ChoreGroupCard(
                                childName: childName,
                                chores: groupedChores[childName] ?? [],
                                manager: manager
                            )
                        }
                    }
                    .padding(.horizontal, 20)
                }

                Spacer(minLength: 100)
            }
            .padding(.top, 10)
        }
    }
}

struct ChoreGroupCard: View {
    let childName: String
    let chores: [Chore]
    let manager: SupabaseManager
    
    private var child: Child? {
        manager.children.first { $0.name == childName }
    }
    
    private var completedCount: Int {
        chores.filter { manager.isChoreCompleted($0) }.count
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack(spacing: 12) {
                if let child = child {
                    Circle()
                        .fill(Color.fromString(child.avatarColor))
                        .frame(width: 40, height: 40)
                        .overlay(
                            Text(child.initials)
                                .font(.headline)
                                .fontWeight(.bold)
                                .foregroundColor(.white)
                        )
                }
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(childName)
                        .font(.headline)
                        .fontWeight(.semibold)
                        .foregroundColor(.choreStarTextPrimary)
                    
                    Text("\(completedCount)/\(chores.count) completed")
                        .font(.subheadline)
                        .foregroundColor(.choreStarTextSecondary)
                }
                
                Spacer()
            }
            .padding(.bottom, 4)
            
            // Chores list
            VStack(spacing: 8) {
                ForEach(chores, id: \.id) { chore in
                    EnhancedChoreRow(chore: chore, manager: manager)
                }
            }
        }
        .padding(16)
        .background(Color.choreStarCardBackground)
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 2)
    }
}

struct EnhancedChoreRow: View {
    let chore: Chore
    @ObservedObject var manager: SupabaseManager
    @State private var showingEditSheet = false
    @State private var showingDeleteAlert = false
    
    private var isCompleted: Bool {
        manager.isChoreCompleted(chore)
    }
    
    var body: some View {
        HStack(spacing: 12) {
            // Completion button with animation
            Button(action: {
                Task {
                    let _ = await manager.toggleChoreCompletion(chore)
                }
            }) {
                ZStack {
                    Circle()
                        .stroke(isCompleted ? Color.choreStarSuccess : Color.choreStarTextSecondary, lineWidth: 2)
                        .frame(width: 28, height: 28)
                    
                    if isCompleted {
                        Image(systemName: "checkmark")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(.choreStarSuccess)
                            .transition(.scale.combined(with: .opacity))
                    }
                }
                .animation(.spring(response: 0.3, dampingFraction: 0.6), value: isCompleted)
            }
            .buttonStyle(PlainButtonStyle())
            
            // Chore info
            VStack(alignment: .leading, spacing: 4) {
                Text(chore.name)
                    .font(.body)
                    .fontWeight(.medium)
                    .foregroundColor(.choreStarTextPrimary)
                    .strikethrough(isCompleted, color: .choreStarTextSecondary)
                
                if let description = chore.description, !description.isEmpty {
                    Text(description)
                        .font(.caption)
                        .foregroundColor(.choreStarTextSecondary)
                        .lineLimit(1)
                }
            }
            
            Spacer()
            
            // Reward
            HStack(spacing: 4) {
                Image(systemName: "dollarsign.circle.fill")
                    .font(.caption)
                    .foregroundColor(.choreStarAccent)
                
                Text(String(format: "%.2f", chore.reward))
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(.choreStarAccent)
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(Color.choreStarAccent.opacity(0.1))
            .cornerRadius(8)
        }
        .padding(12)
        .background(Color.choreStarBackground)
        .cornerRadius(12)
        .opacity(isCompleted ? 0.7 : 1.0)
        .animation(.easeInOut(duration: 0.2), value: isCompleted)
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

struct EmptyChoresView: View {
    let filter: ChoresView.ChoreFilter
    
    var body: some View {
        VStack(spacing: 20) {
            // Large emoji instead of SF Symbol
            Text(emptyEmoji)
                .font(.system(size: 80))
            
            Text(emptyMessage)
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(.choreStarTextPrimary)
            
            Text(emptySubtitle)
                .font(.subheadline)
                .foregroundColor(.choreStarTextSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
        }
        .padding(40)
    }
    
    private var emptyEmoji: String {
        switch filter {
        case .all:
            return "📋"
        case .pending:
            return "🎉"
        case .completed:
            return "⏰"
        }
    }
    
    private var emptyMessage: String {
        switch filter {
        case .all:
            return "No chores yet!"
        case .pending:
            return "All done! 🎉"
        case .completed:
            return "No completed chores"
        }
    }
    
    private var emptySubtitle: String {
        switch filter {
        case .all:
            return "Tap the + button to create your first chore and start earning rewards!"
        case .pending:
            return "Awesome work! All chores are completed for today. Time to relax!"
        case .completed:
            return "Complete some chores to see them here and track your progress!"
        }
    }
}

#Preview {
    ChoresView().environmentObject(SupabaseManager.shared)
}
