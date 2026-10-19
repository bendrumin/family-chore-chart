import XCTest
@testable import ChoreStar

/// Kid money (migration 030): formatting, parsing and the /api/money and
/// /api/kid/wallet shapes, matching chorestar-nextjs/lib/utils/money.ts.
final class MoneyLogicTests: XCTestCase {
    func testPresetsMatchTheWebAndAreValid() {
        XCTAssertEqual(MoneyLogic.splitPresets.map(\.label), ["70/20/10", "50/40/10", "80/10/10", "40/40/20"])
        XCTAssertTrue(MoneyLogic.splitPresets.allSatisfy(\.isValid))
        XCTAssertEqual(MoneyLogic.defaultSplit, MoneyLogic.JarSplit(spend: 70, save: 20, give: 10))
    }

    func testSplitMustTotalAHundred() {
        XCTAssertFalse(MoneyLogic.JarSplit(spend: 70, save: 20, give: 5).isValid)
        XCTAssertFalse(MoneyLogic.JarSplit(spend: 110, save: -10, give: 0).isValid)
        XCTAssertTrue(MoneyLogic.JarSplit(spend: 100, save: 0, give: 0).isValid)
    }

    func testFormatUsesCurrencyDecimalsAndSign() {
        XCTAssertEqual(MoneyLogic.format(cents: 250, currencyCode: "USD"), "$2.50")
        XCTAssertEqual(MoneyLogic.format(cents: -200, currencyCode: "USD"), "-$2.00")
        XCTAssertEqual(MoneyLogic.format(cents: 30000, currencyCode: "JPY"), "¥300")
        XCTAssertEqual(MoneyLogic.format(cents: 1240, currencyCode: "EUR"), "€12.40")
        XCTAssertEqual(MoneyLogic.formatSigned(cents: 500, currencyCode: "USD"), "+$5.00")
        XCTAssertEqual(MoneyLogic.formatSigned(cents: -75, currencyCode: "USD"), "-$0.75")
        XCTAssertEqual(MoneyLogic.formatSigned(cents: 0, currencyCode: "USD"), "$0.00")
    }

    func testFormatRateLikeTheWeb() {
        XCTAssertEqual(MoneyLogic.formatRate(bps: 200), "2%")
        XCTAssertEqual(MoneyLogic.formatRate(bps: 250), "2.5%")
        XCTAssertEqual(MoneyLogic.formatRate(bps: 125), "1.25%")
        XCTAssertEqual(MoneyLogic.formatRate(bps: 1000), "10%")
    }

    func testFormatMinutes() {
        XCTAssertEqual(MoneyLogic.formatMinutes(45), "45 min")
        XCTAssertEqual(MoneyLogic.formatMinutes(60), "1 h")
        XCTAssertEqual(MoneyLogic.formatMinutes(90), "1 h 30 min")
        XCTAssertEqual(MoneyLogic.formatMinutes(-15), "-15 min")
    }

    func testParsesWhatAParentTypes() {
        XCTAssertEqual(MoneyLogic.cents(from: "2"), 200)
        XCTAssertEqual(MoneyLogic.cents(from: "2.5"), 250)
        XCTAssertEqual(MoneyLogic.cents(from: "2,50"), 250)
        XCTAssertEqual(MoneyLogic.cents(from: " 0.07 "), 7)
        XCTAssertNil(MoneyLogic.cents(from: ""))
        XCTAssertNil(MoneyLogic.cents(from: "abc"))
        XCTAssertNil(MoneyLogic.cents(from: "-1"))
        XCTAssertNil(MoneyLogic.cents(from: "1.2.3"))
    }

    func testInterestPercentToBasisPoints() {
        XCTAssertEqual(MoneyLogic.interestBps(from: ""), 0)
        XCTAssertEqual(MoneyLogic.interestBps(from: "2"), 200)
        XCTAssertEqual(MoneyLogic.interestBps(from: "2.5"), 250)
        XCTAssertEqual(MoneyLogic.interestBps(from: "10"), 1000)
        XCTAssertNil(MoneyLogic.interestBps(from: "10.5"), "over the 10% cap")
        XCTAssertNil(MoneyLogic.interestBps(from: "x"))
    }

    func testPlainAmount() {
        XCTAssertEqual(MoneyLogic.plainAmount(cents: 500), "5.00")
        XCTAssertEqual(MoneyLogic.plainAmount(cents: 0), "")
    }

    func testNewsTitlesAndNotes() {
        XCTAssertEqual(MoneyLogic.newsTitle(kind: "allowance", amountCents: 500), "Allowance")
        XCTAssertEqual(MoneyLogic.newsTitle(kind: "allowance", amountCents: 0), "No allowance this week")
        XCTAssertEqual(MoneyLogic.newsTitle(kind: "fine", amountCents: -200), "Taken off")
        XCTAssertTrue(MoneyLogic.showsNote(kind: "fine", amountCents: -200))
        XCTAssertTrue(MoneyLogic.showsNote(kind: "allowance", amountCents: 0))
        XCTAssertTrue(MoneyLogic.showsNote(kind: "donation", amountCents: -100))
        XCTAssertFalse(MoneyLogic.showsNote(kind: "interest", amountCents: 17))
    }

    func testJarLevelNeverASliver() {
        XCTAssertEqual(MoneyLogic.jarLevel(cents: 0, fullest: 1000), 0)
        XCTAssertEqual(MoneyLogic.jarLevel(cents: 1000, fullest: 1000), 1)
        XCTAssertEqual(MoneyLogic.jarLevel(cents: 10, fullest: 1000), 0.12)
        XCTAssertEqual(MoneyLogic.jarLevel(cents: -50, fullest: 1000), 0)
    }

