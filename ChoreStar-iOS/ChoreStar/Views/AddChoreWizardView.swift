import SwiftUI

/// Three-step flow for creating a chore — a lighter path than the full form,
/// which stays in AddEditChoreView for editing. Step 1 picks the child and
/// name (with suggestions), step 2 the look, step 3 the reward. Applying a
/// suggestion fills everything and jumps straight to the review step.
struct AddChoreWizardView: View {
    @EnvironmentObject var manager: SupabaseManager
    @Environment(\.dismiss) var dismiss

    let preselectedChildId: UUID?

    private enum Step: Int, CaseIterable {
        case whoAndWhat = 0
        case style = 1
        case reward = 2

        var title: String {
            switch self {
            case .whoAndWhat: return "Who & What"
            case .style: return "Make It Yours"
            case .reward: return "Reward"
            }
        }
    }

    @State private var step: Step = .whoAndWhat
    @State private var name = ""
    @State private var selectedChild: UUID?
    @State private var rewardDollars: Double = -1
    @State private var category = ChoreCategory.householdChores.rawValue
    @State private var selectedIcon = "📝"
    @State private var selectedColor = "blue"
    @State private var notes = ""
    @State private var isSaving = false
    @State private var errorMessage: String?
    @State private var showingUpgradePrompt = false
    @State private var aiSuggestions: [ChoreSuggestion]?

    init(preselectedChildId: UUID? = nil) {
        self.preselectedChildId = preselectedChildId
        _selectedChild = State(initialValue: preselectedChildId)
    }

    // One canonical catalog shared with the web picker — see ChoreIconCatalog.
    private let icons = ChoreIconCatalog.all
    private let colors = ["blue", "green", "orange", "purple", "pink", "red", "yellow", "teal", "indigo", "mint"]

    private let presetCents = [10, 25, 50, 100, 200, 500]
    private let maxRewardCents = 10_000

    private var rewardCents: Int { Int((rewardDollars * 100).rounded()) }

    private func stepCents(for cents: Int) -> Int { cents < 100 ? 5 : 25 }

    private func bumpReward(_ direction: Int) {
        let current = rewardCents
        let next = current + direction * stepCents(for: current)
        rewardDollars = Double(min(maxRewardCents, max(0, next))) / 100.0
    }

    private var suggestions: [ChoreSuggestion] {
        guard let childId = selectedChild,
              let child = manager.children.first(where: { $0.id == childId }) else { return [] }
        let existingNames = manager.chores.filter { $0.childId == childId }.map(\.name)
        let completionRate = manager.calculateWeeklyStats(for: childId).completionRate * 100
        return ChoreSuggestionEngine.suggestions(
            childName: child.name,
            childAge: child.age,
            existingChoreNames: existingNames,
            completionRate: completionRate
        )
    }

    private var displayedSuggestions: [ChoreSuggestion] { aiSuggestions ?? suggestions }

    private var canAdvance: Bool {
        switch step {
        case .whoAndWhat: return selectedChild != nil && !name.trimmingCharacters(in: .whitespaces).isEmpty
        case .style: return true
        case .reward: return !isSaving
        }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                header

                ScrollView {
                    Group {
                        switch step {
                        case .whoAndWhat: whoAndWhatStep
                        case .style: styleStep
                        case .reward: rewardStep
                        }
                    }
                    .padding()
                }

                footer
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("New Chore")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
            .onAppear {
                // Web parity: on the flat daily rate the per-chore amount is
                // unused, so seed it from the family's daily number instead.
                if rewardDollars < 0 {
                    rewardDollars = manager.isPerChoreRewardMode
                        ? 0.10
                        : Double(manager.familySettings?.dailyRewardCents ?? 7) / 100.0
                }
            }
            .task(id: selectedChild) {
                aiSuggestions = nil
                guard let childId = selectedChild,
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
            .sheet(isPresented: $showingUpgradePrompt) {
                UpgradePromptView(
                    limitType: .chores,
                    currentCount: manager.chores.count,
                    limit: manager.choreLimit
                )
            }
        }
    }

    // MARK: - Chrome

