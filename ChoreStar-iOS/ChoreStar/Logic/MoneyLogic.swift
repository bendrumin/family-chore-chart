import Foundation

/// Kid money management (Premium, migration 030), the parts iOS needs.
///
/// The server owns every rule: balances and jars are derived there
/// (chorestar-nextjs/lib/utils/wallet.ts, money.ts) and /api/money refuses
/// anything a free family may not switch on. This file is only the response
/// shapes, the formatting, and the input parsing, so it stays testable.
enum MoneyLogic {
    /// Spend / Save / Give, in whole percents summing to 100.
    struct JarSplit: Equatable, Hashable {
        var spend: Int
        var save: Int
        var give: Int

        var total: Int { spend + save + give }
        var isValid: Bool {
            [spend, save, give].allSatisfy { (0...100).contains($0) } && total == 100
        }
        var label: String { "\(spend)/\(save)/\(give)" }
    }

    /// The web's SPLIT_PRESETS, in the same order.
    static let splitPresets: [JarSplit] = [
        JarSplit(spend: 70, save: 20, give: 10),
        JarSplit(spend: 50, save: 40, give: 10),
        JarSplit(spend: 80, save: 10, give: 10),
        JarSplit(spend: 40, save: 40, give: 20),
    ]
    static let defaultSplit = splitPresets[0]

    static let interestMaxBps = 1000
    static let interestMaxCentsPerWeek = 500
    static let deductionMaxCents = 100_000
    static let minutesMaxPerReward = 600
    static let minutesUsePresets = [15, 30, 60]

    /// Paywall sources, identical to the web's `gate_${feature}`.
    enum Feature: String {
        case jars, allowance, interest, fines, minutes
        var paywallSource: String { "gate_\(rawValue)" }
    }

    // MARK: - Formatting

    /// "$2.50", "¥300", "-$2.00". Uses the family currency's symbol and decimals.
    static func format(cents: Int, currencyCode: String?) -> String {
        let currency = FamilyCurrency.find(currencyCode)
        let amount = Double(abs(cents)) / 100.0
        let body = currency.decimals == 0
            ? String(format: "%@%.0f", currency.symbol, amount.rounded())
            : String(format: "%@%.\(currency.decimals)f", currency.symbol, amount)
        return cents < 0 ? "-\(body)" : body
    }

    /// "+$5.00" for credits, "-$2.00" for deductions, "$0.00" for a skipped allowance.
    static func formatSigned(cents: Int, currencyCode: String?) -> String {
        cents > 0 ? "+\(format(cents: cents, currencyCode: currencyCode))" : format(cents: cents, currencyCode: currencyCode)
    }

    /// "2%" or "2.5%" from basis points, like the web's formatRate.
    static func formatRate(bps: Int) -> String {
        let value = Double(bps) / 100.0
        if value == value.rounded() { return "\(Int(value))%" }
        var text = String(format: "%.2f", value)
        while text.hasSuffix("0") { text.removeLast() }
        return "\(text)%"
    }

    /// "45 min", "1 h", "1 h 30 min". Signed for a corrected balance.
    static func formatMinutes(_ minutes: Int) -> String {
        let sign = minutes < 0 ? "-" : ""
        let m = abs(minutes)
        if m < 60 { return sign + String(localized: "\(m) min") }
        let h = m / 60
        let rest = m % 60
        if rest == 0 { return sign + String(localized: "\(h) h") }
        return sign + String(localized: "\(h) h \(rest) min")
    }

    /// "Sat, Oct 25" for a family-local "YYYY-MM-DD" (no time zone shift).
    static func displayDate(_ ymd: String, locale: Locale = .current) -> String {
        let parse = DateFormatter()
        parse.locale = Locale(identifier: "en_US_POSIX")
        parse.timeZone = TimeZone(identifier: "UTC")
        parse.dateFormat = "yyyy-MM-dd"
        guard let date = parse.date(from: String(ymd.prefix(10))) else { return ymd }
        let out = DateFormatter()
        out.locale = locale
        out.timeZone = TimeZone(identifier: "UTC")
        out.setLocalizedDateFormatFromTemplate("EEE MMM d")
        return out.string(from: date)
    }

    // MARK: - Parsing what a parent types

    /// "2", "2.5", "2,50" -> cents. Nil for empty, negative, or not a number.
    static func cents(from text: String) -> Int? {
        let cleaned = text.trimmingCharacters(in: .whitespaces).replacingOccurrences(of: ",", with: ".")
        guard !cleaned.isEmpty,
              cleaned.allSatisfy({ $0.isNumber || $0 == "." }),
              cleaned.filter({ $0 == "." }).count <= 1,
              let value = Double(cleaned), value.isFinite, value >= 0 else { return nil }
        return Int((value * 100).rounded())
    }

    /// "2.5" (percent a week) -> 250 bps. Empty is 0. Nil when out of range.
    static func interestBps(from text: String) -> Int? {
        let cleaned = text.trimmingCharacters(in: .whitespaces).replacingOccurrences(of: ",", with: ".")
        if cleaned.isEmpty { return 0 }
        guard let value = Double(cleaned), value.isFinite, value >= 0 else { return nil }
        let bps = Int((value * 100).rounded())
        return bps <= interestMaxBps ? bps : nil
    }

