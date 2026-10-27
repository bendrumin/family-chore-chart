import Foundation

/// Star Pets (web migration 034), the native side. Every rule (XP, levels,
/// Premium gating, unlocks, monthly drops) lives on the server in
/// chorestar-nextjs/lib/pets and arrives here already worked out, so iOS only
/// decodes and draws. The art is the web's own, rendered to a PNG by
/// /api/pets/art, so the two apps never show a different pet.
enum StarPets {
    static let speciesIds = ["pup", "kitty", "bunny", "dino", "panda", "owl"]
    static let slots = ["hat", "accessory", "habitat"]

    struct Equipped: Decodable, Equatable {
        let hat: String?
        let accessory: String?
        let habitat: String?
    }

    struct StageAt: Decodable, Equatable {
        let stage: String
        let level: Int
    }

    struct UnlockAt: Decodable, Equatable {
        let id: String
        let level: Int
    }

    struct WardrobeItem: Decodable, Equatable, Identifiable {
        let id: String
        let slot: String
        let emoji: String
        /// unlocked | level | drop | premium
        let state: String
        let equipped: Bool
        let level: Int?
        let month: Int?

        var wearable: Bool { state == "unlocked" }
    }

    struct Drop: Decodable, Equatable {
        let itemId: String
        let slot: String
        let emoji: String
        let owned: Bool
        let collectible: Bool
        let xpThisMonth: Int
        let goal: Int
        let locked: Bool
    }

    struct SpeciesOption: Decodable, Equatable, Identifiable {
        let id: String
        let locked: Bool
    }

    struct State: Decodable, Equatable {
        let enabled: Bool
        let adopted: Bool
        let premium: Bool
        let species: String?
        let name: String?
        let xp: Int
        let level: Int
        let stage: String
        let star: Bool
        let heldBack: Bool
        let levelStartXp: Int
        let nextLevelXp: Int?
        let levelPercent: Double
        let nextStage: StageAt?
        let nextUnlock: UnlockAt?
        let mood: String
        let equipped: Equipped
        let wardrobe: [WardrobeItem]
        let drop: Drop?
        let speciesOptions: [SpeciesOption]
    }

    struct KidResponse: Decodable {
        let childId: String?
        let pet: State?
    }

    struct FamilyKid: Decodable, Identifiable {
        let childId: String
        let childName: String
        let pet: State?
        var id: String { childId }
    }

    struct FamilyResponse: Decodable {
        let premium: Bool
        let kids: [FamilyKid]
    }

    /// The pet as a PNG from the web's own art. `points` is the on-screen
    /// size; the image is fetched at 3x, capped where the server caps it.
    static func artURL(species: String, stage: String, mood: String, star: Bool, equipped: Equipped?, points: CGFloat, habitat: Bool = true) -> URL? {
        var c = URLComponents(string: "\(SupabaseManager.appBaseURL)/api/pets/art")
        var items = [
            URLQueryItem(name: "species", value: species),
            URLQueryItem(name: "stage", value: stage),
            URLQueryItem(name: "mood", value: mood),
            URLQueryItem(name: "star", value: star ? "1" : "0"),
            URLQueryItem(name: "size", value: String(Int(min(600, points * 3)))),
        ]
        if let hat = equipped?.hat { items.append(URLQueryItem(name: "hat", value: hat)) }
        if let accessory = equipped?.accessory { items.append(URLQueryItem(name: "accessory", value: accessory)) }
        items.append(URLQueryItem(name: "habitat", value: habitat ? (equipped?.habitat ?? "") : "none"))
        c?.queryItems = items
        return c?.url
    }

    /// English names for catalog item ids; the catalog keys are the web's
    /// (`pet.item.<id>`), so this only feeds PetText.
    static func itemName(_ id: String) -> String { PetText.t("pet.item.\(id)") }
    static func speciesName(_ id: String) -> String { PetText.t("pet.species.\(id)") }
    static func stageName(_ stage: String, star: Bool = false) -> String {
        PetText.t(star ? "pet.stage.star" : "pet.stage.\(stage)")
    }
}

/// The Star Pets strings, keyed like the web's kid dictionary (lib/i18n/kid.ts)
/// and copied into Localizable.xcstrings by scripts/sync-pet-strings.py, which
/// turns `{name}` into positional `%1$@`. Every argument is passed as a String.
enum PetText {
    static func t(_ key: String, _ args: String...) -> String {
        let format = NSLocalizedString(key, comment: "")
        return args.isEmpty ? format : String(format: format, arguments: args)
    }
}

extension SupabaseManager {
    /// Kid side: this kid's pet with everything derived (GET /api/kid/pet).
    /// Kid token, or a parent's session naming the child.
    func loadKidPet(childId: UUID) async -> StarPets.State? {
        guard let (data, status) = await kidAPI(path: "/api/kid/pet", method: "GET", childId: childId),
              status == 200 else { return nil }
        return (try? JSONDecoder().decode(StarPets.KidResponse.self, from: data))?.pet
    }

    enum PetActionResult {
        case updated(StarPets.State)
        case askGrownUp
        case failed
    }

    /// Kid side: adopt, rename, equip or collect_drop (POST /api/kid/pet).
    func petAction(childId: UUID, _ body: [String: Any]) async -> PetActionResult {
        guard let (data, status) = await kidAPI(path: "/api/kid/pet", method: "POST", childId: childId, body: body) else { return .failed }
        if status == 403, apiMessage(data, fallback: "") == "premium_required" { return .askGrownUp }
        guard status == 200, let pet = (try? JSONDecoder().decode(StarPets.KidResponse.self, from: data))?.pet else { return .failed }
        return .updated(pet)
    }

    /// Parent side: every kid's pet, in family order (GET /api/pets).
    func loadFamilyPets() async -> StarPets.FamilyResponse? {
        guard let (data, status) = await parentAPI("/api/pets"), status == 200 else { return nil }
        return try? JSONDecoder().decode(StarPets.FamilyResponse.self, from: data)
    }

    /// Parent side: the per-kid on/off switch. Never Premium-gated, and off
    /// deletes nothing.
    func setPetEnabled(childId: String, enabled: Bool) async -> Bool {
        guard let (_, status) = await parentAPI("/api/pets", method: "POST", json: ["childId": childId.lowercased(), "enabled": enabled]) else { return false }
        return status == 200
    }
}