    private var header: some View {
        VStack(spacing: 6) {
            ProgressView(value: Double(step.rawValue + 1), total: Double(Step.allCases.count))
                .tint(.choreStarPrimary)
            HStack {
                Text("Step \(step.rawValue + 1) of \(Step.allCases.count)")
                    .font(.caption)
                    .foregroundColor(.choreStarTextSecondary)
                Spacer()
                Text(step.title)
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(.choreStarTextPrimary)
            }
        }
        .padding(.horizontal)
        .padding(.top, 8)
    }

    private var footer: some View {
        VStack(spacing: 8) {
            if let errorMessage {
                Text(errorMessage)
                    .font(.caption)
                    .foregroundColor(.red)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }

            HStack(spacing: 12) {
                if step != .whoAndWhat {
                    Button {
                        withAnimation { step = Step(rawValue: step.rawValue - 1) ?? .whoAndWhat }
                    } label: {
                        Text("Back")
                            .font(.headline)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.choreStarPrimary.opacity(0.12))
                            .foregroundColor(.choreStarPrimary)
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                    }
                }

                Button {
                    if step == .reward {
                        saveChore()
                    } else {
                        withAnimation { step = Step(rawValue: step.rawValue + 1) ?? .reward }
                    }
                } label: {
                    Group {
                        if isSaving {
                            ProgressView().tint(.white)
                        } else {
                            Text(step == .reward ? "Create Chore" : "Next")
                        }
                    }
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(canAdvance ? Color.choreStarPrimary : Color.gray.opacity(0.4))
                    .foregroundColor(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 14))
                }
                .disabled(!canAdvance)
            }
        }
        .padding()
        .background(.thinMaterial)
    }

    // MARK: - Step 1: who & what

    private var whoAndWhatStep: some View {
        VStack(alignment: .leading, spacing: 20) {
            VStack(alignment: .leading, spacing: 10) {
                Text("Who is this chore for?")
                    .font(.headline)
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 10) {
                        ForEach(manager.children) { child in
                            let isSelected = selectedChild == child.id
                            Button {
                                selectedChild = child.id
                            } label: {
                                HStack(spacing: 8) {
                                    Circle()
                                        .fill(Color.fromString(child.avatarColor))
                                        .frame(width: 22, height: 22)
                                    Text(child.name)
                                        .fontWeight(.semibold)
                                }
                                .padding(.horizontal, 14)
                                .padding(.vertical, 10)
                                .background(
                                    Capsule().fill(isSelected ? Color.choreStarPrimary : Color(.secondarySystemGroupedBackground))
                                )
                                .foregroundColor(isSelected ? .white : .choreStarTextPrimary)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }

            VStack(alignment: .leading, spacing: 10) {
                Text("What needs doing?")
                    .font(.headline)
                TextField("e.g., Make bed", text: $name)
                    .textFieldStyle(.roundedBorder)
                    .font(.title3)
            }

            if !displayedSuggestions.isEmpty {
                VStack(alignment: .leading, spacing: 10) {
                    Text(aiSuggestions != nil ? "Suggestions · personalized" : "Suggestions")
                        .font(.headline)
                    ForEach(displayedSuggestions.prefix(4)) { suggestion in
                        Button {
                            applySuggestion(suggestion)
                        } label: {
                            HStack(spacing: 12) {
                                AdaptiveIcon(icon: suggestion.icon, fallbackSymbol: "checklist", tint: Color.fromString(selectedColor), iconSize: 24)
                                    .frame(width: 28, height: 28)
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
                                Image(systemName: "arrow.right.circle.fill")
                                    .foregroundColor(.choreStarPrimary)
                            }
                            .padding(12)
                            .background(Color(.secondarySystemGroupedBackground))
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
    }

    // MARK: - Step 2: style

    private var styleStep: some View {
        VStack(alignment: .leading, spacing: 20) {
            VStack(alignment: .leading, spacing: 10) {
                Text("Category")
                    .font(.headline)
                Picker("Category", selection: $category) {
                    ForEach(ChoreCategory.allCases) { cat in
                        Text("\(cat.emoji) \(cat.label)").tag(cat.rawValue)
                    }
                }
                .pickerStyle(.menu)
                .padding(10)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color(.secondarySystemGroupedBackground))
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }

            VStack(alignment: .leading, spacing: 10) {
                Text("Pick an icon")
                    .font(.headline)
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 50))], spacing: 12) {
                    ForEach(icons, id: \.self) { icon in
                        IconOption(
                            iconName: icon,
                            color: selectedColor,
                            isSelected: selectedIcon == icon,
                            onTap: { selectedIcon = icon }
                        )
                    }
                }
            }

            VStack(alignment: .leading, spacing: 10) {
                Text("Pick a color")
                    .font(.headline)
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 50))], spacing: 12) {
                    ForEach(colors, id: \.self) { color in
                        SmallColorOption(
                            colorName: color,
                            isSelected: selectedColor == color,
                            onTap: { selectedColor = color }
                        )
                    }
                }
            }
        }
    }

    // MARK: - Step 3: reward & review

    private var rewardStep: some View {
        VStack(alignment: .leading, spacing: 20) {
            // Review card: what's about to be created.
            HStack(spacing: 12) {
                AdaptiveIcon(icon: selectedIcon, fallbackSymbol: "checklist", tint: Color.fromString(selectedColor), iconSize: 30)
                    .frame(width: 44, height: 44)
                    .background(Color.fromString(selectedColor).opacity(0.15))
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                VStack(alignment: .leading, spacing: 2) {
                    Text(name.isEmpty ? "New chore" : name)
                        .font(.headline)
                    if let childId = selectedChild,
                       let child = manager.children.first(where: { $0.id == childId }) {
                        Text("For \(child.name) · \(ChoreCategory.label(for: category))")
                            .font(.caption)
                            .foregroundColor(.choreStarTextSecondary)
                    }
                }
                Spacer()
            }
            .padding(14)
            .background(Color(.secondarySystemGroupedBackground))
            .clipShape(RoundedRectangle(cornerRadius: 14))

            VStack(alignment: .leading, spacing: 10) {
                Text("Reward")
                    .font(.headline)

                HStack {
                    Text(manager.currencySymbol)
                        .font(.title2)
                        .foregroundColor(.choreStarAccent)
                    TextField("0.00", value: $rewardDollars, format: .number)
                        .keyboardType(.decimalPad)
                        .font(.title2)
                        .fontWeight(.semibold)
                    Stepper("", onIncrement: { bumpReward(1) }, onDecrement: { bumpReward(-1) })
                }
                .padding(12)
                .background(Color(.secondarySystemGroupedBackground))
                .clipShape(RoundedRectangle(cornerRadius: 12))

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
                                        Capsule().fill(isSelected ? Color.choreStarAccent : Color.choreStarAccent.opacity(0.12))
                                    )
                                    .foregroundColor(isSelected ? .white : .choreStarAccent)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.vertical, 2)
                }

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

            VStack(alignment: .leading, spacing: 10) {
                Text("Notes (optional)")
                    .font(.headline)
                TextField("Anything your kid should know?", text: $notes, axis: .vertical)
                    .lineLimit(3...5)
                    .padding(12)
                    .background(Color(.secondarySystemGroupedBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
    }

    // MARK: - Actions

    private func applySuggestion(_ suggestion: ChoreSuggestion) {
        name = suggestion.name
        rewardDollars = Double(suggestion.rewardCents) / 100.0
        category = suggestion.editorCategory
        selectedIcon = suggestion.icon

        UIImpactFeedbackGenerator(style: .light).impactOccurred()

        // A suggestion carries name, category, icon, and reward — everything
        // except the finishing touches — so skip straight to review.
        withAnimation { step = .reward }
    }

    private func saveChore() {
        guard let childId = selectedChild else { return }

        if manager.chores.count >= manager.choreLimit {
            showingUpgradePrompt = true
            return
        }

        isSaving = true
        errorMessage = nil

        Task {
            do {
                try await manager.createChore(
                    name: name.trimmingCharacters(in: .whitespaces),
                    childId: childId,
                    rewardCents: rewardCents,
                    category: category,
                    icon: selectedIcon,
                    color: selectedColor,
                    notes: notes.isEmpty ? nil : notes
                )
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

#Preview {
    AddChoreWizardView()
        .environmentObject(SupabaseManager.shared)
        .environmentObject(ThemeManager.shared)
}
