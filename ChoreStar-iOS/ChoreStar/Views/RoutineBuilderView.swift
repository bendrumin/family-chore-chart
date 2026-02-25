import SwiftUI

struct RoutineBuilderView: View {
    @EnvironmentObject var manager: SupabaseManager
    @Environment(\.dismiss) var dismiss
    
    var existingRoutine: Routine?
    
    @State private var name = ""
    @State private var selectedChildId: UUID?
    @State private var selectedType: RoutineType = .morning
    @State private var selectedIcon = "sunrise.fill"
    @State private var selectedColor = "#f59e0b"
    @State private var rewardCents = 7
    @State private var steps: [EditableStep] = []
    @State private var isSaving = false
    @State private var errorMessage: String?
    
    struct EditableStep: Identifiable {
        let id: UUID
        var title: String
        var icon: String
        var durationMinutes: Int?
    }
    
    private var isEditing: Bool { existingRoutine != nil }
    
    private let availableIcons = [
        "sunrise.fill", "moon.stars.fill", "backpack.fill", "star.fill",
        "hands.sparkles.fill", "fork.knife", "book.fill", "figure.walk",
        "mouth.fill", "tshirt.fill", "shower.fill", "bed.double.fill",
        "gamecontroller.fill", "music.note", "paintbrush.fill", "pencil",
        "trash.fill", "leaf.fill", "heart.fill", "bolt.fill",
        "clock.fill", "bell.fill", "house.fill", "car.fill",
    ]
    
    private let availableColors = [
        "#f59e0b", "#8b5cf6", "#10b981", "#6366f1",
        "#ef4444", "#ec4899", "#14b8a6", "#f97316",
    ]
    
