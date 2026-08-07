import Foundation

struct Profile: Codable {
    let id: UUID
    let subscriptionType: String

    enum CodingKeys: String, CodingKey {
        case id
        case subscriptionType = "subscription_type"
    }

    var isPremium: Bool {
        // "lifetime" is still honored: the tier was withdrawn before it ever
        // sold, but reading it costs nothing and never strands a purchaser.
        subscriptionType == "premium" || subscriptionType == "lifetime"
    }
}

struct ProfileRow: Codable {
    let id: UUID
    let subscription_type: String?
    let kid_login_code: String?
}
