import SwiftUI

// Star Pets on iOS (web: components/kid/kid-pet.tsx, components/pets/).
// The server decides everything (lib/pets); these views decode and draw.

// MARK: - The picture

/// One pet, drawn by the web's own art (/api/pets/art) with a native idle
/// bob and, when sleepy, a drifting "z" the server can't draw (no fonts).
struct PetPicture: View {
    let species: String
    let stage: String
    var mood: String = "relaxed"
    var star: Bool = false
    var equipped: StarPets.Equipped? = nil
    var points: CGFloat = 200
    var habitat: Bool = true
    var animated: Bool = true

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var up = false

    var body: some View {
        AsyncImage(url: StarPets.artURL(species: species, stage: stage, mood: mood, star: star, equipped: equipped, points: points, habitat: habitat)) { phase in
            switch phase {
            case .success(let image):
                image.resizable().interpolation(.high).scaledToFit()
            default:
                Circle()
                    .fill(Color.choreStarPrimary.opacity(0.08))
                    .overlay(ProgressView().opacity(phase.error == nil ? 1 : 0))
            }
        }
        .frame(width: points, height: points)
        .offset(y: animated && !reduceMotion && up ? -points * 0.02 : 0)
        .overlay(alignment: .topTrailing) {
            if mood == "sleepy" && animated {
                Text("z")
                    .font(.system(size: points * 0.09, weight: .heavy, design: .rounded))
                    .foregroundColor(Color(red: 0.23, green: 0.16, blue: 0.31))
                    .offset(x: -points * 0.2, y: points * (up ? 0.18 : 0.24))
                    .opacity(up ? 0.2 : 0.9)
                    .accessibilityHidden(true)
            }
        }
        .accessibilityHidden(true)
        .onAppear {
            guard animated, !reduceMotion else { return }
            withAnimation(.easeInOut(duration: mood == "sleepy" ? 1.8 : 1.4).repeatForever(autoreverses: true)) { up = true }
        }
    }
}

// MARK: - Kid mode

/// The kid's pet on their own dashboard: adopt one, watch it grow, dress it
/// up, collect the monthly drop. Nothing at all when a parent switched pets
/// off for this kid, or when the server can't be reached.
struct KidPetCard: View {
    let child: Child
    @EnvironmentObject var manager: SupabaseManager
    @ObservedObject private var themeManager = ThemeManager.shared
    @State private var pet: StarPets.State?
    @State private var busy = false
    @State private var oops = false
    @State private var askGrownUp = false
    @State private var editing = false
    @State private var celebration: String?

    var body: some View {
        // A VStack, not a Group: the .task must stay on one stable view
        // (see KidChallengesCard).
        VStack(spacing: 0) {
            if let pet, pet.enabled {
                Group {
                    if pet.adopted, let species = pet.species, let name = pet.name {
                        grown(pet, species: species, name: name)
                    } else {
                        PetAdoptForm(pet: pet, busy: busy, oops: oops) { species, name in
                            Task { await act(["action": "adopt", "species": species, "name": name]) }
                        }
                    }
                }
                .padding(20)
                .background(Color.choreStarCardBackground)
                .cornerRadius(24)
                .overlay(
                    RoundedRectangle(cornerRadius: 24)
                        .strokeBorder(pet.star ? Color.yellow.opacity(0.7) : Color.clear, lineWidth: 4)
                )
                .overlay {
                    if celebration != nil {
                        ConfettiView(palette: [themeManager.primaryColor, themeManager.secondaryColor, themeManager.accentColor, .yellow, .white])
                            .allowsHitTesting(false)
                    }
                }
                .padding(.horizontal, 20)
            } else {
                Color.clear.frame(width: 0, height: 0)
            }
        }
        .task(id: manager.weekCompletions.count &+ manager.completedRoutineIds.count) { await load() }
        .sheet(isPresented: $editing) {
            if let pet {
                PetEditSheet(pet: pet, busy: busy) { species, name in
                    let body: [String: Any] = species == pet.species
                        ? ["action": "rename", "name": name]
                        : ["action": "adopt", "species": species, "name": name]
                    Task {
                        await act(body)
                        editing = false
                    }
                }
            }
        }
    }

    // MARK: Grown