    /// The text field for a stored amount: "5.00", or "" for none.
    static func plainAmount(cents: Int) -> String {
        cents > 0 ? String(format: "%.2f", Double(cents) / 100.0) : ""
    }

    // MARK: - Money news

    /// What a money_ledger row is called on the kid's screen and in the parent's
    /// activity list. A 0 allowance is a payday the threshold skipped.
    static func newsTitle(kind: String, amountCents: Int) -> String {
        switch kind {
        case "allowance":
            return amountCents == 0 ? String(localized: "No allowance this week") : String(localized: "Allowance")
        case "interest": return String(localized: "Interest on Save")
        case "fine": return String(localized: "Taken off")
        case "repayment": return String(localized: "Paid back")
        case "donation": return String(localized: "Given away")
        default: return kind.capitalized
        }
    }

    /// The parent's reason matters for a deduction, a skipped allowance and a donation.
    static func showsNote(kind: String, amountCents: Int) -> Bool {
        amountCents < 0 || (kind == "allowance" && amountCents == 0) || kind == "donation"
    }

    /// The web's kid jar fill: relative to the fullest jar, never a sliver.
    static func jarLevel(cents: Int, fullest: Int) -> Double {
        guard cents > 0 else { return 0 }
        let pct = (Double(cents) / Double(max(fullest, 1))) * 100
        return max(12, pct.rounded()) / 100
    }

    // MARK: - Response shapes

    struct Jars: Decodable, Equatable {
        struct Split: Decodable, Equatable {
            let spend: Int
            let save: Int
            let give: Int
        }
        let enabled: Bool
        let split: Split
        let spendCents: Int
        let saveCents: Int
        let giveCents: Int
    }

    struct Minutes: Decodable, Equatable {
        let balance: Int
        let earned: Int
        let used: Int
    }

    /// One money_ledger row (recentLedger in wallet.ts).
    struct LedgerItem: Decodable, Identifiable, Equatable {
        let id: String
        let kind: String
        let jar: String?
        let amountCents: Int
        let effectiveOn: String
        let note: String?
        let createdAt: String?
    }

    /// GET /api/money
    struct Response: Decodable {
        let premium: Bool
        let currencyCode: String?
        let timezone: String?
        let ready: Bool?
        let kids: [Kid]
    }

    /// A kid in GET /api/money. Free families get only id and name.
    struct Kid: Decodable, Identifiable {
        struct Balance: Decodable {
            let balanceCents: Int
            let owedCents: Int
            let spendableCents: Int
            let jars: Jars
        }
        struct SavedSplit: Decodable {
            let enabled: Bool
            let spend: Int
            let save: Int
            let give: Int
        }
        struct Schedule: Decodable {
            let paydayWeekday: Int
            let nextPayday: String
            let allowanceCents: Int
            let thresholdPct: Int?
            let interestBps: Int
        }
        struct Repayment: Decodable, Identifiable {
            let id: String
            let title: String
            let amountCents: Int
            let allowNegative: Bool
        }
        struct RewardItem: Decodable, Identifiable {
            let id: String
            let name: String
            let minutes: Int
        }
        struct MinutesInfo: Decodable {
            let balance: Int
            let earned: Int
            let used: Int
            let chores: [RewardItem]
            let routines: [RewardItem]
            let available: Bool
        }

        let childId: String
        let name: String
        let balance: Balance?
        let split: SavedSplit?
        let schedule: Schedule?
        let repayments: [Repayment]?
        let minutes: MinutesInfo?
        let ledger: [LedgerItem]?

        var id: String { childId }
        /// Has the full Premium detail (free families get only the name).
        var isDetailed: Bool { balance != nil && schedule != nil }
    }

    /// POST /api/money success: `{ ok, kid }`.
    struct PostResponse: Decodable {
        let ok: Bool?
        let kid: Kid?
    }

    /// Why a POST failed, for the screen to say.
    enum PostError: Equatable {
        case premiumRequired(Feature)
        case notEnoughCents(Int)
        case notEnoughMinutes(Int)
        case message(String)
    }

    /// Reads a failed /api/money answer: 403 premium_required, 409 not_enough, else the message.
    static func postError(status: Int, body: Data, fallbackFeature: Feature) -> PostError {
        let obj = (try? JSONSerialization.jsonObject(with: body)) as? [String: Any] ?? [:]
        let code = obj["error"] as? String
        if status == 403, code == "premium_required" {
            return .premiumRequired(Feature(rawValue: obj["feature"] as? String ?? "") ?? fallbackFeature)
        }
        if status == 409, code == "not_enough" {
            if let minutes = obj["availableMinutes"] as? Int { return .notEnoughMinutes(minutes) }
            return .notEnoughCents(obj["availableCents"] as? Int ?? 0)
        }
        if let code, !code.isEmpty, code != "premium_required", code != "not_enough" { return .message(code) }
        return .message(String(localized: "Could not save that"))
    }
}
