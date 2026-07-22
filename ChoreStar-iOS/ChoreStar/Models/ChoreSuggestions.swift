import Foundation

/// Rule-based chore suggestion engine — a direct port of the web app's
/// `lib/utils/chore-suggestions.ts` (age filter, seasonal boost, category
/// diversity, completion-rate challenge boost, deterministic daily shuffle).

struct ChoreSuggestion: Identifiable {
    let name: String
    let category: String
    let icon: String
    let rewardCents: Int
    let reason: String

    var id: String { name }

    /// Maps the catalogue category onto the iOS chore editor's category list.
    var editorCategory: String {
        switch category {
        case "self-care": return "Personal"
        case "tidying": return "Bedroom"
        case "kitchen": return "Kitchen"
        case "laundry": return "General"
        case "pets": return "Pets"
        case "outdoor": return "Outdoor"
        case "household": return "General"
        case "learning": return "Homework"
        default: return "General"
        }
    }
}

enum ChoreSuggestionEngine {
    private struct ChoreDef {
        let name: String
        let category: String
        let icon: String
        let minAge: Int
        let maxAge: Int
        let rewardCents: Int
        let seasonalMonths: Set<Int>  // 1-12; empty = year-round

        init(_ name: String, _ category: String, _ icon: String,
             _ minAge: Int, _ maxAge: Int, _ rewardCents: Int, _ seasonalMonths: [Int] = []) {
            self.name = name
            self.category = category
            self.icon = icon
            self.minAge = minAge
            self.maxAge = maxAge
            self.rewardCents = rewardCents
            self.seasonalMonths = Set(seasonalMonths)
        }
    }

    private static let schoolMonths = [1, 2, 3, 4, 5, 9, 10, 11, 12]

    private static let catalogue: [ChoreDef] = [
        // Self-care
        ChoreDef("Brush teeth", "self-care", "🪥", 3, 18, 5),
        ChoreDef("Make bed", "self-care", "🛏️", 4, 18, 5),
        ChoreDef("Get dressed by yourself", "self-care", "👕", 3, 8, 5),
        ChoreDef("Put pajamas on", "self-care", "🌙", 3, 8, 5),
        ChoreDef("Wash hands before meals", "self-care", "🧼", 3, 10, 3),
        ChoreDef("Comb/brush hair", "self-care", "💇", 4, 12, 3),
        ChoreDef("Take a shower", "self-care", "🚿", 6, 18, 5),
        ChoreDef("Pack school bag", "self-care", "🎒", 5, 14, 5, schoolMonths),

        // Tidying
        ChoreDef("Put toys away", "tidying", "🧸", 3, 10, 5),
        ChoreDef("Pick up clothes off floor", "tidying", "👚", 4, 12, 5),
        ChoreDef("Tidy bedroom", "tidying", "🧹", 5, 18, 10),
        ChoreDef("Organize bookshelf", "tidying", "📚", 5, 14, 10),
        ChoreDef("Clean off desk", "tidying", "🗂️", 6, 18, 10),

        // Kitchen
        ChoreDef("Set the table", "kitchen", "🍽️", 4, 14, 10),
        ChoreDef("Clear the table", "kitchen", "🧹", 4, 14, 10),
        ChoreDef("Help load dishwasher", "kitchen", "🍽️", 6, 14, 15),
        ChoreDef("Unload dishwasher", "kitchen", "✨", 7, 18, 15),
        ChoreDef("Wipe kitchen counter", "kitchen", "🧽", 6, 18, 10),
        ChoreDef("Help with cooking", "kitchen", "👩‍🍳", 7, 18, 20),
        ChoreDef("Pack lunch", "kitchen", "🥪", 7, 18, 10, schoolMonths),

        // Laundry
        ChoreDef("Put dirty clothes in hamper", "laundry", "🧺", 4, 12, 5),
        ChoreDef("Sort laundry", "laundry", "👕", 7, 18, 15),
        ChoreDef("Fold laundry", "laundry", "🧥", 7, 18, 15),
        ChoreDef("Put away clean clothes", "laundry", "🗄️", 6, 18, 10),

        // Pets
        ChoreDef("Feed the pet", "pets", "🐾", 5, 18, 10),
        ChoreDef("Fill water bowl", "pets", "💧", 4, 14, 5),
        ChoreDef("Walk the dog", "pets", "🐕", 8, 18, 25),
        ChoreDef("Clean pet area", "pets", "🧹", 8, 18, 20),
        ChoreDef("Clean up dog poop", "pets", "🐕", 9, 18, 30, [3, 4, 5, 6, 7, 8, 9, 10]),

        // Outdoor / seasonal
        ChoreDef("Water plants", "outdoor", "🌱", 4, 14, 10, [4, 5, 6, 7, 8, 9]),
        ChoreDef("Help in the garden", "outdoor", "🌻", 6, 18, 25, [3, 4, 5, 6, 7, 8, 9]),
        ChoreDef("Pull weeds", "outdoor", "🌿", 6, 18, 20, [3, 4, 5, 6, 7, 8]),
        ChoreDef("Plant flowers", "outdoor", "🌷", 6, 18, 25, [3, 4, 5, 6]),
        ChoreDef("Pick up sticks", "outdoor", "🪵", 5, 14, 15, [3, 4, 5, 6, 9, 10, 11]),
        ChoreDef("Pick up litter", "outdoor", "🌎", 6, 18, 20, [3, 4, 5]),
        ChoreDef("Sweep porch or patio", "outdoor", "🧹", 7, 18, 15, [3, 4, 5, 6, 7, 8, 9]),
        ChoreDef("Wash outdoor toys", "outdoor", "🫧", 6, 14, 20, [4, 5, 6, 7, 8]),
        ChoreDef("Refill bird feeder", "outdoor", "🐦", 5, 14, 10, [3, 4, 5, 6, 7, 8]),
        ChoreDef("Rake leaves", "outdoor", "🍂", 6, 18, 25, [9, 10, 11]),
        ChoreDef("Shovel snow from walkway", "outdoor", "❄️", 8, 18, 50, [11, 12, 1, 2, 3]),
        ChoreDef("Take out recycling", "outdoor", "♻️", 6, 18, 10),
        ChoreDef("Take out trash", "outdoor", "🗑️", 7, 18, 10),
        ChoreDef("Bring in mail", "outdoor", "📬", 5, 14, 5),

        // Household
        ChoreDef("Vacuum a room", "household", "🧹", 8, 18, 25),
        ChoreDef("Sweep the floor", "household", "🧹", 7, 18, 15),
        ChoreDef("Dust furniture", "household", "✨", 7, 18, 15),
        ChoreDef("Clean bathroom sink", "household", "🚰", 8, 18, 20),
        ChoreDef("Take out trash cans", "household", "🗑️", 9, 18, 15),
        ChoreDef("Wash trash bins", "household", "🧼", 10, 18, 35, [3, 4, 5, 6, 7, 8, 9]),
        ChoreDef("Wipe down mirrors", "household", "🪞", 7, 18, 10),

        // Learning
        ChoreDef("Read for 20 minutes", "learning", "📖", 5, 18, 15),
        ChoreDef("Do homework", "learning", "📝", 5, 18, 10, schoolMonths),
        ChoreDef("Practice instrument", "learning", "🎵", 5, 18, 15),
        ChoreDef("Screen-free hour", "learning", "📵", 6, 18, 15),
    ]

