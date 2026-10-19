import Foundation

/// Joining another family by code goes through the Postgres function
/// `join_family_with_code(p_code text)`: clients can no longer insert into
/// `family_members` or read other families' `family_codes`. The function
/// returns the owner's uuid on success and null when no family has the code
/// (it returns rather than raises so the attempt is logged for rate
/// limiting). Other failures raise with a keyword in the message or hint.
enum FamilyJoin {
    enum Failure: Equatable {
        case codeNotFound, ownFamily, familyNotPremium, tooManyAttempts, notSignedIn, other
    }

    /// Codes are stored lowercase; people paste them with stray spaces.
    static func normalize(_ code: String) -> String {
        code.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    }

    /// The RPC's body is a bare JSON scalar: `"<uuid>"` or `null`.
    static func ownerId(fromResponse data: Data) -> UUID? {
        guard let raw = String(data: data, encoding: .utf8) else { return nil }
        let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
            .trimmingCharacters(in: CharacterSet(charactersIn: "\""))
        guard !trimmed.isEmpty, trimmed != "null" else { return nil }
        return UUID(uuidString: trimmed)
    }

    /// Reads the failure keyword from whichever field the server put it in.
    static func failure(message: String?, hint: String?, detail: String? = nil) -> Failure {
        let text = [hint, message, detail].compactMap { $0 }.joined(separator: " ").lowercased()
        if text.contains("code_not_found") { return .codeNotFound }
        if text.contains("own_family") { return .ownFamily }
        if text.contains("family_not_premium") { return .familyNotPremium }
        if text.contains("too_many_attempts") { return .tooManyAttempts }
        if text.contains("not_signed_in") { return .notSignedIn }
        return .other
    }

    static func message(for failure: Failure) -> String? {
        switch failure {
        case .codeNotFound: return String(localized: "Code not found")
        case .ownFamily: return String(localized: "That's your own family code")
        case .familyNotPremium: return String(localized: "That family needs Premium to share. Ask the owner to upgrade.")
        case .tooManyAttempts: return String(localized: "Too many tries. Wait an hour and try again.")
        case .notSignedIn: return String(localized: "Not signed in.")
        case .other: return nil
        }
    }
}
