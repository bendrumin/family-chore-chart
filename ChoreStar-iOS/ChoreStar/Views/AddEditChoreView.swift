import SwiftUI

struct AddEditChoreView: View {
    @EnvironmentObject var manager: SupabaseManager
    @Environment(\.dismiss) var dismiss
    
    let choreToEdit: Chore?
    
    @State private var name: String
    @State private var selectedChild: UUID?
    @State private var rewardDollars: Double
    @State private var category: String
    @State private var selectedIcon: String
    @State private var selectedColor: String
    @State private var notes: String
    @State private var isSaving = false
    @State private var errorMessage: String?
    @State private var showingUpgradePrompt = false
    
    // One canonical catalog shared with the web picker — see ChoreIconCatalog.
    private let icons = ChoreIconCatalog.all
    
    private let colors = ["blue", "green", "orange", "purple", "pink", "red", "yellow", "teal", "indigo", "mint"]

    /// One-tap reward amounts, in cents. Same set as the web input
    /// (components/chores/reward-amount-input.tsx) so a family that sets a chore
    /// on one platform finds the same choices on the other.
    private let presetCents = [10, 25, 50, 100, 200, 500]

    /// Hard ceiling, matching the web input's MAX_CENTS.
    private let maxRewardCents = 10_000

    /// The amount as integer cents. Reward math is done in cents rather than on
    /// the Double, because 0.29 * 100 is 28.999999999999996 in binary floating
    /// point — the same trap that used to store 28¢ on save.
    private var rewardCents: Int {
        Int((rewardDollars * 100).rounded())
    }

    /// 5¢ under a unit, 25¢ above — small pocket-change amounts stay reachable
    /// while larger ones move quickly. Mirrors `stepFor` on the web.
    private func stepCents(for cents: Int) -> Int {
        cents < 100 ? 5 : 25
    }

    /// Step the reward one notch. Takes the step from the CURRENT value, so
    /// stepping down from $1.00 lands on $0.75 exactly as it does on the web.
    private func bumpReward(_ direction: Int) {
        let current = rewardCents
        let next = current + direction * stepCents(for: current)
        rewardDollars = Double(min(maxRewardCents, max(0, next))) / 100.0
    }
    
    init(chore: Chore? = nil, preselectedChildId: UUID? = nil) {
        self.choreToEdit = chore
        _name = State(initialValue: chore?.name ?? "")
        _selectedChild = State(initialValue: chore?.childId ?? preselectedChildId)
        // A new chore starts at -1 as a sentinel; the real default depends on the
        // family's reward mode, and `manager` is an @EnvironmentObject that is not
        // reachable from init. Resolved in .onAppear below.
        _rewardDollars = State(initialValue: chore?.reward ?? -1)
        _category = State(initialValue: ChoreCategory.normalize(chore?.category).rawValue)
        _selectedIcon = State(initialValue: chore?.icon ?? "📝")
        _selectedColor = State(initialValue: chore?.color ?? "blue")
        _notes = State(initialValue: chore?.notes ?? "")
    }
    
    var isEditing: Bool {
        choreToEdit != nil
    }

    /// Claude-personalized suggestions, when the API is reachable. The computed
    /// `suggestions` below is the rule-based fallback; whichever is shown, the
    /// UI is identical.
    @State private var aiSuggestions: [ChoreSuggestion]?

    private var displayedSuggestions: [ChoreSuggestion] { aiSuggestions ?? suggestions }

    private var suggestions: [ChoreSuggestion] {
        guard !isEditing,
              let childId = selectedChild,
              let child = manager.children.first(where: { $0.id == childId }) else { return [] }

        let existingNames = manager.chores
            .filter { $0.childId == childId }
            .map(\.name)
        let completionRate = manager.calculateWeeklyStats(for: childId).completionRate * 100

        return ChoreSuggestionEngine.suggestions(
            childName: child.name,
            childAge: child.age,
            existingChoreNames: existingNames,
            completionRate: completionRate
        )
    }

