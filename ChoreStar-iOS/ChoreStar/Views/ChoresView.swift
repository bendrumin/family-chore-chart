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
        NavigationStack {
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
                Picker("Filter", selection: $selectedFilter) {
                    ForEach(ChoreFilter.allCases, id: \.self) { filter in
                        Text(filter.rawValue).tag(filter)
                    }
                }
                .pickerStyle(.segmented)
                .padding(.horizontal, 20)
                .padding(.top, 6)

                if filteredChores.isEmpty {
                    EmptyChoresView(filter: selectedFilter)
                } else {
                    // Adaptive columns: one per child on iPad, single column on iPhone
                    LazyVGrid(
                        columns: [GridItem(.adaptive(minimum: 330, maximum: 560), spacing: 16, alignment: .top)],
                        alignment: .center,
                        spacing: 16
                    ) {
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
            // Header: avatar with the child's own progress ring
            HStack(spacing: 12) {
                if let child = child {
                    ProgressRing(
                        progress: chores.isEmpty ? 0 : Double(completedCount) / Double(chores.count),
                        lineWidth: 3.5,
                        tint: Color.fromString(child.avatarColor)
                    ) {
                        Circle()
                            .fill(Color.fromString(child.avatarColor))
                            .frame(width: 34, height: 34)
                            .overlay(
                                Text(child.initials)
                                    .font(.footnote)
                                    .fontWeight(.bold)
                                    .foregroundColor(.white)
                            )
                    }
                    .frame(width: 44, height: 44)
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text(childName)
                        .font(.headline)
                        .foregroundColor(.choreStarTextPrimary)

                    Text("\(completedCount) of \(chores.count) done")
                        .font(.caption)
                        .foregroundColor(.choreStarTextSecondary)
                }

                Spacer()
            }
            .padding(.bottom, 2)

            // Chores list
            VStack(spacing: 2) {
                ForEach(chores, id: \.id) { chore in
                    EnhancedChoreRow(chore: chore, manager: manager)

                    if chore.id != chores.last?.id {
                        Divider()
                            .padding(.leading, 40)
                    }
                }
            }
        }
        .appCard()
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
        Button(action: {
            if isCompleted {
                Haptics.light()
            } else {
                Haptics.success()
                SoundManager.shared.play(.success)
            }
            Task {
                let _ = await manager.toggleChoreCompletion(chore)
            }
        }) {
            HStack(spacing: 12) {
                Image(systemName: isCompleted ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 24, weight: .medium))
                    .foregroundColor(isCompleted ? .choreStarSuccess : Color.choreStarTextSecondary.opacity(0.45))
                    .animation(.spring(response: 0.35, dampingFraction: 0.65), value: isCompleted)

                // Chore info
                VStack(alignment: .leading, spacing: 3) {
                    HStack(spacing: 6) {
                        if let icon = chore.icon, !icon.isEmpty {
                            Text(icon)
                                .font(.subheadline)
                        }
                        Text(chore.name)
                            .font(.body)
                            .fontWeight(.medium)
                            .foregroundColor(isCompleted ? .choreStarTextSecondary : .choreStarTextPrimary)
                            .strikethrough(isCompleted, color: .choreStarTextSecondary)
                            .lineLimit(1)
                    }

                    if let description = chore.description, !description.isEmpty {
                        Text(description)
                            .font(.caption)
                            .foregroundColor(.choreStarTextSecondary)
                            .lineLimit(1)
                    }
                }

                Spacer()

                // Reward
                Text(manager.formatMoney(chore.reward))
                    .font(.system(.subheadline, design: .rounded).weight(.semibold))
                    .foregroundColor(isCompleted ? .choreStarSuccess : .choreStarTextSecondary)
            }
            .padding(.vertical, 10)
            .contentShape(Rectangle())
            .opacity(isCompleted ? 0.75 : 1.0)
        }
        .buttonStyle(PlainButtonStyle())
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