    func testDisplayDateHasNoTimeZoneShift() {
        let text = MoneyLogic.displayDate("2026-10-25", locale: Locale(identifier: "en_US"))
        XCTAssertTrue(text.contains("25"), text)
        XCTAssertTrue(text.contains("Sun"), text)
    }

    func testDecodesWalletMoneyFields() throws {
        let json = """
        {"childId":"6f1c2b9e-1111-4a2b-9c3d-123456789abc","owedCents":0,"currencyCode":"USD","goal":null,
         "reachedGoals":[],"store":[],"limits":{"premium":true,"goalLimit":null,"storeItemLimit":null},
         "balanceCents":-150,"spendableCents":0,
         "jars":{"enabled":true,"split":{"spend":70,"save":20,"give":10},"spendCents":-150,"saveCents":400,"giveCents":120},
         "minutes":{"balance":45,"earned":75,"used":30},
         "moneyNews":[{"id":"a","kind":"fine","jar":"spend","amountCents":-200,"effectiveOn":"2026-10-18","note":"Bike in the rain","createdAt":"2026-10-18T10:00:00Z"}]}
        """
        let wallet = try JSONDecoder().decode(SupabaseManager.KidWallet.self, from: Data(json.utf8))
        XCTAssertEqual(wallet.balanceCents, -150)
        XCTAssertEqual(wallet.spendable, 0)
        XCTAssertEqual(wallet.jars?.saveCents, 400)
        XCTAssertEqual(wallet.minutes?.balance, 45)
        XCTAssertEqual(wallet.moneyNews?.first?.note, "Bike in the rain")
    }

    func testOlderWalletWithoutMoneyFieldsStillDecodes() throws {
        let json = """
        {"childId":"6f1c2b9e-1111-4a2b-9c3d-123456789abc","owedCents":300,"currencyCode":"USD","goal":null,
         "reachedGoals":[],"store":[],"limits":{"premium":false,"goalLimit":1,"storeItemLimit":3}}
        """
        let wallet = try JSONDecoder().decode(SupabaseManager.KidWallet.self, from: Data(json.utf8))
        XCTAssertNil(wallet.jars)
        XCTAssertEqual(wallet.spendable, 300, "falls back to the whole balance")
    }

    func testDecodesMoneyResponseForFreeAndPremium() throws {
        let free = """
        {"premium":false,"currencyCode":"USD","timezone":"UTC","ready":true,"kids":[{"childId":"k1","name":"Maya"}]}
        """
        let decodedFree = try JSONDecoder().decode(MoneyLogic.Response.self, from: Data(free.utf8))
        XCTAssertFalse(decodedFree.premium)
        XCTAssertFalse(decodedFree.kids[0].isDetailed)

        let premium = """
        {"premium":true,"currencyCode":"USD","timezone":"America/New_York","ready":true,"kids":[{
          "childId":"k1","name":"Maya",
          "balance":{"balanceCents":500,"owedCents":500,"spendableCents":350,
            "jars":{"enabled":true,"split":{"spend":70,"save":20,"give":10},"spendCents":350,"saveCents":100,"giveCents":50}},
          "split":{"enabled":true,"spend":70,"save":20,"give":10},
          "schedule":{"paydayWeekday":6,"nextPayday":"2026-10-24","allowanceCents":500,"thresholdPct":80,"interestBps":200},
          "repayments":[{"id":"r1","title":"Phone bill","amountCents":200,"allowNegative":false,"startedOn":"2026-10-01"}],
          "minutes":{"balance":30,"earned":30,"used":0,"available":true,
            "chores":[{"id":"c1","name":"Dishes","rewardCents":50,"minutes":10}],
            "routines":[{"id":"r2","name":"Bedtime","minutes":15}]},
          "ledger":[]}]}
        """
        let decoded = try JSONDecoder().decode(MoneyLogic.Response.self, from: Data(premium.utf8))
        let kid = decoded.kids[0]
        XCTAssertTrue(kid.isDetailed)
        XCTAssertEqual(kid.schedule?.thresholdPct, 80)
        XCTAssertEqual(kid.repayments?.first?.title, "Phone bill")
        XCTAssertEqual(kid.minutes?.chores.first?.minutes, 10)
    }

    func testReadsPostErrors() {
        let premium = Data(#"{"error":"premium_required","feature":"interest"}"#.utf8)
        XCTAssertEqual(MoneyLogic.postError(status: 403, body: premium, fallbackFeature: .jars), .premiumRequired(.interest))
        let cents = Data(#"{"error":"not_enough","availableCents":120}"#.utf8)
        XCTAssertEqual(MoneyLogic.postError(status: 409, body: cents, fallbackFeature: .fines), .notEnoughCents(120))
        let minutes = Data(#"{"error":"not_enough","availableMinutes":20}"#.utf8)
        XCTAssertEqual(MoneyLogic.postError(status: 409, body: minutes, fallbackFeature: .minutes), .notEnoughMinutes(20))
        let message = Data(#"{"error":"The three jars must add up to 100%"}"#.utf8)
        XCTAssertEqual(MoneyLogic.postError(status: 400, body: message, fallbackFeature: .jars), .message("The three jars must add up to 100%"))
    }

    func testPaywallSourcesMatchTheWeb() {
        XCTAssertEqual(MoneyLogic.Feature.jars.paywallSource, "gate_jars")
        XCTAssertEqual(MoneyLogic.Feature.allowance.paywallSource, "gate_allowance")
        XCTAssertEqual(MoneyLogic.Feature.interest.paywallSource, "gate_interest")
        XCTAssertEqual(MoneyLogic.Feature.fines.paywallSource, "gate_fines")
        XCTAssertEqual(MoneyLogic.Feature.minutes.paywallSource, "gate_minutes")
    }
}