    @ViewBuilder private func grown(_ pet: StarPets.State, species: String, name: String) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Text(PetText.t("pet.title"))
                    .font(.title2.weight(.bold))
                    .foregroundColor(.choreStarTextPrimary)
                Spacer()
                Button(PetText.t("pet.edit")) { editing = true }
                    .font(.subheadline.weight(.bold))
                    .foregroundColor(.choreStarPrimary)
            }

            if let celebration {
                Text(celebration)
                    .font(.headline.weight(.heavy))
                    .foregroundColor(.choreStarTextPrimary)
                    .frame(maxWidth: .infinity)
                    .padding(12)
                    .background(Color.yellow.opacity(0.25))
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                    .transition(.scale.combined(with: .opacity))
            }

            PetPicture(species: species, stage: pet.stage, mood: pet.mood, star: pet.star, equipped: pet.equipped, points: 220)
                .frame(maxWidth: .infinity)

            VStack(alignment: .leading, spacing: 4) {
                Text(name)
                    .font(.largeTitle.weight(.black))
                    .foregroundColor(.choreStarTextPrimary)
                Text("\(StarPets.speciesName(species)) · \(StarPets.stageName(pet.stage, star: pet.star))")
                    .font(.subheadline.weight(.bold))
                    .foregroundColor(.choreStarTextSecondary)
                Text(PetText.t("pet.mood.\(pet.mood)", name))
                    .font(.body.weight(.semibold))
                    .foregroundColor(.choreStarTextPrimary)
                    .padding(.top, 4)
            }

            PetLevelBar(pet: pet, name: name)

            if let drop = pet.drop {
                PetDropCard(drop: drop, busy: busy) { Task { await act(["action": "collect_drop"]) } }
            }

            PetWardrobe(pet: pet, busy: busy, onLocked: { askGrownUp = true }) { slot, itemId in
                var body: [String: Any] = ["action": "equip", "slot": slot]
                body["itemId"] = itemId ?? NSNull()
                Task { await act(body) }
            }

            Text(PetText.t("pet.howToGrow"))
                .font(.caption.weight(.semibold))
                .foregroundColor(.choreStarTextSecondary)
                .frame(maxWidth: .infinity)
                .multilineTextAlignment(.center)

            if !pet.premium || askGrownUp {
                Text(pet.heldBack ? PetText.t("pet.readyToGrow", name, String(pet.xp - pet.levelStartXp)) : PetText.t("pet.askGrownUp"))
                    .font(.subheadline.weight(.bold))
                    .foregroundColor(.choreStarPrimary)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: .infinity)
                    .padding(12)
                    .background(Color.choreStarPrimary.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            }

            if oops {
                Text(PetText.t("pet.oops"))
                    .font(.caption.weight(.bold))
                    .foregroundColor(.red)
            }
        }
    }

    // MARK: Data

    private func load() async {
        guard let loaded = await manager.loadKidPet(childId: child.id) else { return }
        apply(loaded)
    }

    private func act(_ body: [String: Any]) async {
        busy = true
        oops = false
        defer { busy = false }
        switch await manager.petAction(childId: child.id, body) {
        case .updated(let next):
            Haptics.light()
            apply(next)
        case .askGrownUp:
            askGrownUp = true
        case .failed:
            oops = true
        }
    }

    /// Celebrates growth once per device: level, stage, star (web parity).
    private func apply(_ next: StarPets.State) {
        pet = next
        guard next.adopted, let name = next.name else { return }
        let key = "petSeen:\(child.id.uuidString)"
        let previous = UserDefaults.standard.string(forKey: key)?.split(separator: "|").map(String.init)
        UserDefaults.standard.set("\(next.level)|\(next.stage)|\(next.star ? 1 : 0)", forKey: key)
        // First sight on this device: remember, don't celebrate.
        guard let previous, previous.count == 3, let oldLevel = Int(previous[0]) else { return }
        let wasStar = previous[2] == "1"
        guard next.level > oldLevel || (next.star && !wasStar) else { return }

        let message: String
        if next.star && !wasStar {
            message = PetText.t("pet.becameStar", name)
        } else if next.stage != previous[1] {
            message = PetText.t("pet.grewUp", name, StarPets.stageName(next.stage))
        } else {
            message = PetText.t("pet.levelUp", name, String(next.level))
        }
        withAnimation(.spring()) { celebration = message }
        SoundManager.shared.play(.cheer)
        Haptics.success()
        Task { @MainActor in
            try? await Task.sleep(nanoseconds: 6_000_000_000)
            withAnimation { celebration = nil }
        }
    }
}

// MARK: - Pieces