    var body: some View {
        NavigationView {
            Form {
                if !isEditing {
                    templatesSection
                }
                
                detailsSection
                stepsSection
                
                if let errorMessage = errorMessage {
                    Section {
                        Text(errorMessage)
                            .foregroundColor(.red)
                            .font(.subheadline)
                    }
                }
            }
            .navigationTitle(isEditing ? "Edit Routine" : "New Routine")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(isEditing ? "Save" : "Create") {
                        saveRoutine()
                    }
                    .disabled(isSaving || name.isEmpty || selectedChildId == nil || steps.isEmpty)
                    .fontWeight(.bold)
                }
            }
            .onAppear {
                if let routine = existingRoutine {
                    name = routine.name
                    selectedChildId = routine.childId
                    selectedType = RoutineType(rawValue: routine.type) ?? .custom
                    selectedIcon = routine.icon
                    selectedColor = routine.color
                    rewardCents = routine.rewardCents
                    steps = routine.steps.map { step in
                        EditableStep(
                            id: step.id,
                            title: step.title,
                            icon: step.icon,
                            durationMinutes: step.durationSeconds.map { $0 / 60 }
                        )
                    }
                } else if selectedChildId == nil {
                    selectedChildId = manager.children.first?.id
                }
            }
        }
    }
    
    // MARK: - Templates
    
    private var templatesSection: some View {
        Section("Quick Start Templates") {
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                ForEach(RoutineTemplate.all, id: \.name) { template in
                    Button {
                        applyTemplate(template)
                    } label: {
                        VStack(spacing: 8) {
                            Image(systemName: template.icon)
                                .font(.title2)
                                .foregroundColor(Color.fromHex(template.type.defaultColor))
                            
                            Text(template.name)
                                .font(.caption)
                                .fontWeight(.semibold)
                                .foregroundColor(.choreStarTextPrimary)
                                .multilineTextAlignment(.center)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(Color.fromHex(template.type.defaultColor).opacity(0.1))
                        .cornerRadius(12)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .strokeBorder(Color.fromHex(template.type.defaultColor).opacity(0.3), lineWidth: 1)
                        )
                    }
                    .buttonStyle(PlainButtonStyle())
                }
            }
        }
    }
    
    // MARK: - Details
    
    private var detailsSection: some View {
        Section("Routine Details") {
            TextField("Routine Name", text: $name)
            
            Picker("Assign To", selection: $selectedChildId) {
                ForEach(manager.children) { child in
                    Text(child.name).tag(child.id as UUID?)
                }
            }
            
            Picker("Type", selection: $selectedType) {
                ForEach(RoutineType.allCases, id: \.self) { type in
                    Label(type.displayName, systemImage: type.systemImage)
                        .tag(type)
                }
            }
            .onChange(of: selectedType) { _, newValue in
                selectedColor = newValue.defaultColor
                selectedIcon = newValue.systemImage
            }
            
            // Icon picker
            VStack(alignment: .leading, spacing: 8) {
                Text("Icon")
                    .font(.subheadline)
                    .foregroundColor(.choreStarTextSecondary)
                
                LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 8), spacing: 8) {
                    ForEach(availableIcons, id: \.self) { icon in
                        Button {
                            selectedIcon = icon
                        } label: {
                            Image(systemName: icon)
                                .font(.body)
                                .foregroundColor(selectedIcon == icon ? .white : .choreStarTextPrimary)
                                .frame(width: 36, height: 36)
                                .background(selectedIcon == icon ? Color.choreStarPrimary : Color.choreStarBackground)
                                .cornerRadius(8)
                        }
                        .buttonStyle(PlainButtonStyle())
                    }
                }
            }
            
            // Color picker
            VStack(alignment: .leading, spacing: 8) {
                Text("Color")
                    .font(.subheadline)
                    .foregroundColor(.choreStarTextSecondary)
                
                HStack(spacing: 8) {
                    ForEach(availableColors, id: \.self) { color in
                        Button {
                            selectedColor = color
                        } label: {
                            Circle()
                                .fill(Color.fromHex(color))
                                .frame(width: 32, height: 32)
                                .overlay(
                                    Circle()
                                        .strokeBorder(Color.white, lineWidth: selectedColor == color ? 3 : 0)
                                )
                                .overlay(
                                    Circle()
                                        .strokeBorder(Color.fromHex(color).opacity(0.5), lineWidth: selectedColor == color ? 1 : 0)
                                        .padding(-2)
                                )
                        }
                        .buttonStyle(PlainButtonStyle())
                    }
                }
            }
            
            Stepper("Reward: \(rewardCents)¢ ($\(String(format: "%.2f", Double(rewardCents) / 100.0)))",
                    value: $rewardCents, in: 1...100)
        }
    }
    
    // MARK: - Steps
    
    private var stepsSection: some View {
        Section("Steps (\(steps.count))") {
            if steps.isEmpty {
                HStack {
                    Spacer()
                    VStack(spacing: 8) {
                        Image(systemName: "list.number")
                            .font(.title)
                            .foregroundColor(.choreStarTextSecondary)
                        Text("Add at least one step")
                            .font(.subheadline)
                            .foregroundColor(.choreStarTextSecondary)
                    }
                    .padding(.vertical, 20)
                    Spacer()
                }
            }
            
            ForEach(Array(steps.enumerated()), id: \.element.id) { index, step in
                HStack(spacing: 12) {
                    Text("\(index + 1)")
                        .font(.caption)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                        .frame(width: 24, height: 24)
                        .background(Color.fromHex(selectedColor))
                        .clipShape(Circle())
                    
                    VStack(alignment: .leading, spacing: 4) {
                        TextField("Step title", text: Binding(
                            get: { steps[index].title },
                            set: { steps[index].title = $0 }
                        ))
                        .font(.subheadline)
                        
                        HStack {
                            Image(systemName: steps[index].icon)
                                .font(.caption)
                                .foregroundColor(.choreStarTextSecondary)
                            
                            if let minutes = steps[index].durationMinutes, minutes > 0 {
                                Text("\(minutes) min")
                                    .font(.caption)
                                    .foregroundColor(.choreStarTextSecondary)
                            }
                        }
                    }
                    
                    Spacer()
                    
                    Stepper("", value: Binding(
                        get: { steps[index].durationMinutes ?? 0 },
                        set: { steps[index].durationMinutes = $0 > 0 ? $0 : nil }
                    ), in: 0...60)
                    .labelsHidden()
                    .frame(width: 94)
                }
            }
            .onDelete { indexSet in
                steps.remove(atOffsets: indexSet)
            }
            .onMove { source, destination in
                steps.move(fromOffsets: source, toOffset: destination)
            }
            
            Button {
                steps.append(EditableStep(id: UUID(), title: "", icon: "circle", durationMinutes: nil))
            } label: {
                Label("Add Step", systemImage: "plus.circle.fill")
                    .foregroundColor(.choreStarPrimary)
            }
        }
    }
    
    // MARK: - Actions
    
    private func applyTemplate(_ template: RoutineTemplate) {
        name = template.name
        selectedType = template.type
        selectedIcon = template.icon
        selectedColor = template.type.defaultColor
        
        steps = template.steps.map { step in
            EditableStep(
                id: UUID(),
                title: step.title,
                icon: step.icon,
                durationMinutes: step.durationSeconds.map { $0 / 60 }
            )
        }
    }
    
    private func saveRoutine() {
        guard let childId = selectedChildId else { return }
        let validSteps = steps.filter { !$0.title.isEmpty }
        guard !validSteps.isEmpty else {
            errorMessage = "Add at least one step with a title."
            return
        }
        
        isSaving = true
        errorMessage = nil
        
        let stepData = validSteps.map { step in
            (title: step.title, icon: step.icon, durationSeconds: step.durationMinutes.map { $0 * 60 } as Int?)
        }
        
        Task {
            do {
                if let existing = existingRoutine {
                    try await manager.updateRoutine(
                        routineId: existing.id,
                        name: name,
                        childId: childId,
                        type: selectedType.rawValue,
                        icon: selectedIcon,
                        color: selectedColor,
                        rewardCents: rewardCents,
                        steps: stepData
                    )
                } else {
                    try await manager.createRoutine(
                        name: name,
                        childId: childId,
                        type: selectedType.rawValue,
                        icon: selectedIcon,
                        color: selectedColor,
                        rewardCents: rewardCents,
                        steps: stepData
                    )
                }
                
                await MainActor.run {
                    dismiss()
                }
            } catch {
                await MainActor.run {
                    errorMessage = "Failed to save: \(error.localizedDescription)"
                    isSaving = false
                }
            }
        }
    }
}

#Preview {
    RoutineBuilderView()
        .environmentObject(SupabaseManager.shared)
}
