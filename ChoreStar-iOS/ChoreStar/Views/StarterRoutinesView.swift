import SwiftUI

/// One-tap gallery of the built-in routine templates. The builder has always
/// had these as "Quick Start" prefills, but you had to open the builder to
/// find them — this sheet makes them browsable from the routines list and
/// creates a ready-to-run routine directly, so a new family can see what
/// routines look like without building one first.
struct StarterRoutinesView: View {
    @EnvironmentObject var manager: SupabaseManager
    @Environment(\.dismiss) var dismiss

    @State private var selectedChild: UUID?
    /// Template names already added this visit, per child, so the button
    /// flips to "Added" instead of silently duplicating.
    @State private var added: Set<String> = []
    @State private var savingTemplate: String?
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            Group {
                if manager.children.isEmpty {
                    noChildrenState
                } else {
                    templateList
                }
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Starter Routines")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
            .onAppear {
                if selectedChild == nil {
                    selectedChild = manager.children.first?.id
                }
            }
        }
    }

    private var noChildrenState: some View {
        VStack(spacing: 12) {
            Text("👨‍👩‍👧‍👦")
                .font(.system(size: 50))
            Text("Add a child first")
                .font(.headline)
            Text("Routines belong to a kid. Add one on the Family tab, then come back here.")
                .font(.subheadline)
                .foregroundColor(.choreStarTextSecondary)
                .multilineTextAlignment(.center)
        }
        .padding(40)
    }

    private var templateList: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                VStack(alignment: .leading, spacing: 10) {
                    Text("Who are these for?")
                        .font(.headline)
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 10) {
                            ForEach(manager.children) { child in
                                let isSelected = selectedChild == child.id
                                Button {
                                    selectedChild = child.id
                                    added = []
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

                if let errorMessage {
                    Text(errorMessage)
                        .font(.caption)
                        .foregroundColor(.red)
                }

                ForEach(RoutineTemplate.all, id: \.name) { template in
                    templateCard(template)
                }
            }
            .padding()
        }
    }

    private func templateCard(_ template: RoutineTemplate) -> some View {
        let color = Color.fromHex(template.type.defaultColor)
        let isAdded = added.contains(template.name)
        let isSaving = savingTemplate == template.name

        return VStack(alignment: .leading, spacing: 12) {
            HStack {
                AdaptiveIcon(icon: template.icon, fallbackSymbol: "list.bullet", tint: color, iconSize: 24)
                    .frame(width: 40, height: 40)
                    .background(color.opacity(0.12))
                    .clipShape(RoundedRectangle(cornerRadius: 10))

                VStack(alignment: .leading, spacing: 2) {
                    Text(template.name)
                        .font(.headline)
                    Text("\(template.steps.count) steps · \(template.type.displayName)")
                        .font(.caption)
                        .foregroundColor(.choreStarTextSecondary)
                }

                Spacer()

                Button {
                    add(template)
                } label: {
                    Group {
                        if isSaving {
                            ProgressView()
                        } else {
                            Label(isAdded ? "Added" : "Add", systemImage: isAdded ? "checkmark" : "plus")
                                .fontWeight(.semibold)
                        }
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 8)
                    .background(isAdded ? Color.green.opacity(0.15) : color.opacity(0.15))
                    .foregroundColor(isAdded ? .green : color)
                    .clipShape(Capsule())
                }
                .buttonStyle(.plain)
                .disabled(isAdded || isSaving || selectedChild == nil)
            }

            VStack(alignment: .leading, spacing: 8) {
                ForEach(Array(template.steps.enumerated()), id: \.offset) { index, step in
                    HStack(spacing: 10) {
                        Text("\(index + 1)")
                            .font(.caption2)
                            .fontWeight(.bold)
                            .foregroundColor(color)
                            .frame(width: 20, height: 20)
                            .background(color.opacity(0.12))
                            .clipShape(Circle())
                        AdaptiveIcon(icon: step.icon, fallbackSymbol: "circle", tint: color, iconSize: 16)
                            .frame(width: 18)
                        Text(step.title)
                            .font(.subheadline)
                        Spacer()
                        if let seconds = step.durationSeconds {
                            Text(seconds >= 60 ? "\(seconds / 60) min" : "\(seconds) sec")
                                .font(.caption)
                                .foregroundColor(.choreStarTextSecondary)
                        }
                    }
                }
            }
        }
        .padding(16)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private func add(_ template: RoutineTemplate) {
        guard let childId = selectedChild else { return }
        savingTemplate = template.name
        errorMessage = nil

        Task {
            do {
                try await manager.createRoutine(
                    name: template.name,
                    childId: childId,
                    type: template.type.rawValue,
                    icon: template.icon,
                    color: template.type.defaultColor,
                    rewardCents: 7,
                    steps: template.steps
                )
                await MainActor.run {
                    added.insert(template.name)
                    savingTemplate = nil
                    UINotificationFeedbackGenerator().notificationOccurred(.success)
                }
            } catch {
                await MainActor.run {
                    errorMessage = "Couldn't add \(template.name): \(error.localizedDescription)"
                    savingTemplate = nil
                }
            }
        }
    }
}

#Preview {
    StarterRoutinesView()
        .environmentObject(SupabaseManager.shared)
}