private struct PetLevelBar: View {
    let pet: StarPets.State
    let name: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(PetText.t("pet.level", String(pet.level)))
                    .font(.headline.weight(.heavy))
                    .foregroundColor(.choreStarTextPrimary)
                Spacer()
                Text(PetText.t("pet.xp", String(pet.xp)))
                    .font(.subheadline.weight(.bold).monospacedDigit())
                    .foregroundColor(.choreStarTextSecondary)
            }
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(Color.choreStarBackground)
                    Capsule()
                        .fill(LinearGradient(colors: [.choreStarPrimary, .choreStarSecondary], startPoint: .leading, endPoint: .trailing))
                        .frame(width: max(12, geo.size.width * CGFloat(min(100, max(0, pet.levelPercent))) / 100))
                }
            }
            .frame(height: 14)
            .accessibilityElement()
            .accessibilityLabel(PetText.t("pet.levelAria"))
            .accessibilityValue("\(Int(pet.levelPercent))%")

            Text(progressLine)
                .font(.caption.weight(.bold))
                .foregroundColor(.choreStarTextSecondary)

            if let next = pet.nextStage {
                Text("🌱 " + PetText.t("pet.nextStage", StarPets.stageName(next.stage), String(next.level)))
                    .font(.caption.weight(.semibold))
                    .foregroundColor(.choreStarTextSecondary)
            }
            if let unlock = pet.nextUnlock {
                Text("🎁 " + PetText.t("pet.nextUnlock", StarPets.itemName(unlock.id), String(unlock.level)))
                    .font(.caption.weight(.semibold))
                    .foregroundColor(.choreStarTextSecondary)
            }
        }
    }

    private var progressLine: String {
        if pet.heldBack { return PetText.t("pet.readyToGrow", name, String(pet.xp - pet.levelStartXp)) }
        guard let nextXp = pet.nextLevelXp else { return PetText.t("pet.maxLevel") }
        return PetText.t("pet.xpToNext", String(nextXp - pet.xp), String(pet.level + 1))
    }
}

private struct PetDropCard: View {
    let drop: StarPets.Drop
    let busy: Bool
    let onCollect: () -> Void

    var body: some View {
        HStack(spacing: 14) {
            Text(drop.emoji).font(.system(size: 40))
            VStack(alignment: .leading, spacing: 4) {
                Text(PetText.t("pet.newThisMonth"))
                    .font(.caption.weight(.heavy))
                    .foregroundColor(.choreStarPrimary)
                Text(StarPets.itemName(drop.itemId))
                    .font(.headline.weight(.bold))
                    .foregroundColor(.choreStarTextPrimary)
                if drop.locked {
                    Text(PetText.t("pet.askGrownUp"))
                        .font(.caption.weight(.semibold))
                        .foregroundColor(.choreStarTextSecondary)
                } else if drop.owned {
                    Text(PetText.t("pet.collected"))
                        .font(.caption.weight(.bold))
                        .foregroundColor(.choreStarSuccess)
                } else if !drop.collectible {
                    Text(PetText.t("pet.dropProgress", String(max(0, drop.goal - drop.xpThisMonth))))
                        .font(.caption.weight(.semibold))
                        .foregroundColor(.choreStarTextSecondary)
                }
            }
            Spacer(minLength: 0)
            if drop.collectible && !drop.owned {
                Button(PetText.t("pet.collect"), action: onCollect)
                    .font(.subheadline.weight(.heavy))
                    .buttonStyle(.borderedProminent)
                    .tint(.choreStarPrimary)
                    .disabled(busy)
            }
        }
        .padding(14)
        .background(Color.choreStarPrimary.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
    }
}

private struct PetWardrobe: View {
    let pet: StarPets.State
    let busy: Bool
    let onLocked: () -> Void
    let onEquip: (_ slot: String, _ itemId: String?) -> Void
    @State private var slot = "hat"

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("👗 " + PetText.t("pet.wardrobe"))
                .font(.headline.weight(.heavy))
                .foregroundColor(.choreStarTextPrimary)
            Picker(PetText.t("pet.wardrobe"), selection: $slot) {
                ForEach(StarPets.slots, id: \.self) { s in
                    Text(PetText.t("pet.slot.\(s)")).tag(s)
                }
            }
            .pickerStyle(.segmented)

