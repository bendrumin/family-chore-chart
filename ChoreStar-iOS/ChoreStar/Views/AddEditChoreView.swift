import SwiftUI

struct AddEditChoreView: View {
    @EnvironmentObject var manager: SupabaseManager
    @Environment(\.dismiss) var dismiss
    
    let choreToEdit: Chore?
    
    @State private var name: String
    @State private var selectedChild: UUID?
    @State private var rewardDollars: Double
    @State private var description: String
    @State private var category: String
    @State private var selectedIcon: String
    @State private var selectedColor: String
    @State private var notes: String
    @State private var isSaving = false
    @State private var errorMessage: String?
    
    private let categories = ["Bedroom", "Kitchen", "Bathroom", "Pets", "Homework", "General", "Outdoor", "Personal"]
    
    // Emojis matching web app
    private let icons = [
        // Household
        "📝", "🛏️", "🧹", "🧺", "🍽️", "🚿", "🧽", "🗑️", "🚪", "🪟",
        // Personal
        "👕", "👖", "👟", "🎒", "🧸",
        // School
        "📚", "📖", "✏️", "🎨", "🧠",
        // Tech
        "📱", "💻", "🎮",
        // Pets
        "🐕", "🐱", "🐦", "🐠", "🐹",
        // Nature
        "🌱", "🌺", "🌳", "🌿", "🍃",
        // Transport
        "🚗", "🚲", "🛴", "🏠"
    ]
    
    private let colors = ["blue", "green", "orange", "purple", "pink", "red", "yellow", "teal", "indigo", "mint"]
    
    init(chore: Chore? = nil, preselectedChildId: UUID? = nil) {
        self.choreToEdit = chore
        _name = State(initialValue: chore?.name ?? "")
        _selectedChild = State(initialValue: chore?.childId ?? preselectedChildId)
        _rewardDollars = State(initialValue: chore?.reward ?? 1.0)
        _description = State(initialValue: chore?.description ?? "")
        _category = State(initialValue: chore?.category ?? "General")
        _selectedIcon = State(initialValue: chore?.icon ?? "📝")
        _selectedColor = State(initialValue: chore?.color ?? "blue")
        _notes = State(initialValue: chore?.notes ?? "")
    }
    
    var isEditing: Bool {
        choreToEdit != nil
    }
    
    var body: some View {
        NavigationView {
            Form {
                Section("Chore Details") {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Name")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundColor(.choreStarTextSecondary)
                        
                        TextField("e.g., Make bed", text: $name)
                            .textFieldStyle(.roundedBorder)
                    }
                    
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Description (Optional)")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundColor(.choreStarTextSecondary)
                        
                        TextField("What needs to be done?", text: $description)
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
                        Text("$")
                            .font(.title2)
                            .foregroundColor(.choreStarAccent)
                        
                        TextField("0.00", value: $rewardDollars, format: .number)
                            .keyboardType(.decimalPad)
                            .font(.title2)
                            .fontWeight(.semibold)
                        
                        Stepper("", value: $rewardDollars, in: 0...100, step: 0.25)
                    }
                    
                    Text("Current: \(String(format: "$%.2f", rewardDollars))")
                        .font(.caption)
                        .foregroundColor(.choreStarTextSecondary)
                }
                
                Section("Category") {
                    Picker("Category", selection: $category) {
                        ForEach(categories, id: \.self) { cat in
                            Text(cat).tag(cat)
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
            .navigationBarTitleDisplayMode(.inline)
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
    
    private func saveChore() {
        guard let childId = selectedChild else {
            errorMessage = "Please select a child"
            return
        }
        
        isSaving = true
        errorMessage = nil
        
        Task {
            do {
                let rewardCents = Int(rewardDollars * 100)
                
                if let chore = choreToEdit {
                    // Update existing chore
                    try await manager.updateChore(
                        choreId: chore.id,
                        name: name,
                        childId: childId,
                        rewardCents: rewardCents,
                        description: description.isEmpty ? nil : description,
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
                        description: description.isEmpty ? nil : description,
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
                
                // Display emoji
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
            category: "Bedroom",
            icon: "bed.double",
            color: "blue",
            notes: "Fold the corners nicely",
            createdAt: Date(),
            updatedAt: Date()
        )
    )
    .environmentObject(SupabaseManager.shared)
}

