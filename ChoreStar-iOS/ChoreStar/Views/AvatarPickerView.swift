import SwiftUI
import PhotosUI

struct AvatarPickerView: View {
    @Environment(\.dismiss) var dismiss
    let onSelect: (String, String) -> Void // (avatarUrl, avatarFile)
    /// Nil for a child that has not been saved yet — an object path needs an id.
    var childId: UUID? = nil
    /// Called after a photo upload, which writes the row itself rather than
    /// going through onSelect.
    var onPhotoUploaded: (() -> Void)? = nil
    
    @State private var selectedTab: AvatarStyle = .robots
    @State private var selectedSeed: String?
    
    enum AvatarStyle: String, CaseIterable {
        case photo = "Photo"
        case robots = "Robots"
        case adventurers = "Adventurers"
        case funEmojis = "Fun Emojis"
    }
    
    // Seeds for DiceBear avatars
    private let robotSeeds = ["Felix", "Aneka", "Coco", "Dusty", "Midnight", "Patches", "Boo", "Simba", "Lucky", "Missy", "Snickers", "Pumpkin", "Charlie", "Bella", "Max", "Luna", "Cooper", "Daisy", "Buddy", "Sadie"]
    
    private let adventurerSeeds = ["Emma", "Liam", "Olivia", "Noah", "Ava", "Mason", "Sophia", "Lucas", "Mia", "Ethan", "Isabella", "James", "Charlotte", "Benjamin", "Amelia", "Elijah", "Harper", "William", "Evelyn", "Alexander"]
    
    private let emojiAvatars = ["😀", "😎", "🤓", "🥳", "😇", "🤩", "😊", "🙂", "😁", "😆", "🤗", "🥰", "😍", "🤪", "😋", "😛", "🧐", "🤠", "👽", "🤖", "🎃", "👻", "🦄", "🐶", "🐱", "🐼", "🐨", "🦁", "🐯", "🐸"]
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Tab selector
                HStack(spacing: 0) {
                    ForEach(AvatarStyle.allCases, id: \.self) { style in
                        Button(action: {
                            withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                                selectedTab = style
                            }
                        }) {
                            Text(style.rawValue)
                                .font(.subheadline)
                                .fontWeight(.semibold)
                                .foregroundColor(selectedTab == style ? .white : .choreStarTextSecondary)
                                .padding(.horizontal, 16)
                                .padding(.vertical, 12)
                                .background(
                                    RoundedRectangle(cornerRadius: 10)
                                        .fill(selectedTab == style ? Color.choreStarPrimary : Color.clear)
                                )
                        }
                        .buttonStyle(PlainButtonStyle())
                    }
                    Spacer()
                }
                .padding(6)
                .background(Color.choreStarSecondary.opacity(0.15))
                .cornerRadius(12)
                .padding()
                
                if selectedTab == .photo {
                    PhotoAvatarPicker(childId: childId) {
                        onPhotoUploaded?()
                        dismiss()
                    }
                } else {

                // Avatar grid
                ScrollView {
                    LazyVGrid(columns: [
                        GridItem(.adaptive(minimum: 70), spacing: 16)
                    ], spacing: 16) {
                        switch selectedTab {
                        case .photo:
                            // Handled above — the photo tab is a single pane, not a grid.
                            EmptyView()

                        case .robots:
                            ForEach(robotSeeds, id: \.self) { seed in
                                DiceBearAvatarOption(
                                    seed: seed,
                                    style: "bottts",
                                    isSelected: selectedSeed == "bottts-\(seed)",
                                    onTap: {
                                        selectedSeed = "bottts-\(seed)"
                                    }
                                )
                            }
                            
                        case .adventurers:
                            ForEach(adventurerSeeds, id: \.self) { seed in
                                DiceBearAvatarOption(
                                    seed: seed,
                                    style: "adventurer",
                                    isSelected: selectedSeed == "adventurer-\(seed)",
                                    onTap: {
                                        selectedSeed = "adventurer-\(seed)"
                                    }
                                )
                            }
                            
                        case .funEmojis:
                            ForEach(emojiAvatars, id: \.self) { emoji in
                                EmojiAvatarOption(
                                    emoji: emoji,
                                    isSelected: selectedSeed == "emoji-\(emoji)",
                                    onTap: {
                                        selectedSeed = "emoji-\(emoji)"
                                    }
                                )
                            }
                        }
                    }
                    .padding()
                }

                } // end non-photo tabs
            }
            .navigationTitle("Choose Avatar")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                
                // Hidden on the Photo tab: an upload commits the moment it
                // finishes, so there is nothing to confirm.
                ToolbarItem(placement: .confirmationAction) {
                    Button("Select") {
                        if let seed = selectedSeed {
                            // Parse the seed format: "style-seed" or "emoji-emoji"
                            let components = seed.split(separator: "-", maxSplits: 1)
                            if components.count == 2 {
                                let type = String(components[0])
                                let value = String(components[1])
                                
                                if type == "emoji" {
                                    onSelect("", value) // emoji goes in avatarFile
                                } else {
                                    // Use PNG format for iOS compatibility
                                    let url = "https://api.dicebear.com/7.x/\(type)/png?seed=\(value)&size=200"
                                    onSelect(url, value)
                                }
                            }
                        }
                        dismiss()
                    }
                    .disabled(selectedSeed == nil)
                    .opacity(selectedTab == .photo ? 0 : 1)
                    .disabled(selectedSeed == nil)
                    .fontWeight(.semibold)
                }
            }
        }
    }
}

