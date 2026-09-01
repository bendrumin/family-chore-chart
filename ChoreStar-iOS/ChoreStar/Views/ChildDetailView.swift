import SwiftUI
import StoreKit

struct ChildDetailView: View {
    let child: Child
    @EnvironmentObject var manager: SupabaseManager
    @Environment(\.dismiss) var dismiss
    @State private var showingAddChore = false
    // Presented at this level rather than inside ChildChoreCard — see
    // ChoresView.editingChore for why row-owned sheets crash on save.
    @State private var editingChore: Chore?
    // Lifted like editingChore: a card-owned alert dies (or re-binds to a
    // neighboring card, deleting the wrong chore) when the refetch replaces
    // the chores array underneath it.
    @State private var choreToDelete: Chore?
    @State private var deleteErrorText: String?
    @State private var showWeekView = false
    
    /// Every chore the child has, whatever day it falls on.
    private var childChores: [Chore] {
        manager.chores.filter { $0.childId == child.id }
    }

    /// The part of the list that is due today.
    private var todayChores: [Chore] {
        childChores.filter { $0.isDueToday }
    }

    /// Chores scheduled for other days. Shown so the parent can still find
    /// and edit them; ticking one credits it as an extra for today.
    private var otherDayChores: [Chore] {
        childChores.filter { !$0.isDueToday }
    }

    private var completedChores: [Chore] {
        todayChores.filter { manager.isChoreCompleted($0) }
    }

    private var pendingChores: [Chore] {
        todayChores.filter { !manager.isChoreCompleted($0) }
    }
    
    private var totalEarnings: Double {
        // Only earn money when ALL chores for today are completed
        manager.calculateTodayEarnings(for: child.id)
    }
    
    private var completionPercentage: Double {
        guard todayChores.count > 0 else { return 0 }
        return Double(completedChores.count) / Double(todayChores.count)
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
                            value: manager.formatMoney(totalEarnings),
                            label: "Earned",
                            color: .choreStarAccent
                        )
                        