            LazyVGrid(columns: [GridItem(.adaptive(minimum: 84), spacing: 10)], spacing: 10) {
                ForEach(pet.wardrobe.filter { $0.slot == slot }) { item in
                    tile(item)
                }
            }
        }
    }

    private func tile(_ item: StarPets.WardrobeItem) -> some View {
        let name = StarPets.itemName(item.id)
        return Button {
            guard !busy else { return }
            if item.wearable {
                onEquip(item.slot, item.equipped ? nil : item.id)
            } else {
                onLocked()
            }
        } label: {
            VStack(spacing: 4) {
                Text(item.emoji)
                    .font(.system(size: 30))
                    .opacity(item.wearable ? 1 : 0.4)
                Text(name)
                    .font(.caption2.weight(.bold))
                    .foregroundColor(.choreStarTextPrimary)
                    .lineLimit(2)
                    .multilineTextAlignment(.center)
                if !item.wearable {
                    Text(item.state == "level" && item.level != nil ? PetText.t("pet.unlocksAt", String(item.level!)) : PetText.t("pet.locked"))
                        .font(.caption2.weight(.semibold))
                        .foregroundColor(.choreStarTextSecondary)
                }
            }
            .frame(maxWidth: .infinity, minHeight: 92)
            .padding(6)
            .background(item.equipped ? Color.choreStarPrimary.opacity(0.15) : Color.choreStarBackground)
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .strokeBorder(item.equipped ? Color.choreStarPrimary : Color.clear, lineWidth: 2)
            )
        }
        .buttonStyle(.plain)
        .accessibilityLabel(item.wearable ? PetText.t(item.equipped ? "pet.takeOff" : "pet.wear", name) : "\(name): \(PetText.t("pet.locked"))")
    }
}

/// The species grid, shared by adopting and changing pets. Locked species
/// (free plan) say "ask a grown-up" instead of being picked.
private struct PetSpeciesPicker: View {
    let options: [StarPets.SpeciesOption]
    @Binding var selected: String
    @State private var askedLocked = false

    var body: some View {
        VStack(spacing: 8) {
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 10), count: 3), spacing: 10) {
                ForEach(options) { option in
                    Button {
                        if option.locked { askedLocked = true } else { selected = option.id; Haptics.light() }
                    } label: {
                        VStack(spacing: 2) {
                            // The art leaves room for a habitat; without one, zoom in.
                            PetPicture(species: option.id, stage: "baby", points: 72, habitat: false, animated: false)
                                .scaleEffect(1.35, anchor: .bottom)
                                .frame(width: 72, height: 72)
                                .opacity(option.locked ? 0.45 : 1)
                            HStack(spacing: 3) {
                                if option.locked {
                                    Image(systemName: "lock.fill").font(.caption2)
                                        .accessibilityLabel(PetText.t("pet.locked"))
                                }
                                Text(StarPets.speciesName(option.id))
                                    .font(.caption.weight(.bold))
                            }
                            .foregroundColor(.choreStarTextPrimary)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                        .background(selected == option.id ? Color.choreStarPrimary.opacity(0.15) : Color.choreStarBackground)
                        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: 16, style: .continuous)
                                .strokeBorder(selected == option.id ? Color.choreStarPrimary : Color.clear, lineWidth: 2)
                        )
                    }
                    .buttonStyle(.plain)
                    .accessibilityAddTraits(selected == option.id ? .isSelected : [])
                }
            }
            if askedLocked {
                Text(PetText.t("pet.askGrownUp"))
                    .font(.caption.weight(.bold))
                    .foregroundColor(.choreStarPrimary)
                    .multilineTextAlignment(.center)
            }
        }
    }
}

private struct PetAdoptForm: View {
    let pet: StarPets.State
    let busy: Bool
    let oops: Bool
    let onAdopt: (_ species: String, _ name: String) -> Void
    @State private var species = "pup"
    @State private var name = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("🐾 " + PetText.t("pet.adoptTitle"))
                .font(.title2.weight(.black))
                .foregroundColor(.choreStarTextPrimary)
            Text(PetText.t("pet.adoptBody"))
                .font(.subheadline.weight(.semibold))
                .foregroundColor(.choreStarTextSecondary)

            PetSpeciesPicker(options: pet.speciesOptions, selected: $species)

            TextField("\(PetText.t("pet.nameLabel")): \(PetText.t("pet.namePlaceholder"))", text: $name)
                .font(.title3.weight(.bold))
                .padding(12)
                .background(Color.choreStarBackground)
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                .submitLabel(.done)

            Button {
                onAdopt(species, name.trimmingCharacters(in: .whitespacesAndNewlines))
            } label: {
                Text(busy ? PetText.t("pet.saving") : PetText.t("pet.adopt"))
                    .font(.title3.weight(.heavy))
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(Color.choreStarFill)
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            }
            .disabled(busy || name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            .opacity(busy || name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? 0.5 : 1)

            if oops {
                Text(PetText.t("pet.oops"))
                    .font(.caption.weight(.bold))
                    .foregroundColor(.red)
            }
        }
    }
}

