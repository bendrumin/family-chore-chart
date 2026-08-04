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
        // Kept short so four tabs fit one line. "Adventurers" and "Fun Emojis"
        // pushed the row past the screen width and the labels wrapped.
        case photo = "Photo"
        case robots = "Robots"
        case adventurers = "People"
        case funEmojis = "Emojis"
    }
    
    // Seeds for DiceBear avatars
    private let robotSeeds = ["Felix", "Aneka", "Coco", "Dusty", "Midnight", "Patches", "Boo", "Simba", "Lucky", "Missy", "Snickers", "Pumpkin", "Charlie", "Bella", "Max", "Luna", "Cooper", "Daisy", "Buddy", "Sadie"]
    
    private let adventurerSeeds = ["Emma", "Liam", "Olivia", "Noah", "Ava", "Mason", "Sophia", "Lucas", "Mia", "Ethan", "Isabella", "James", "Charlotte", "Benjamin", "Amelia", "Elijah", "Harper", "William", "Evelyn", "Alexander"]
    
    private let emojiAvatars = ["😀", "😎", "🤓", "🥳", "😇", "🤩", "😊", "🙂", "😁", "😆", "🤗", "🥰", "😍", "🤪", "😋", "😛", "🧐", "🤠", "👽", "🤖", "🎃", "👻", "🦄", "🐶", "🐱", "🐼", "🐨", "🦁", "🐯", "🐸"]
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Tab selector.
                //
                // Scrollable, single-line, and non-shrinking. A plain HStack made
                // the four labels wrap to two lines; lineLimit alone would have
                // truncated them instead on a narrow phone or at a large Dynamic
                // Type size, so the row scrolls when it genuinely cannot fit.
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 4) {
                        ForEach(AvatarStyle.allCases, id: \.self) { style in
                            Button(action: {
                                withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                                    selectedTab = style
                                }
                            }) {
                                Text(style.rawValue)
                                    .font(.subheadline)
                                    .fontWeight(.semibold)
                                    .lineLimit(1)
                                    .fixedSize(horizontal: true, vertical: false)
                                    .foregroundColor(selectedTab == style ? .white : .choreStarTextSecondary)
                                    .padding(.horizontal, 14)
                                    .padding(.vertical, 12)
                                    .background(
                                        RoundedRectangle(cornerRadius: 10)
                                            .fill(selectedTab == style ? Color.choreStarPrimary : Color.clear)
                                    )
                            }
                            .buttonStyle(PlainButtonStyle())
                        }
                    }
                    .padding(6)
                }
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
    /// Square-cropped and awaiting props. Set between picking and uploading, so
    /// the editor works on exactly the pixels that will be stored.
    @State private var pendingImage: UIImage?

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
                pendingImage = SupabaseManager.squareAvatarImage(image)
            }
            .ignoresSafeArea()
        }
        .fullScreenCover(item: Binding(
            get: { pendingImage.map(IdentifiableImage.init) },
            set: { if $0 == nil { pendingImage = nil } }
        )) { wrapper in
            AvatarStickerEditor(
                baseImage: wrapper.image,
                onCancel: {
                    pendingImage = nil
                    libraryItem = nil
                },
                onDone: { composited in
                    pendingImage = nil
                    libraryItem = nil
                    preview = composited
                    upload(composited)
                }
            )
        }
        .onChange(of: libraryItem) { _, item in
            guard let item else { return }
            Task {
                if let data = try? await item.loadTransferable(type: Data.self),
                   let image = UIImage(data: data) {
                    await MainActor.run { pendingImage = SupabaseManager.squareAvatarImage(image) }
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

// MARK: - Avatar Props (the fun bit)

/**
 A decoration that can be dropped onto an avatar photo.

 Most are emoji, which render identically everywhere and need no bundled assets.
 The moustache is drawn with bezier curves because Unicode has no standalone
 moustache — 🥸 is a whole disguised face, not a prop you can put on someone.
 */
enum AvatarProp: String, CaseIterable, Identifiable {
    case moustache, glasses, sunglasses, tophat, crown, cap, bow, star, sparkles, rainbow, unicorn, party

    var id: String { rawValue }

    /// Emoji for every prop except the drawn one.
    var glyph: String {
        switch self {
        case .moustache:  return "〰️"
        case .glasses:    return "👓"
        case .sunglasses: return "🕶️"
        case .tophat:     return "🎩"
        case .crown:      return "👑"
        case .cap:        return "🧢"
        case .bow:        return "🎀"
        case .star:       return "⭐"
        case .sparkles:   return "✨"
        case .rainbow:    return "🌈"
        case .unicorn:    return "🦄"
        case .party:      return "🥳"
        }
    }

    var isDrawn: Bool { self == .moustache }

    /// Where a freshly added prop lands, in unit coordinates. Hats go up top, a
    /// moustache goes where a moustache goes — so one tap usually lands it right.
    var defaultUnitCenter: CGPoint {
        switch self {
        case .moustache:            return CGPoint(x: 0.5, y: 0.62)
        case .glasses, .sunglasses: return CGPoint(x: 0.5, y: 0.45)
        case .tophat, .crown, .cap: return CGPoint(x: 0.5, y: 0.16)
        default:                    return CGPoint(x: 0.5, y: 0.5)
        }
    }

    /// Fraction of the canvas edge the prop spans by default.
    var defaultWidthFraction: CGFloat {
        switch self {
        case .moustache:            return 0.42
        case .glasses, .sunglasses: return 0.55
        case .tophat, .crown, .cap: return 0.50
        default:                    return 0.30
        }
    }
}

/// A prop placed on the canvas. Position is unit-relative, so the same layout
/// composites identically at any canvas size.
struct PlacedProp: Identifiable {
    let id = UUID()
    let prop: AvatarProp
    var unitCenter: CGPoint
    var scale: CGFloat = 1
    var rotation: Angle = .zero
}

/**
 The drawn moustache.

 Built as ONE half and then mirrored, rather than as four hand-placed curves.
 Hand-placing both sides produced a lopsided crescent — the right wing collapsed
 because its control points were not true reflections of the left's. Mirroring a
 single half makes symmetry structural instead of something to get right twice.
 */
struct MoustacheShape: Shape {
    func path(in rect: CGRect) -> Path {
        let w = rect.width, h = rect.height

        // Left wing, drawn from the centre dip out to the tip and back along the
        // underside. Thin at the tip, thick where it meets the middle.
        var half = Path()
        half.move(to: CGPoint(x: w * 0.5, y: h * 0.20))
        // Top edge sweeping out and curling up to the tip.
        half.addCurve(
            to: CGPoint(x: w * 0.04, y: h * 0.06),
            control1: CGPoint(x: w * 0.34, y: h * 0.02),
            control2: CGPoint(x: w * 0.16, y: h * 0.00)
        )
        // Underside coming back in, bulging down below the lip line.
        half.addCurve(
            to: CGPoint(x: w * 0.5, y: h * 0.62),
            control1: CGPoint(x: w * 0.06, y: h * 0.52),
            control2: CGPoint(x: w * 0.24, y: h * 0.96)
        )
        half.closeSubpath()

        var full = half
        // Reflect across the vertical centre line: scale x by -1, then slide back.
        full.addPath(half, transform: CGAffineTransform(scaleX: -1, y: 1)
            .concatenating(CGAffineTransform(translationX: w, y: 0)))
        return full
    }
}

private let moustacheColor = Color(red: 0.16, green: 0.11, blue: 0.08)

/// One prop on the canvas: draggable, pinchable, rotatable, removable.
private struct PropLayer: View {
    @Binding var placed: PlacedProp
    let canvas: CGFloat
    let isSelected: Bool
    let onSelect: () -> Void
    let onDelete: () -> Void

    @State private var dragStart: CGPoint?
    @State private var scaleStart: CGFloat?
    @State private var rotationStart: Angle?

    private var side: CGFloat { canvas * placed.prop.defaultWidthFraction * placed.scale }

    var body: some View {
        Group {
            if placed.prop.isDrawn {
                MoustacheShape().fill(moustacheColor).frame(width: side, height: side * 0.5)
            } else {
                Text(placed.prop.glyph).font(.system(size: side))
            }
        }
        .rotationEffect(placed.rotation)
        .overlay {
            if isSelected {
                RoundedRectangle(cornerRadius: 8)
                    .strokeBorder(Color.choreStarPrimary, style: StrokeStyle(lineWidth: 2, dash: [5, 4]))
                    .frame(width: side + 16, height: side + 16)
                    .overlay(alignment: .topTrailing) {
                        Button(action: onDelete) {
                            Image(systemName: "xmark.circle.fill")
                                .font(.title3)
                                .foregroundStyle(.white, Color.choreStarDangerStrong)
                        }
                        .offset(x: 12, y: -12)
                    }
            }
        }
        .position(x: placed.unitCenter.x * canvas, y: placed.unitCenter.y * canvas)
        .gesture(
            DragGesture()
                .onChanged { value in
                    onSelect()
                    if dragStart == nil { dragStart = placed.unitCenter }
                    guard let start = dragStart else { return }
                    // Clamped, so a prop can't be flung off the photo and become
                    // impossible to select again.
                    placed.unitCenter = CGPoint(
                        x: min(max(start.x + value.translation.width / canvas, 0.02), 0.98),
                        y: min(max(start.y + value.translation.height / canvas, 0.02), 0.98)
                    )
                }
                .onEnded { _ in dragStart = nil }
        )
        .simultaneousGesture(
            MagnificationGesture()
                .onChanged { value in
                    onSelect()
                    if scaleStart == nil { scaleStart = placed.scale }
                    guard let start = scaleStart else { return }
                    placed.scale = min(max(start * value, 0.3), 3.0)
                }
                .onEnded { _ in scaleStart = nil }
        )
        .simultaneousGesture(
            RotationGesture()
                .onChanged { value in
                    onSelect()
                    if rotationStart == nil { rotationStart = placed.rotation }
                    guard let start = rotationStart else { return }
                    placed.rotation = start + value
                }
                .onEnded { _ in rotationStart = nil }
        )
        .onTapGesture(perform: onSelect)
    }
}

/**
 Photo + props editor.

 Everything is flattened into one JPEG before upload, so no overlay data is
 stored and nothing downstream needs to know props exist — every render path
 stays a plain image.
 */
struct AvatarStickerEditor: View {
    let baseImage: UIImage
    let onCancel: () -> Void
    let onDone: (UIImage) -> Void

    @State private var placed: [PlacedProp] = []
    @State private var selectedId: UUID?

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                GeometryReader { geo in
                    let canvas = min(geo.size.width, geo.size.height)
                    ZStack {
                        Image(uiImage: baseImage)
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .frame(width: canvas, height: canvas)
                            .clipped()

                        ForEach($placed) { $item in
                            PropLayer(
                                placed: $item,
                                canvas: canvas,
                                isSelected: selectedId == item.id,
                                onSelect: { selectedId = item.id },
                                onDelete: {
                                    placed.removeAll { $0.id == item.id }
                                    selectedId = nil
                                }
                            )
                        }
                    }
                    .frame(width: canvas, height: canvas)
                    // Edited inside a circle because that is how an avatar is
                    // always shown — a square canvas would let props sit in
                    // corners the user never sees.
                    .clipShape(Circle())
                    .overlay(Circle().strokeBorder(Color.choreStarTextSecondary.opacity(0.25), lineWidth: 1))
                    .frame(width: geo.size.width, height: geo.size.height)
                }
                .aspectRatio(1, contentMode: .fit)
                .padding(.horizontal, 28)
                .padding(.top, 12)

                Text(placed.isEmpty
                     ? "Tap something below to add it."
                     : "Drag to move · pinch to size · twist to rotate")
                    .font(.caption)
                    .foregroundColor(.choreStarTextSecondary)
                    .padding(.top, 14)

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 14) {
                        ForEach(AvatarProp.allCases) { prop in
                            Button {
                                Haptics.light()
                                let item = PlacedProp(prop: prop, unitCenter: prop.defaultUnitCenter)
                                placed.append(item)
                                selectedId = item.id
                            } label: {
                                ZStack {
                                    Circle().fill(Color.choreStarPrimary.opacity(0.1)).frame(width: 58, height: 58)
                                    if prop.isDrawn {
                                        MoustacheShape().fill(moustacheColor).frame(width: 34, height: 17)
                                    } else {
                                        Text(prop.glyph).font(.system(size: 30))
                                    }
                                }
                            }
                            .accessibilityLabel(prop.rawValue)
                        }
                    }
                    .padding(.horizontal, 24)
                    .padding(.vertical, 16)
                }
            }
            .frame(maxHeight: .infinity)
            .background(Color.choreStarBackground.ignoresSafeArea())
            .navigationTitle("Add Some Fun")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel", action: onCancel) }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Use Photo") { onDone(composite()) }.fontWeight(.semibold)
                }
            }
        }
    }

    /**
     Flatten photo + props into one square image at STORAGE resolution, not the
     on-screen canvas size, so the result is full quality on any device. Unit
     coordinates make that a straight multiply.
     */
    private func composite() -> UIImage {
        let size = SupabaseManager.avatarCanvasSize
        let format = UIGraphicsImageRendererFormat.default()
        format.scale = 1
        format.opaque = true

        return UIGraphicsImageRenderer(size: CGSize(width: size, height: size), format: format).image { ctx in
            baseImage.draw(in: CGRect(x: 0, y: 0, width: size, height: size))

            for item in placed {
                let side = size * item.prop.defaultWidthFraction * item.scale
                let center = CGPoint(x: item.unitCenter.x * size, y: item.unitCenter.y * size)

                ctx.cgContext.saveGState()
                ctx.cgContext.translateBy(x: center.x, y: center.y)
                ctx.cgContext.rotate(by: CGFloat(item.rotation.radians))

                if item.prop.isDrawn {
                    let height = side * 0.5
                    ctx.cgContext.translateBy(x: -side / 2, y: -height / 2)
                    let path = MoustacheShape().path(in: CGRect(x: 0, y: 0, width: side, height: height))
                    ctx.cgContext.addPath(path.cgPath)
                    ctx.cgContext.setFillColor(UIColor(red: 0.16, green: 0.11, blue: 0.08, alpha: 1).cgColor)
                    ctx.cgContext.fillPath()
                } else {
                    // Emoji draw as text. Measured first, because an emoji's
                    // rendered box is not the same as its point size.
                    let str = NSAttributedString(
                        string: item.prop.glyph,
                        attributes: [.font: UIFont.systemFont(ofSize: side)]
                    )
                    let bounds = str.size()
                    str.draw(at: CGPoint(x: -bounds.width / 2, y: -bounds.height / 2))
                }

                ctx.cgContext.restoreGState()
            }
        }
    }
}

/// UIImage is not Identifiable, which `fullScreenCover(item:)` requires.
struct IdentifiableImage: Identifiable {
    let id = UUID()
    let image: UIImage
}
