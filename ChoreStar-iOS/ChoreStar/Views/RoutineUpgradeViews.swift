import SwiftUI
import PhotosUI

// MARK: - Happening now (parent dashboard)

/// Routines a kid is in the middle of, from GET /api/routines/live. Premium
/// families see the step; free families see that a routine is underway with
/// a crown (paywall source gate_routine_live). Hidden when nothing is running.
struct LiveRoutinesCard: View {
    @EnvironmentObject var manager: SupabaseManager
    @State private var items: [RoutineUpgrades.LiveRoutine] = []
    @State private var showingPaywall = false

    var body: some View {
        Group {
            if !items.isEmpty {
                VStack(alignment: .leading, spacing: 10) {
                    HStack {
                        Circle().fill(Color.choreStarSuccess).frame(width: 8, height: 8)
                        Text("Happening now")
                            .font(.headline)
                            .foregroundColor(.choreStarTextPrimary)
                    }
                    ForEach(items) { item in
                        HStack(spacing: 10) {
                            Circle()
                                .fill(Color.fromHex(item.childColor ?? "#6366f1"))
                                .frame(width: 30, height: 30)
                                .overlay(Text(String(item.childName.prefix(1))).font(.caption.weight(.bold)).foregroundColor(.white))
                            VStack(alignment: .leading, spacing: 2) {
                                Text(RoutineTemplate.localizedName(item.routineName))
                                    .font(.subheadline.weight(.bold))
                                    .foregroundColor(.choreStarTextPrimary)
                                if item.locked {
                                    Text("\(item.childName) is doing this routine now")
                                        .font(.caption)
                                        .foregroundColor(.choreStarTextSecondary)
                                } else if let index = item.stepIndex, let total = item.stepsTotal {
                                    Text(RoutineUpgrades.liveLine(childName: item.childName, stepIndex: index, stepsTotal: total, stepTitle: item.stepTitle.map(RoutineTemplate.localizedStepTitle)))
                                        .font(.caption)
                                        .foregroundColor(.choreStarTextSecondary)
                                    ProgressView(value: Double(min(index + 1, total)), total: Double(max(total, 1)))
                                        .tint(Color.fromHex(item.routineColor ?? "#6366f1"))
                                }
                            }
                            Spacer()
                            if item.locked {
                                Button { showingPaywall = true } label: {
                                    Image(systemName: "crown.fill").foregroundColor(.choreStarAccent)
                                }
                                .buttonStyle(.plain)
                                .accessibilityLabel("See the step with Premium")
                            }
                        }
                    }
                }
                .padding(16)
                .appCard()
                .sheet(isPresented: $showingPaywall) { PaywallView(source: RoutineUpgrades.paywallLive) }
            } else {
                // A real view, so the polling task below installs (modifiers
                // on an empty Group never do; see ApprovalTrayView).
                Color.clear.frame(width: 0, height: 0)
            }
        }
        .task {
            // Poll while the dashboard is on screen; the task ends when it leaves.
            while !Task.isCancelled {
                let loaded = await manager.loadLiveRoutines()
                await MainActor.run { withAnimation { items = loaded } }
                try? await Task.sleep(nanoseconds: 15_000_000_000)
            }
        }
    }
}

// MARK: - Finish-by bar (player)

/// The gentle whole-routine timer: a calm bar that shrinks, no red and no
/// fail state. Past the target it just says keep going.
struct FinishByBar: View {
    let startTime: Date
    let targetSeconds: Int
    let tint: Color

    var body: some View {
        TimelineView(.periodic(from: .now, by: 1)) { context in
            let status = RoutineUpgrades.timeStatus(elapsedSeconds: context.date.timeIntervalSince(startTime), targetSeconds: targetSeconds)
            VStack(spacing: 6) {
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        Capsule().fill(Color.choreStarTextSecondary.opacity(0.15))
                        Capsule()
                            .fill(color(status.phase))
                            .frame(width: geo.size.width * status.fractionLeft)
                            .animation(.linear(duration: 1), value: status.fractionLeft)
                    }
                }
                .frame(height: 10)
                Text(status.overTime
                     ? String(localized: "Keep going, you're doing great!")
                     : String(localized: "Finish by: \(RoutineUpgrades.formatClock(status.remainingSeconds)) left"))
                    .font(.caption.weight(.semibold).monospacedDigit())
                    .foregroundColor(.choreStarTextSecondary)
            }
            .accessibilityElement(children: .combine)
        }
        .padding(.horizontal, 20)
    }

    /// Calm colors only: the routine's own color, then softer tones.
    private func color(_ phase: RoutineUpgrades.TimePhase) -> Color {
        switch phase {
        case .plenty: return tint
        case .some: return tint.opacity(0.75)
        case .little: return Color.choreStarAccent
        case .over: return Color.choreStarTextSecondary.opacity(0.4)
        }
    }
}

// MARK: - Step picture

/// A step's picture, big enough for a pre-reader to follow. Falls back to
/// nothing (the caller shows the icon) when the URL is missing or fails.
struct StepPicture: View {
    let url: URL
    var size: CGFloat = 200