struct DiceBearAvatarOption: View {
    let seed: String
    let style: String
    let isSelected: Bool
    let onTap: () -> Void
    
    private var avatarUrl: String {
        "https://api.dicebear.com/7.x/\(style)/png?seed=\(seed)&size=140"
    }
    
    var body: some View {
        Button(action: onTap) {
            ZStack {
                // Avatar preview using AsyncImage
                AsyncImage(url: URL(string: avatarUrl)) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .frame(width: 70, height: 70)
                            .clipShape(Circle())
                            .overlay(
                                Circle()
                                    .strokeBorder(Color.choreStarBackground, lineWidth: 2)
                            )
                    case .failure(_), .empty:
                        // Show subtle placeholder while loading
                        Circle()
                            .fill(Color.choreStarSecondary.opacity(0.2))
                            .frame(width: 70, height: 70)
                            .overlay(
                                Circle()
                                    .strokeBorder(Color.choreStarBackground, lineWidth: 2)
                            )
                    @unknown default:
                        EmptyView()
                    }
                }
                
                if isSelected {
                    Circle()
                        .strokeBorder(Color.choreStarPrimary, lineWidth: 4)
                        .frame(width: 76, height: 76)
                    
                    Circle()
                        .fill(Color.choreStarPrimary.opacity(0.2))
                        .frame(width: 70, height: 70)
                }
            }
            .scaleEffect(isSelected ? 1.1 : 1.0)
            .animation(.spring(response: 0.3, dampingFraction: 0.6), value: isSelected)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

struct EmojiAvatarOption: View {
    let emoji: String
    let isSelected: Bool
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            ZStack {
                Circle()
                    .fill(
                        LinearGradient(
                            colors: [Color.choreStarSecondary.opacity(0.3), Color.choreStarPrimary.opacity(0.2)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 70, height: 70)
                
                Text(emoji)
                    .font(.system(size: 40))
                
                if isSelected {
                    Circle()
                        .strokeBorder(Color.choreStarPrimary, lineWidth: 4)
                        .frame(width: 76, height: 76)
                }
            }
            .scaleEffect(isSelected ? 1.1 : 1.0)
            .animation(.spring(response: 0.3, dampingFraction: 0.6), value: isSelected)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

#Preview {
    AvatarPickerView { url, file in
        print("Selected: \(url), \(file)")
    }
}


// MARK: - Photo Avatars

/**
 Camera capture for an avatar.

 `PhotosPicker` cannot take a photo — it only browses what already exists — so
 capture needs UIImagePickerController. That is also why Info.plist now carries
 NSCameraUsageDescription: unlike PhotosPicker, which runs out-of-process and
 needs no permission at all, the camera prompts.
 */
struct CameraPicker: UIViewControllerRepresentable {
    let onCapture: (UIImage) -> Void
    @Environment(\.dismiss) private var dismiss

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = .camera
        picker.cameraDevice = .front          // a child photographing themselves
        picker.allowsEditing = true           // free framing before we square-crop
        picker.delegate = context.coordinator
        return picker
    }

    func updateUIViewController(_ picker: UIImagePickerController, context: Context) {}

    func makeCoordinator() -> Coordinator { Coordinator(self) }

    final class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        private let parent: CameraPicker
        init(_ parent: CameraPicker) { self.parent = parent }

        func imagePickerController(
            _ picker: UIImagePickerController,
            didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]
        ) {
            // .editedImage when allowsEditing cropped it, else the original.
            if let image = (info[.editedImage] ?? info[.originalImage]) as? UIImage {
                parent.onCapture(image)
            }
            parent.dismiss()
        }

        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            parent.dismiss()
        }
    }
}

