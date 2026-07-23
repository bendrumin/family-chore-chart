import SwiftUI
import TipKit

/// TipKit: teaches the swipe-to-complete gesture on first visits.
struct SwipeToCompleteTip: Tip {
    var title: Text {
        Text("Swipe to complete")
    }

    var message: Text? {
        Text("Swipe a chore to the right to check it off — or drag with a long press to reorder.")
    }

    var image: Image? {
        Image(systemName: "hand.draw.fill")
    }
}

struct ChoresView: View {
    @EnvironmentObject var manager: SupabaseManager
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @State private var selectedFilter: ChoreFilter = .all
    @State private var showingAddChore = false
    @State private var selectedTab: ChoresTab = .chores
    @State private var searchText = ""

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
        let base: [Chore]
        switch selectedFilter {
        case .all:
            base = manager.chores
        case .pending:
            base = manager.chores.filter { !manager.isChoreCompleted($0) }
        case .completed:
            base = manager.chores.filter { manager.isChoreCompleted($0) }
        }

        guard !searchText.isEmpty else { return base }
        return base.filter { $0.name.localizedCaseInsensitiveContains(searchText) }
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
                    choresContent
                        .searchable(text: $searchText, prompt: "Search chores")
                } else {
                    RoutinesListView()
                }
            }
            .background(ThemedScreenBackground())
            .refreshable {
                manager.refreshData()
            }
            .navigationTitle(selectedTab == .chores ? "Chores" : "Routines")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                if selectedTab == .chores {
                    if horizontalSizeClass == .compact {
                        ToolbarItem(placement: .secondaryAction) {
                            EditButton()
                        }
                    }

                    ToolbarItem(placement: .secondaryAction) {
                        // Reminders-style filter menu
                        Menu {
                            Picker("Filter", selection: $selectedFilter) {
                                ForEach(ChoreFilter.allCases, id: \.self) { filter in
                                    Text(filter.rawValue).tag(filter)
                                }
                            }
                        } label: {
                            Label("Filter", systemImage: selectedFilter == .all
                                  ? "line.3.horizontal.decrease.circle"
                                  : "line.3.horizontal.decrease.circle.fill")
                        }
                    }

                    ToolbarItem(placement: .primaryAction) {
                        Button(action: {
                            showingAddChore = true
                        }) {
                            Label("New Chore", systemImage: "plus")
                        }
                    }
                }
            }
            .sheet(isPresented: $showingAddChore) {
                AddEditChoreView()
            }
        }
    }

    @ViewBuilder
    private var choresContent: some View {
        if filteredChores.isEmpty {
            if !searchText.isEmpty {
                ContentUnavailableView.search(text: searchText)
            } else {
                ScrollView {
                    EmptyChoresView(filter: selectedFilter)
                        .padding(.top, 60)
                }
            }
        } else if horizontalSizeClass == .compact {
            nativeList
        } else {
            choresList
        }
    }

    // iPhone: native inset-grouped list with swipe actions (Reminders-style)
    // and long-press drag reordering (persisted to chores.sort_order)
    private var canReorder: Bool {
        selectedFilter == .all && searchText.isEmpty
    }

    private var nativeList: some View {
        List {
            if canReorder {
                TipView(SwipeToCompleteTip())
                    .listRowBackground(Color.clear)
                    .listRowInsets(EdgeInsets())
            }

            ForEach(groupedChores.keys.sorted(), id: \.self) { childName in
                Section {
                    ForEach(groupedChores[childName] ?? [], id: \.id) { chore in
                        ChoreListRow(chore: chore, manager: manager)
                            .moveDisabled(!canReorder)
                    }
                    .onMove { source, destination in
                        var sectionChores = groupedChores[childName] ?? []
                        sectionChores.move(fromOffsets: source, toOffset: destination)
                        Haptics.medium()
                        Task {
                            await manager.updateChoreOrder(sectionChores)
                        }
                    }
                } header: {
                    Text(childName)
                }
            }
        }
        .listStyle(.insetGrouped)
        .scrollContentBackground(.hidden)
    }
    
    // iPad: adaptive grid of per-child cards
    private var choresList: some View {
        ScrollView {
            LazyVStack(spacing: 20) {
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

                Spacer(minLength: 100)
            }
            .padding(.top, 10)
        }
    }
}