    var body: some View {
        AsyncImage(url: url) { phase in
            switch phase {
            case .success(let image):
                image.resizable().scaledToFill()
            case .failure:
                Image(systemName: "photo").font(.largeTitle).foregroundColor(.choreStarTextSecondary)
            default:
                ProgressView()
            }
        }
        .frame(width: size, height: size)
        .background(Color.choreStarBackground)
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        .accessibilityHidden(true)
    }
}

// MARK: - Build with AI (builder)

/// Describe the routine in a few words; POST /api/ai/build-routine returns a
/// draft (or a template-based one when the AI is down) that fills the builder.
struct BuildWithAISheet: View {
    @EnvironmentObject var manager: SupabaseManager
    @Environment(\.dismiss) private var dismiss
    let childId: UUID?
    let routineType: String?
    let onDraft: (RoutineUpgrades.DraftResponse) -> Void

    @State private var goal = ""
    @State private var working = false
    @State private var error: String?
    @State private var showingPaywall = false

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Morning before school: get dressed, breakfast, brush teeth", text: $goal, axis: .vertical)
                        .lineLimit(3...6)
                } header: {
                    Text("Describe the routine")
                } footer: {
                    Text("You can change every step before saving.")
                }
                if let error {
                    Section { Text(error).foregroundColor(.red) }
                }
                Section {
                    Button {
                        Task { await build() }
                    } label: {
                        HStack {
                            if working { ProgressView() }
                            Label("Build with AI", systemImage: "sparkles").fontWeight(.bold)
                        }
                    }
                    .disabled(working || goal.trimmingCharacters(in: .whitespacesAndNewlines).count < 3)
                }
            }
            .navigationTitle("Build with AI")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
            }
            .sheet(isPresented: $showingPaywall) { PaywallView(source: RoutineUpgrades.paywallAI) }
        }
    }

    private func build() async {
        working = true
        error = nil
        defer { working = false }
        let text = String(goal.trimmingCharacters(in: .whitespacesAndNewlines).prefix(500))
        switch await manager.buildRoutineWithAI(goal: text, childId: childId, routineType: routineType) {
        case .success(let draft):
            onDraft(draft)
            dismiss()
        case .premiumRequired:
            showingPaywall = true
        case .failure(let message):
            error = message
        }
    }
}

// MARK: - Step photo picker (builder)

/// Pick a picture for a step and upload it (POST /api/routines/step-photo,
/// Premium). Calls back with the stored path and a signed preview URL.
struct StepPhotoButton: View {
    @EnvironmentObject var manager: SupabaseManager
    let childId: UUID?
    let imageURL: URL?
    let hasImage: Bool
    let onUploaded: (_ path: String, _ url: URL?) -> Void
    let onRemove: () -> Void

    @State private var item: PhotosPickerItem?
    @State private var uploading = false
    @State private var showingPaywall = false
    @State private var error: String?

    var body: some View {
        HStack(spacing: 8) {
            if let imageURL {
                AsyncImage(url: imageURL) { image in
                    image.resizable().scaledToFill()
                } placeholder: {
                    Color.choreStarBackground
                }
                .frame(width: 36, height: 36)
                .clipShape(RoundedRectangle(cornerRadius: 8))
            }
            if manager.isPremium {
                PhotosPicker(selection: $item, matching: .images) {
                    if uploading {
                        ProgressView()
                    } else {
                        Image(systemName: hasImage ? "photo.fill" : "camera.fill")
                            .foregroundColor(.choreStarPrimary)
                    }
                }
                .buttonStyle(.borderless)
                .disabled(childId == nil || uploading)
                .accessibilityLabel(hasImage ? "Change the step's picture" : "Add a picture to this step")
            } else {
                Button { showingPaywall = true } label: {
                    Image(systemName: "camera.fill")
                        .foregroundColor(.choreStarTextSecondary)
                        .overlay(alignment: .topTrailing) {
                            Image(systemName: "crown.fill").font(.system(size: 8)).foregroundColor(.choreStarAccent).offset(x: 5, y: -5)
                        }
                }
                .buttonStyle(.borderless)
                .accessibilityLabel("Picture steps come with Premium")
            }
            if hasImage {
                Button(action: onRemove) {
                    Image(systemName: "xmark.circle").foregroundColor(.choreStarTextSecondary)
                }
                .buttonStyle(.borderless)
                .accessibilityLabel("Remove the picture")
            }
        }
        .onChange(of: item) { _, newItem in
            guard let newItem, let childId else { return }
            Task { await upload(newItem, childId: childId) }
        }
        .sheet(isPresented: $showingPaywall) { PaywallView(source: RoutineUpgrades.paywallPhotos) }
        .alert(isPresented: Binding(get: { error != nil }, set: { if !$0 { error = nil } })) {
            Alert(title: Text(error ?? ""))
        }
    }

    private func upload(_ picked: PhotosPickerItem, childId: UUID) async {
        uploading = true
        defer { uploading = false; item = nil }
        guard let data = try? await picked.loadTransferable(type: Data.self), let image = UIImage(data: data) else {
            error = String(localized: "That photo could not be read.")
            return
        }
        switch await manager.uploadStepPhoto(image, childId: childId) {
        case .success(let path, let url): onUploaded(path, url)
        case .premiumRequired: showingPaywall = true
        case .failure(let message): error = message
        }
    }
}