    var body: some View {
        NavigationStack {
            Form {
                if !displayedSuggestions.isEmpty {
                    Section(aiSuggestions != nil ? "Suggestions · personalized" : "Suggestions") {
                        ForEach(displayedSuggestions) { suggestion in
                            Button {
                                applySuggestion(suggestion)
                            } label: {
                                HStack(spacing: 12) {
                                    AdaptiveIcon(icon: suggestion.icon, fallbackSymbol: "checklist", tint: Color.fromString(selectedColor), iconSize: 26)
                                        .frame(width: 30, height: 30)

                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(suggestion.name)
                                            .font(.subheadline)
                                            .fontWeight(.semibold)
                                            .foregroundColor(.choreStarTextPrimary)

                                        Text(suggestion.reason)
                                            .font(.caption)
                                            .foregroundColor(.choreStarTextSecondary)
                                    }

                                    Spacer()

                                    Text(manager.formatMoney(Double(suggestion.rewardCents) / 100.0))
                                        .font(.caption)
                                        .fontWeight(.semibold)
                                        .foregroundColor(.choreStarAccent)

                                    Image(systemName: "plus.circle.fill")
                                        .foregroundColor(.choreStarPrimary)
                                }
                            }
                            .buttonStyle(PlainButtonStyle())
                        }
                    }
                }

                Section("Chore Details") {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Name")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundColor(.choreStarTextSecondary)
                        
                        TextField("e.g., Make bed", text: $name)
                            .textFieldStyle(.roundedBorder)
                    }
                    
                    Picker("Assigned To", selection: $selectedChild) {
                        Text("Select Child").tag(nil as UUID?)
                        ForEach(manager.children) { child in
                            HStack {
                                Circle()
                                    .fill(Color.fromString(child.avatarColor))
                                    .frame(width: 20, height: 20)
                                Text(child.name)
                            }
                            .tag(child.id as UUID?)
                        }
                    }
                }
                
                Section("Reward") {
                    HStack {
                        Text(manager.currencySymbol)
                            .font(.title2)
                            .foregroundColor(.choreStarAccent)
                        
                        TextField("0.00", value: $rewardDollars, format: .number)
                            .keyboardType(.decimalPad)
                            .font(.title2)
                            .fontWeight(.semibold)

                        // Explicit increment/decrement rather than Stepper's
                        // fixed `step:`, so the size can depend on the current
                        // amount the way the web input does.
                        Stepper(
                            "",
                            onIncrement: { bumpReward(1) },
                            onDecrement: { bumpReward(-1) }
                        )
                    }

                    // One-tap presets, matching the web chips.
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(presetCents, id: \.self) { cents in
                                let isSelected = rewardCents == cents
                                Button {
                                    rewardDollars = Double(cents) / 100.0
                                } label: {
                                    Text(manager.formatMoney(Double(cents) / 100.0))
                                        .font(.subheadline)
                                        .fontWeight(.bold)
                                        .padding(.horizontal, 14)
                                        .padding(.vertical, 7)
                                        .background(
                                            Capsule().fill(
                                                isSelected
                                                    ? Color.choreStarAccent
                                                    : Color.choreStarAccent.opacity(0.12)
                                            )
                                        )
                                        .foregroundColor(isSelected ? .white : .choreStarAccent)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .padding(.vertical, 2)
                    }

                    Text("Current: \(manager.formatMoney(rewardDollars))")
                        .font(.caption)
                        .foregroundColor(.choreStarTextSecondary)

                    // Web parity. Without this the form implies the amount is
                    // paid per completion, which is false on the flat daily
                    // rate — where every chore's amount is ignored and the child
                    // earns the daily rate for finishing the whole list.
                    if !manager.isPerChoreRewardMode {
                        HStack(alignment: .top, spacing: 8) {
                            Image(systemName: "info.circle.fill")
                                .foregroundColor(.choreStarAccent)
                            Text("Your family is on the Flat Daily Rate, so this amount isn't used yet. It's saved, and applies if you switch to Per Chore in Settings.")
                                .font(.caption)
                                .foregroundColor(.choreStarTextSecondary)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                    }
                }
                
                Section("Category") {
                    Picker("Category", selection: $category) {
                        ForEach(ChoreCategory.allCases) { cat in
                            Text("\(cat.emoji) \(cat.label)").tag(cat.rawValue)
                        }
                    }
                    .pickerStyle(.menu)
                }
                
                Section("Icon") {
                    LazyVGrid(columns: [
                        GridItem(.adaptive(minimum: 50))
                    ], spacing: 12) {
                        ForEach(icons, id: \.self) { icon in
                            IconOption(
                                iconName: icon,
                                color: selectedColor,
                                isSelected: selectedIcon == icon,
                                onTap: { selectedIcon = icon }
                            )
                        }
                    }
                    .padding(.vertical, 8)
                }
                
                Section("Color") {
                    LazyVGrid(columns: [
                        GridItem(.adaptive(minimum: 50))
                    ], spacing: 12) {
                        ForEach(colors, id: \.self) { color in
                            SmallColorOption(
                                colorName: color,
                                isSelected: selectedColor == color,
                                onTap: { selectedColor = color }
                            )
                        }
                    }
                    .padding(.vertical, 8)
                }
                
                Section("Notes (Optional)") {
                    TextEditor(text: $notes)
                        .frame(height: 80)
                }
                
                if let errorMessage = errorMessage {
                    Section {
                        Text(errorMessage)
                            .foregroundColor(.red)
                            .font(.caption)
                    }
                }
            }
            .navigationTitle(isEditing ? "Edit Chore" : "Add Chore")
            .task(id: selectedChild) {
                aiSuggestions = nil
                guard !isEditing,
                      let childId = selectedChild,
                      let child = manager.children.first(where: { $0.id == childId }) else { return }
                let existing = manager.chores.filter { $0.childId == childId }.map(\.name)
                let rate = manager.calculateWeeklyStats(for: childId).completionRate * 100
                aiSuggestions = await manager.fetchAISuggestions(
                    childName: child.name,
                    childAge: child.age,
                    existingChoreNames: existing,
                    completionRate: rate
                )
            }
            .onAppear {
                // Web parity (add-chore-modal). On the flat daily rate a chore's own
                // amount does not affect earnings, so there is no meaningful
                // per-chore figure — matching the family's daily number keeps chores
                // consistent with what they actually think in. In Per Chore mode the
                // amount does matter and the daily rate is the wrong quantity to
                // copy, so a plain default is used.
                if rewardDollars < 0 {
                    rewardDollars = manager.isPerChoreRewardMode
                        ? 0.10
                        : Double(manager.familySettings?.dailyRewardCents ?? 7) / 100.0
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .sheet(isPresented: $showingUpgradePrompt) {
                UpgradePromptView(
                    limitType: .chores,
                    currentCount: manager.chores.count,
                    limit: manager.choreLimit
                )
            }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .confirmationAction) {
                    Button(isEditing ? "Save" : "Add") {
                        saveChore()
                    }
                    .disabled(name.isEmpty || selectedChild == nil || isSaving)
                    .fontWeight(.semibold)
                }
            }
        }
    }
    
