import SwiftUI

struct AddEditChildView: View {
    @EnvironmentObject var manager: SupabaseManager
    @Environment(\.dismiss) var dismiss
    
    let childToEdit: Child?
    
    @State private var name: String
    @State private var age: Int
    @State private var selectedColor: String
    @State private var avatarUrl: String?
    @State private var avatarFile: String?
    @State private var childAccessEnabled: Bool
    @State private var childPin: String
    @State private var showingAvatarPicker = false
    @State private var isSaving = false
    @State private var errorMessage: String?
    @State private var showingUpgradePrompt = false
    
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
        _avatarUrl = State(initialValue: child?.avatarUrl)
        _avatarFile = State(initialValue: child?.avatarFile)
        _childAccessEnabled = State(initialValue: child?.childAccessEnabled ?? false)
        _childPin = State(initialValue: child?.childPin ?? "")
    }
    
    var isEditing: Bool {
        childToEdit != nil
    }
    
    var body: some View {
        NavigationView {
            Form {
                Section("Avatar") {
                    HStack {
                        Spacer()
                        
                        VStack(spacing: 12) {
                            // Avatar preview
                            if let avatarUrl = avatarUrl, !avatarUrl.isEmpty {
                                let pngUrl = avatarUrl.convertDiceBearToPNG(size: 200)
                                AsyncImage(url: URL(string: pngUrl)) { phase in
                                    switch phase {
                                    case .success(let image):
                                        image
                                            .resizable()
                                            .aspectRatio(contentMode: .fill)
                                            .frame(width: 100, height: 100)
                                            .clipShape(Circle())
                                            .overlay(Circle().strokeBorder(Color.fromString(selectedColor), lineWidth: 3))
                                            .shadow(color: Color.fromString(selectedColor).opacity(0.4), radius: 8, x: 0, y: 4)
                                    case .failure(_), .empty:
                                        // Show colored circle while loading or on error
                                        Circle()
                                            .fill(Color.fromString(selectedColor))
                                            .frame(width: 100, height: 100)
                                            .overlay(
                                                Text(name.isEmpty ? "?" : String(name.prefix(2).uppercased()))
                                                    .font(.largeTitle)
                                                    .fontWeight(.bold)
                                                    .foregroundColor(.white)
                                            )
                                            .shadow(color: Color.fromString(selectedColor).opacity(0.4), radius: 8, x: 0, y: 4)
                                    @unknown default:
                                        EmptyView()
                                    }
                                }
                            } else if let avatarFile = avatarFile, !avatarFile.isEmpty {
                                // Emoji avatar
                                Circle()
                                    .fill(Color.fromString(selectedColor))
                                    .frame(width: 100, height: 100)
                                    .overlay(
                                        Text(avatarFile)
                                            .font(.system(size: 50))
                                    )
                                    .shadow(color: Color.fromString(selectedColor).opacity(0.4), radius: 8, x: 0, y: 4)
                            } else {
                                // Default color circle
                                Circle()
                                    .fill(Color.fromString(selectedColor))
                                    .frame(width: 100, height: 100)
                                    .overlay(
                                        Text(name.isEmpty ? "?" : String(name.prefix(2).uppercased()))
                                            .font(.largeTitle)
                                            .fontWeight(.bold)
                                            .foregroundColor(.white)
                                    )
                                    .shadow(color: Color.fromString(selectedColor).opacity(0.4), radius: 8, x: 0, y: 4)
                            }
                            
                            // Choose avatar button
                            Button(action: {
                                showingAvatarPicker = true
                            }) {
                                HStack {
                                    Image(systemName: "photo.circle.fill")
                                    Text("Choose Avatar")
                                }
                                .font(.subheadline)
                                .fontWeight(.semibold)
                                .foregroundColor(.choreStarPrimary)
                                .padding(.horizontal, 16)
                                .padding(.vertical, 8)
                                .background(Color.choreStarPrimary.opacity(0.1))
                                .cornerRadius(12)
                            }
                        }
                        
                        Spacer()
                    }
                    .padding(.vertical, 8)
                }
                
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
                
                Section("Child Access") {
                    Toggle("Enable Child Login", isOn: $childAccessEnabled)
                        .tint(.choreStarPrimary)
                    
                    if childAccessEnabled {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("4-Digit PIN")
                                .font(.subheadline)
                                .fontWeight(.semibold)
                                .foregroundColor(.choreStarTextSecondary)
                            
                            SecureField("Enter 4-digit PIN", text: $childPin)
                                .keyboardType(.numberPad)
                                .textFieldStyle(.roundedBorder)
                            
                            Text("This PIN lets \(name.isEmpty ? "your child" : name) access their own chore view")
                                .font(.caption)
                                .foregroundColor(.choreStarTextSecondary)
                        }
                    }
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
            .sheet(isPresented: $showingAvatarPicker) {
                AvatarPickerView { url, file in
                    avatarUrl = url.isEmpty ? nil : url
                    avatarFile = file.isEmpty ? nil : file
                }
            }
            .sheet(isPresented: $showingUpgradePrompt) {
                UpgradePromptView(
                    limitType: .children,
                    currentCount: manager.children.count,
                    limit: manager.childLimit
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
                        saveChild()
                    }
                    .disabled(name.isEmpty || isSaving)
                    .fontWeight(.semibold)
                }
            }
        }
    }
    
    private func saveChild() {
        if !isEditing && manager.children.count >= manager.childLimit {
            showingUpgradePrompt = true
            return
        }
        
        isSaving = true
        errorMessage = nil
        
        Task {
            do {
                if let child = childToEdit {
                    // Update existing child
                    let pinToSave = childAccessEnabled && childPin.count == 4 ? childPin : nil
                    try await manager.updateChild(
                        childId: child.id,
                        name: name,
                        age: age,
                        avatarColor: selectedColor,
                        avatarUrl: avatarUrl,
                        avatarFile: avatarFile,
                        childPin: pinToSave,
                        childAccessEnabled: childAccessEnabled
                    )
                } else {
                    // Create new child
                    try await manager.createChild(
                        name: name,
                        age: age,
                        avatarColor: selectedColor,
                        avatarUrl: avatarUrl,
                        avatarFile: avatarFile
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

