import Foundation

struct Profile: Codable {
    let id: UUID
    let subscriptionType: String

    enum CodingKeys: String, CodingKey {
        case id
        case subscriptionType = "subscription_type"
    }

    var isPremium: Bool {
        subscriptionType == "premium" || subscriptionType == "lifetime"
    }
}

struct ProfileRow: Codable {
    let id: UUID
    let subscription_type: String?
}