                        NavigationLink(destination: AchievementsView(child: child)) {
                            StatCard(
                                icon: "trophy.fill",
                                value: "\(manager.getAchievements(for: child.id).count)",
                                label: "Badges",
                                color: .choreStarWarning
                            )
                        }
                        .buttonStyle(PlainButtonStyle())
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
                    // Allowance, goal, and payout (2.0).
                    ParentGoalSection(child: child)
                        .task { await manager.loadWallet(for: child.id) }

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
                                    ChildChoreCard(
                                        chore: chore,
                                        manager: manager,
                                        onEdit: { editingChore = chore },
                                        onDelete: { choreToDelete = chore }
                                    )
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
                                    ChildChoreCard(
                                        chore: chore,
                                        manager: manager,
                                        onEdit: { editingChore = chore },
                                        onDelete: { choreToDelete = chore }
                                    )
                                    .padding(.horizontal, 20)
                                }
                            }
                        }

                        // Scheduled for other days
                        if !otherDayChores.isEmpty {
                            VStack(alignment: .leading, spacing: 12) {
                                Text("Other Days")
                                    .font(.headline)
                                    .foregroundColor(.choreStarTextSecondary)
                                    .padding(.horizontal, 20)

                                ForEach(otherDayChores) { chore in
                                    ChildChoreCard(
                                        chore: chore,
                                        manager: manager,
                                        onEdit: { editingChore = chore },
                                        onDelete: { choreToDelete = chore }
                                    )
                                    .padding(.horizontal, 20)
                                    .opacity(0.75)
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
            ToolbarItem(placement: .navigationBarTrailing) {
                HStack(spacing: 16) {
                    // Week Calendar View button
                    Button(action: {
                        showWeekView = true
                    }) {
                        Image(systemName: "calendar")
                            .font(.title3)
                            .foregroundColor(.choreStarPrimary)
                    }
                    
                    // Add Chore button
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
            AddChoreWizardView(preselectedChildId: child.id)
        }
        .sheet(item: $editingChore) { chore in
            AddEditChoreView(chore: chore)
        }
        .alert(
            "Delete \(choreToDelete?.name ?? "this chore")?",
            isPresented: Binding(
                get: { choreToDelete != nil },
                set: { if !$0 { choreToDelete = nil } }
            ),
            presenting: choreToDelete
        ) { chore in
            Button("Cancel", role: .cancel) { }
            Button("Delete", role: .destructive) {
                Task {
                    do {
                        try await manager.deleteChore(choreId: chore.id)
                    } catch {
                        await MainActor.run {
                            deleteErrorText = "Couldn't delete \(chore.name). Please try again."
                        }
                    }
                }
            }
        } message: { _ in
            Text("This action cannot be undone.")
        }
        .alert(
            "Delete Failed",
            isPresented: Binding(
                get: { deleteErrorText != nil },
                set: { if !$0 { deleteErrorText = nil } }
            )
        ) {
            Button("OK", role: .cancel) { }
        } message: {
            Text(deleteErrorText ?? "")
        }
        .sheet(isPresented: $showWeekView) {
            NavigationStack {
                WeekCalendarView(child: child)
                    .environmentObject(manager)
                    .toolbar {
                        ToolbarItem(placement: .navigationBarTrailing) {
                            Button("Done") {
                                showWeekView = false
                            }
                        }
                    }
            }
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
    let onEdit: () -> Void
    let onDelete: () -> Void
    
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
                    let _ = await manager.toggleChoreCompletion(chore)
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
            
            // Reward — hidden on the flat rate, where per-chore amounts are
            // ignored by the earnings math.
            if manager.isPerChoreRewardMode {
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
            Button(action: { onEdit() }) {
                Label("Edit", systemImage: "pencil")
            }

            Button(role: .destructive, action: { onDelete() }) {
                Label("Delete", systemImage: "trash")
            }
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
    NavigationStack {
        ChildDetailView(
            child: Child(
                id: UUID(),
                name: "Emma",
                age: 8,
                avatarColor: "pink",
                avatarUrl: nil,
                avatarFile: nil,
                avatarPhotoPath: nil,
                userId: UUID(),
                createdAt: Date(),
                updatedAt: Date()
            )
        )
        .environmentObject(SupabaseManager.shared)
    }
}

// MARK: - Allowance & goal (parent side, 2.0)

/// What the child has saved and what they are saving for, with Paid Out and
/// Pay-toward-goal. The iPhone app never had a payout button; the balance
/// only lived on the web. Mirrors components/dashboard/weekly-stats.tsx.
struct ParentGoalSection: View {
    let child: Child
    @EnvironmentObject var manager: SupabaseManager
    @State private var busy = false
    @State private var message: String?
    @State private var editing = false
    @Environment(\.requestReview) private var requestReview

    private var wallet: SupabaseManager.KidWallet? { manager.wallets[child.id] }
    private func money(_ cents: Int) -> String { manager.formatMoney(Double(cents) / 100.0) }

    var body: some View {
        if let wallet {
            VStack(alignment: .leading, spacing: 14) {
                HStack {
                    Label("Allowance", systemImage: "wallet.pass.fill")
                        .font(.headline)
                        .foregroundColor(.choreStarTextPrimary)
                    Spacer()
                    Text(wallet.owedCents > 0 ? "\(money(wallet.owedCents)) owed" : "All paid up")
                        .font(.subheadline.weight(.bold))
                        .foregroundColor(wallet.owedCents > 0 ? .choreStarWarning : .choreStarTextSecondary)
                }

                if let goal = wallet.goal {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack(spacing: 8) {
                            Text(goal.emoji ?? "🎯").font(.title2)
                            VStack(alignment: .leading, spacing: 1) {
                                Text("Saving for \(goal.title)")
                                    .font(.subheadline.weight(.bold))
                                    .foregroundColor(.choreStarTextPrimary)
                                Text("\(money(goal.progressCents)) of \(money(goal.targetCents))\(goal.reached ? " · reached!" : "")")
                                    .font(.caption)
                                    .foregroundColor(.choreStarTextSecondary)
                            }
                            Spacer()
                            Button { editing = true } label: {
                                Image(systemName: "pencil")
                                    .font(.caption.weight(.bold))
                                    .frame(width: 32, height: 32)
                                    .background(Color.choreStarTextSecondary.opacity(0.12))
                                    .clipShape(Circle())
                            }
                            .buttonStyle(.plain)
                            .accessibilityLabel("Change \(child.name)'s goal")
                        }
                        GeometryReader { geo in
                            ZStack(alignment: .leading) {
                                Capsule().fill(Color.choreStarBackground)
                                Capsule()
                                    .fill(goal.reached ? Color.choreStarWarning : ThemeManager.shared.accentColor)
                                    .frame(width: geo.size.width * CGFloat(min(goal.percent, 100)) / 100)
                            }
                        }
                        .frame(height: 8)
                    }
                } else {
                    Button { editing = true } label: {
                        Label("Set a goal for \(child.name)", systemImage: "target")
                            .font(.subheadline.weight(.semibold))
                    }
                    .buttonStyle(.plain)
                    .foregroundColor(.choreStarLink)
                }

                HStack(spacing: 10) {
                    Button {
                        Task { await pay(goalId: nil) }
                    } label: {
                        Text("Paid Out")
                            .font(.subheadline.weight(.bold))
                            .frame(maxWidth: .infinity)
                            .frame(height: 42)
                            .background(Color.choreStarTextSecondary.opacity(0.12))
                            .foregroundColor(.choreStarTextPrimary)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                    .buttonStyle(.plain)
                    .disabled(busy || wallet.owedCents <= 0)

                    if let goal = wallet.goal {
                        Button {
                            Task { await pay(goalId: goal.id) }
                        } label: {
                            Text(goal.reached ? "Pay out the goal" : "Pay toward goal")
                                .font(.subheadline.weight(.bold))
                                .frame(maxWidth: .infinity)
                                .frame(height: 42)
                                .background(goal.reached ? AnyShapeStyle(ThemeManager.shared.gradient) : AnyShapeStyle(Color.choreStarPrimary.opacity(0.12)))
                                .foregroundColor(goal.reached ? .white : .choreStarPrimary)
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                        }
                        .buttonStyle(.plain)
                        .disabled(busy || wallet.owedCents <= 0)
                    }
                }

                if let message {
                    Text(message)
                        .font(.caption.weight(.semibold))
                        .foregroundColor(.choreStarTextSecondary)
                }
            }
            .appCard()
            .padding(.horizontal, 20)
            .sheet(isPresented: $editing) {
                GoalEditorSheet(child: child, goal: wallet.goal)
                    .environmentObject(manager)
            }
        }
    }

    private func pay(goalId: UUID?) async {
        busy = true
        let result = await manager.payOut(childId: child.id, goalId: goalId)
        await MainActor.run {
            busy = false
            if let paid = result.paidCents {
                Haptics.success()
                message = goalId == nil
                    ? "Paid \(child.name) \(money(paid))."
                    : "Paid \(child.name) \(money(paid)) toward the goal. Goal reached!"
                // Money just changed hands, the happiest parent-side moment
                // there is. ReviewPrompter keeps the ask rare.
                if ReviewPrompter.recordMoneyMomentAndCheck() {
                    DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) {
                        requestReview()
                    }
                }
            } else {
                message = result.error
            }
        }
    }
}