private struct PetEditSheet: View {
    let pet: StarPets.State
    let busy: Bool
    let onSave: (_ species: String, _ name: String) -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var species = ""
    @State private var name = ""

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    TextField(PetText.t("pet.nameLabel"), text: $name)
                        .font(.title3.weight(.bold))
                        .padding(12)
                        .background(Color.choreStarBackground)
                        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                    PetSpeciesPicker(options: pet.speciesOptions, selected: $species)
                }
                .padding(20)
            }
            .navigationTitle(PetText.t("pet.title"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(PetText.t("pet.cancel")) { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(busy ? PetText.t("pet.saving") : PetText.t("pet.save")) {
                        onSave(species, name.trimmingCharacters(in: .whitespacesAndNewlines))
                    }
                    .disabled(busy || name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
            .onAppear {
                species = pet.species ?? "pup"
                name = pet.name ?? ""
            }
        }
    }
}

// MARK: - Parent side

/// Dashboard preview: each kid's pet at a glance. Hidden until at least one
/// kid has adopted, so it never nags a family that hasn't met pets yet (the
/// discover card does that, once).
struct FamilyPetsCard: View {
    @EnvironmentObject var manager: SupabaseManager
    @State private var kids: [StarPets.FamilyKid] = []

    var body: some View {
        VStack(spacing: 0) {
            let shown = kids.filter { $0.pet?.enabled == true && $0.pet?.adopted == true }
            if !shown.isEmpty {
                VStack(alignment: .leading, spacing: 12) {
                    Text("Star Pets")
                        .font(.display(17, weight: .bold))
                        .foregroundColor(.choreStarTextPrimary)
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 16) {
                            ForEach(shown) { kid in
                                if let pet = kid.pet, let species = pet.species {
                                    VStack(spacing: 4) {
                                        PetPicture(species: species, stage: pet.stage, mood: pet.mood, star: pet.star, equipped: pet.equipped, points: 76, animated: false)
                                        Text(pet.name ?? kid.childName)
                                            .font(.caption.weight(.bold))
                                            .foregroundColor(.choreStarTextPrimary)
                                        Text("\(kid.childName) · Level \(pet.level)")
                                            .font(.caption2)
                                            .foregroundColor(.choreStarTextSecondary)
                                    }
                                    .accessibilityElement(children: .combine)
                                }
                            }
                        }
                    }
                }
                .padding(20)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color.choreStarCardBackground)
                .cornerRadius(16)
            } else {
                Color.clear.frame(width: 0, height: 0)
            }
        }
        .task(id: manager.children.count) {
            guard !manager.isChildSession else { return }
            if let loaded = await manager.loadFamilyPets() { kids = loaded.kids }
        }
    }
}

/// Settings: what Star Pets are, and a per-kid switch. Pets are on by
/// default; each kid adopts theirs from their own screen.
struct PetsSettingsView: View {
    @EnvironmentObject var manager: SupabaseManager
    @State private var response: StarPets.FamilyResponse?
    @State private var saving: Set<String> = []

    var body: some View {
        List {
            Section {
                HStack(spacing: 14) {
                    PetPicture(species: "pup", stage: "kid", mood: "happy", points: 72, habitat: false)
                    Text("Each kid adopts a pet that grows every time they finish a chore or a routine. Kids pick and name theirs from their own screen in kid mode.")
                        .font(.subheadline)
                        .foregroundColor(.choreStarTextSecondary)
                }
                .padding(.vertical, 4)
            }

            Section {
                if let response {
                    ForEach(response.kids) { kid in
                        Toggle(isOn: binding(for: kid)) {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(kid.childName)
                                if let pet = kid.pet, pet.adopted, let name = pet.name {
                                    Text("\(name), level \(pet.level)")
                                        .font(.caption)
                                        .foregroundColor(.choreStarTextSecondary)
                                } else {
                                    Text("Not adopted yet")
                                        .font(.caption)
                                        .foregroundColor(.choreStarTextSecondary)
                                }
                            }
                        }
                        .disabled(saving.contains(kid.childId))
                    }
                } else {
                    ProgressView()
                }
            } header: {
                Text("Pets on for")
            } footer: {
                Text(response?.premium == true
                     ? "Turning a pet off hides it. Nothing is deleted, so turning it back on brings the same pet back."
                     : "Every family gets a pup that grows to its kid stage. Premium adds five more pets, outfits, monthly prizes and growing all the way up.")
            }
        }
        .navigationTitle("Star Pets")
        .task { response = await manager.loadFamilyPets() }
    }

    private func binding(for kid: StarPets.FamilyKid) -> Binding<Bool> {
        Binding(
            get: { kid.pet?.enabled ?? true },
            set: { on in
                saving.insert(kid.childId)
                Task {
                    if await manager.setPetEnabled(childId: kid.childId, enabled: on) {
                        response = await manager.loadFamilyPets()
                    }
                    saving.remove(kid.childId)
                }
            }
        )
    }
}