/// Native list row with leading swipe-to-complete and trailing edit/delete.
struct ChoreListRow: View {
    let chore: Chore
    @ObservedObject var manager: SupabaseManager
    @State private var showingEditSheet = false
    @State private var showingDeleteAlert = false

    private var isCompleted: Bool {
        manager.isChoreCompleted(chore)
    }

    private var childColor: Color {
        Color.fromString(manager.children.first(where: { $0.id == chore.childId })?.avatarColor ?? "")
    }

    var body: some View {
        HStack(spacing: 12) {
            Button(action: toggle) {
                Image(systemName: isCompleted ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 24, weight: .medium))
                    .foregroundColor(isCompleted ? .choreStarSuccess : Color.choreStarTextSecondary.opacity(0.45))
                    .symbolEffect(.bounce, value: isCompleted)
                    .animation(.spring(response: 0.35, dampingFraction: 0.65), value: isCompleted)
            }
            .buttonStyle(PlainButtonStyle())

            AdaptiveIcon(icon: chore.icon, fallbackSymbol: "checklist", tint: childColor, iconSize: 24)
                .font(.title3)
                .frame(width: 28, height: 28)
                .saturation(isCompleted ? 0.3 : 1)
                .opacity(isCompleted ? 0.5 : 1)

            Text(chore.name)
                .font(.body)
                .foregroundColor(isCompleted ? .choreStarTextSecondary : .choreStarTextPrimary)
                .strikethrough(isCompleted, color: .choreStarTextSecondary)
                .lineLimit(1)

            Spacer()

            Text(manager.formatMoney(chore.reward))
                .font(.system(.subheadline, design: .rounded).weight(.semibold))
                .foregroundColor(isCompleted ? .choreStarSuccess : .choreStarTextSecondary)
        }
        .contentShape(Rectangle())
        .onTapGesture(perform: toggle)
        .swipeActions(edge: .leading, allowsFullSwipe: true) {
            Button(action: toggle) {
                Label(isCompleted ? "Undo" : "Done",
                      systemImage: isCompleted ? "arrow.uturn.backward" : "checkmark")
            }
            .tint(isCompleted ? .orange : .choreStarSuccess)
        }
        .swipeActions(edge: .trailing) {
            Button(role: .destructive) {
                showingDeleteAlert = true
            } label: {
                Label("Delete", systemImage: "trash")
            }

            Button {
                showingEditSheet = true
            } label: {
                Label("Edit", systemImage: "pencil")
            }
            .tint(.blue)
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

    private func toggle() {
        if isCompleted {
            Haptics.light()
        } else {
            Haptics.success()
            SoundManager.shared.play(.success)
        }
        Task {
            let _ = await manager.toggleChoreCompletion(chore)
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

    private var childColor: Color {
        Color.fromString(manager.children.first(where: { $0.id == chore.childId })?.avatarColor ?? "")
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
                    .symbolEffect(.bounce, value: isCompleted)
                    .animation(.spring(response: 0.35, dampingFraction: 0.65), value: isCompleted)

                AdaptiveIcon(icon: chore.icon, fallbackSymbol: "checklist", tint: childColor, iconSize: 22)
                    .font(.subheadline)
                    .frame(width: 26, height: 26)
                    .saturation(isCompleted ? 0.3 : 1)
                    .opacity(isCompleted ? 0.5 : 1)

                // Chore info
                VStack(alignment: .leading, spacing: 3) {
                    Text(chore.name)
                        .font(.body)
                        .fontWeight(.medium)
                        .foregroundColor(isCompleted ? .choreStarTextSecondary : .choreStarTextPrimary)
                        .strikethrough(isCompleted, color: .choreStarTextSecondary)
                        .lineLimit(1)

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