    private func applySuggestion(_ suggestion: ChoreSuggestion) {
        name = suggestion.name
        rewardDollars = Double(suggestion.rewardCents) / 100.0
        category = suggestion.editorCategory
        selectedIcon = suggestion.icon

        let impact = UIImpactFeedbackGenerator(style: .light)
        impact.impactOccurred()
    }

    private func saveChore() {
        guard let childId = selectedChild else {
            errorMessage = "Please select a child"
            return
        }
        
        if choreToEdit == nil && manager.chores.count >= manager.choreLimit {
            showingUpgradePrompt = true
            return
        }
        
        isSaving = true
        errorMessage = nil
        
        Task {
            do {
                // .rounded() before Int(). Int() truncates, and 0.29 * 100 is
                // 28.999999999999996 in binary floating point — so the old
                // Int(rewardDollars * 100) silently stored 28 cents. Same for
                // 0.57 -> 56 and 1.15 -> 114.
                let rewardCents = Int((rewardDollars * 100).rounded())
                
                if let chore = choreToEdit {
                    // Update existing chore
                    try await manager.updateChore(
                        choreId: chore.id,
                        name: name,
                        childId: childId,
                        rewardCents: rewardCents,
                        category: category,
                        icon: selectedIcon,
                        color: selectedColor,
                        notes: notes.isEmpty ? nil : notes
                    )
                } else {
                    // Create new chore
                    try await manager.createChore(
                        name: name,
                        childId: childId,
                        rewardCents: rewardCents,
                        category: category,
                        icon: selectedIcon,
                        color: selectedColor,
                        notes: notes.isEmpty ? nil : notes
                    )
                }
                
                await MainActor.run {
                    dismiss()
                }
            } catch {
                await MainActor.run {
                    errorMessage = "Error: \(error.localizedDescription)"
                    isSaving = false
                }
            }
        }
    }
}

struct IconOption: View {
    let iconName: String
    let color: String
    let isSelected: Bool
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            ZStack {
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.fromString(color).opacity(0.15))
                    .frame(width: 55, height: 55)

                // The PICKER shows the full-color emoji: a color-tinted line
                // glyph on a same-color tinted tile is too low-contrast to
                // scan (yellow-on-yellow). Displayed chores still render the
                // OpenMoji line art everywhere else.
                Text(iconName)
                    .font(.system(size: 28))
                
                if isSelected {
                    RoundedRectangle(cornerRadius: 12)
                        .strokeBorder(
                            LinearGradient(
                                colors: [Color.choreStarPrimary, Color.choreStarSecondary],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            ),
                            lineWidth: 3
                        )
                        .frame(width: 55, height: 55)
                }
            }
            .scaleEffect(isSelected ? 1.1 : 1.0)
            .animation(.spring(response: 0.3, dampingFraction: 0.6), value: isSelected)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

struct SmallColorOption: View {
    let colorName: String
    let isSelected: Bool
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            ZStack {
                Circle()
                    .fill(
                        LinearGradient(
                            colors: [Color.fromString(colorName), Color.fromString(colorName).opacity(0.7)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 40, height: 40)
                    .shadow(color: Color.fromString(colorName).opacity(0.4), radius: 4, x: 0, y: 2)
                
                if isSelected {
                    Circle()
                        .strokeBorder(Color.white, lineWidth: 2)
                        .frame(width: 40, height: 40)
                    
                    Circle()
                        .strokeBorder(Color.choreStarPrimary, lineWidth: 2)
                        .frame(width: 46, height: 46)
                }
            }
            .scaleEffect(isSelected ? 1.15 : 1.0)
            .animation(.spring(response: 0.3, dampingFraction: 0.6), value: isSelected)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

#Preview {
    AddEditChoreView()
        .environmentObject(SupabaseManager.shared)
}

#Preview("Edit Mode") {
    AddEditChoreView(
        chore: Chore(
            id: UUID(),
            name: "Make bed",
            childId: UUID(),
            reward: 1.5,
            description: "Make your bed neatly",
            category: "household_chores",
            icon: "bed.double",
            color: "blue",
            notes: "Fold the corners nicely",
            sortOrder: 0,
            createdAt: Date(),
            updatedAt: Date()
        )
    )
    .environmentObject(SupabaseManager.shared)
}