    static func suggestions(
        childName: String,
        childAge: Int?,
        existingChoreNames: [String],
        completionRate: Double, // 0-100
        count: Int = 5
    ) -> [ChoreSuggestion] {
        let age = (childAge ?? 0) > 0 ? childAge! : 7
        let calendar = Calendar.current
        let month = calendar.component(.month, from: Date())
        let dayOfMonth = calendar.component(.day, from: Date())
        let existingLower = Set(existingChoreNames.map { $0.lowercased().trimmingCharacters(in: .whitespaces) })

        let candidates = catalogue.filter { def in
            age >= def.minAge && age <= def.maxAge && !existingLower.contains(def.name.lowercased())
        }

        let scored = candidates.map { def -> (ChoreDef, Int) in
            var score = 0

            if !def.seasonalMonths.isEmpty && def.seasonalMonths.contains(month) {
                score += 30
            }
            if !existingLower.contains(def.category) {
                score += 15
            }
            if completionRate > 75 && def.rewardCents >= 15 {
                score += 10
            }
            if age <= 6 && def.maxAge <= 10 {
                score += 10
            }
            if def.seasonalMonths.isEmpty {
                score += 5
            }

            // Deterministic daily shuffle (matches web: name hash + day of month)
            let hash = def.name.unicodeScalars.reduce(0) { $0 + Int($1.value) }
            score += (hash + dayOfMonth) % 7

            return (def, score)
        }

        return scored
            .sorted { $0.1 > $1.1 }
            .prefix(count)
            .map { def, _ in
                let reason: String
                if !def.seasonalMonths.isEmpty && def.seasonalMonths.contains(month) {
                    reason = "Great for this time of year"
                } else if completionRate > 75 && def.rewardCents >= 15 {
                    reason = "\(childName) is doing great — ready for a challenge!"
                } else if age <= 6 && def.maxAge <= 10 {
                    reason = "Perfect for \(childName)'s age"
                } else {
                    reason = "Age-appropriate and builds good habits"
                }

                return ChoreSuggestion(
                    name: def.name,
                    category: def.category,
                    icon: def.icon,
                    rewardCents: def.rewardCents,
                    reason: reason
                )
            }
    }
}