/**
 The "Photo" tab: take a new photo or choose an existing one, then upload.

 Kept in this file rather than a new one because the app target is not a
 file-system-synchronized group — a new .swift file would need hand-editing
 project.pbxproj in four places.
 */
struct PhotoAvatarPicker: View {
    @EnvironmentObject var manager: SupabaseManager
    let childId: UUID?
    let onUploaded: () -> Void

    @State private var showingCamera = false
    @State private var libraryItem: PhotosPickerItem?
    @State private var isUploading = false
    @State private var errorMessage: String?
    @State private var preview: UIImage?

    private var cameraAvailable: Bool {
        UIImagePickerController.isSourceTypeAvailable(.camera)
    }

    var body: some View {
        VStack(spacing: 20) {
            if let preview {
                Image(uiImage: preview)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .frame(width: 140, height: 140)
                    .clipShape(Circle())
                    .overlay(Circle().strokeBorder(Color.choreStarPrimary.opacity(0.3), lineWidth: 3))
            } else {
                ZStack {
                    Circle()
                        .fill(Color.choreStarPrimary.opacity(0.1))
                        .frame(width: 140, height: 140)
                    Image(systemName: "person.crop.circle.badge.plus")
                        .font(.system(size: 52))
                        .foregroundColor(.choreStarPrimary)
                }
            }

            if childId == nil {
                // Uploading needs a child id for the object path, and a brand-new
                // child does not have one until it is saved.
                Text("Save this child first, then add a photo from their edit screen.")
                    .font(.subheadline)
                    .multilineTextAlignment(.center)
                    .foregroundColor(.choreStarTextSecondary)
                    .padding(.horizontal, 32)
            } else {
                VStack(spacing: 12) {
                    if cameraAvailable {
                        Button(action: { showingCamera = true }) {
                            Label("Take a Photo", systemImage: "camera.fill")
                                .font(.headline)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 15)
                                .foregroundColor(.white)
                                .background(Color.choreStarPrimary)
                                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                        }
                        .disabled(isUploading)
                    }

                    PhotosPicker(selection: $libraryItem, matching: .images, photoLibrary: .shared()) {
                        Label("Choose from Library", systemImage: "photo.on.rectangle")
                            .font(.headline)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 15)
                            .foregroundColor(.choreStarPrimary)
                            .background(Color.choreStarPrimary.opacity(0.12))
                            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                    }
                    .disabled(isUploading)
                }
                .padding(.horizontal, 24)

                Text("Stored privately. Only your family can see it, and you can remove it any time.")
                    .font(.caption)
                    .multilineTextAlignment(.center)
                    .foregroundColor(.choreStarTextSecondary)
                    .padding(.horizontal, 32)
            }

            if isUploading {
                HStack(spacing: 8) {
                    ProgressView()
                    Text("Uploading…").font(.subheadline).foregroundColor(.choreStarTextSecondary)
                }
            }

            if let errorMessage {
                Text(errorMessage)
                    .font(.subheadline)
                    .foregroundColor(.choreStarDanger)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 24)
            }

            Spacer(minLength: 0)
        }
        .padding(.top, 24)
        .fullScreenCover(isPresented: $showingCamera) {
            CameraPicker { image in
                preview = image
                upload(image)
            }
            .ignoresSafeArea()
        }
        .onChange(of: libraryItem) { _, item in
            guard let item else { return }
            Task {
                if let data = try? await item.loadTransferable(type: Data.self),
                   let image = UIImage(data: data) {
                    await MainActor.run { preview = image }
                    upload(image)
                } else {
                    await MainActor.run { errorMessage = "That image couldn't be read. Try another." }
                }
            }
        }
    }

    private func upload(_ image: UIImage) {
        guard let childId else { return }
        isUploading = true
        errorMessage = nil
        Task {
            let failure = await manager.uploadChildAvatar(childId: childId, image: image)
            await MainActor.run {
                isUploading = false
                if let failure {
                    errorMessage = failure
                } else {
                    Haptics.success()
                    onUploaded()
                }
            }
        }
    }
}
