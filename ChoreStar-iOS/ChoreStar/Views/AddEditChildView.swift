import SwiftUI

struct AddEditChildView: View {
    @EnvironmentObject var manager: SupabaseManager
    @Environment(\.dismiss) var dismiss
    
    let childToEdit: Child?
    
    @State private var name: String
    @State private var age: Int
    @State private var selectedColor: String
    @State private var isSaving = false
    @State private var errorMessage: String?
    
    private let availableColors = [
        "red", "blue", "green", "orange", "purple", "pink",
        "yellow", "teal", "indigo", "mint", "cyan", "brown",
        "coral", "turquoise", "rose", "emerald"
    ]
    
    init(child: Child? = nil) {
        self.childToEdit = child
        _name = State(initialValue: child?.name ?? "")
        _age = State(initialValue: child?.age ?? 5)
        _selectedColor = State(initialValue: child?.avatarColor ?? "blue")
    }
    
    var isEditing: Bool {
        childToEdit != nil
    }
    
    var body: some View {
        NavigationView {
            Form {
                Section("Child Information") {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Name")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundColor(.choreStarTextSecondary)
                        
                        TextField("Enter name", text: $name)
                            .textFieldStyle(.roundedBorder)
                    }
                    
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Age")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundColor(.choreStarTextSecondary)
                        
                        Stepper("\(age) years old", value: $age, in: 1...18)
                    }
                }
                
                Section("Avatar Color") {
                    LazyVGrid(columns: [
                        GridItem(.adaptive(minimum: 60))
                    ], spacing: 12) {
                        ForEach(availableColors, id: \.self) { colorName in
                            ColorOption(
                                colorName: colorName,
                                isSelected: selectedColor == colorName,
                                onTap: { selectedColor = colorName }
                            )
                        }
                    }
                    .padding(.vertical, 8)
                }
                
                if let errorMessage = errorMessage {
                    Section {
                        Text(errorMessage)
                            .foregroundColor(.red)
                            .font(.caption)
                    }
                }
            }
            .navigationTitle(isEditing ? "Edit Child" : "Add Child")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .confirmationAction) {
                    Button(isEditing ? "Save" : "Add") {
                        saveChild()
                    }
                    .disabled(name.isEmpty || isSaving)
                    .fontWeight(.semibold)
                }
            }
        }
    }
    
    private func saveChild() {
        isSaving = true
        errorMessage = nil
        
        Task {
            do {
                if let child = childToEdit {
                    // Update existing child
                    try await manager.updateChild(
                        childId: child.id,
                        name: name,
                        age: age,
                        avatarColor: selectedColor,
                        childPin: nil,
                        childAccessEnabled: nil
                    )
                } else {
                    // Create new child
                    try await manager.createChild(
                        name: name,
                        age: age,
                        avatarColor: selectedColor
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

struct ColorOption: View {
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
                    .frame(width: 50, height: 50)
                    .shadow(color: Color.fromString(colorName).opacity(0.4), radius: 6, x: 0, y: 3)
                
                if isSelected {
                    Circle()
                        .strokeBorder(Color.white, lineWidth: 3)
                        .frame(width: 50, height: 50)
                    
                    Circle()
                        .strokeBorder(Color.choreStarPrimary, lineWidth: 3)
                        .frame(width: 58, height: 58)
                    
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 20))
                        .foregroundColor(.white)
                        .shadow(color: .black.opacity(0.3), radius: 2, x: 0, y: 1)
                }
            }
            .scaleEffect(isSelected ? 1.1 : 1.0)
            .animation(.spring(response: 0.3, dampingFraction: 0.6), value: isSelected)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

#Preview {
    AddEditChildView()
        .environmentObject(SupabaseManager.shared)
}

#Preview("Edit Mode") {
    AddEditChildView(
        child: Child(
            id: UUID(),
            name: "Emma",
            age: 8,
            avatarColor: "pink",
            avatarUrl: nil,
            avatarFile: nil,
            userId: UUID(),
            childPin: nil,
            childAccessEnabled: false,
            createdAt: Date(),
            updatedAt: Date()
        )
    )
    .environmentObject(SupabaseManager.shared)
}

