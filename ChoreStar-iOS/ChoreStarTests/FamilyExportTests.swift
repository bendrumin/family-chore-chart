import XCTest
@testable import ChoreStar

final class FamilyExportTests: XCTestCase {

    private func chore(_ name: String, reward: Double = 0.25, days: [Int] = ChoreSchedule.everyDay) -> Chore {
        Chore(id: UUID(), name: name, childId: UUID(), reward: reward, description: nil,
              category: nil, icon: nil, color: nil, notes: nil, sortOrder: 0,
              daysOfWeek: days, createdAt: Date(), updatedAt: Date())
    }

    private func child(_ name: String) -> Child {
        Child(id: UUID(), name: name, age: 8, avatarColor: "blue", avatarUrl: nil, avatarFile: nil,
              avatarPhotoPath: nil, userId: UUID(), createdAt: Date(), updatedAt: Date())
    }

    private func snapshot(_ weeks: [FamilyExport.ChildWeek], currency: String = "USD") -> FamilyExport.Snapshot {
        FamilyExport.Snapshot(weekStart: "2026-09-20", weekStartDate: Date(),
                              currency: FamilyCurrency.find(currency), children: weeks)
    }

    func testMoneyUsesTheFamilyCurrencyAndItsDecimals() {
        XCTAssertEqual(FamilyExport.money(150, FamilyCurrency.find("USD")), "$1.50")
        XCTAssertEqual(FamilyExport.money(100, FamilyCurrency.find("SAR")),
                       FamilyCurrency.find("SAR").symbol + "1.00")
        XCTAssertEqual(FamilyExport.money(12000, FamilyCurrency.find("JPY")),
                       FamilyCurrency.find("JPY").symbol + "120", "Zero-decimal currencies print no .00")
    }

    func testCSVHasBOMHeaderAndOneRowPerCompletion() {
        let kid = child("Layla \"Lulu\"")
        let bed = chore("Make bed", reward: 0.5)
        let week = FamilyExport.ChildWeek(
            child: kid, chores: [bed],
            completed: [ChoreDayCell(choreId: bed.id, dayOfWeek: 1), ChoreDayCell(choreId: bed.id, dayOfWeek: 0)],
            perfectDays: 2, dueDays: 7, earnedCents: 100
        )
        let csv = FamilyExport.csv(snapshot([week], currency: "SAR"))

        XCTAssertTrue(csv.hasPrefix("\u{FEFF}"), "BOM so Excel reads UTF-8")
        let lines = csv.dropFirst().components(separatedBy: "\n")
        XCTAssertEqual(lines.first, "\"Child Name\",\"Chore Name\",\"Completed Date\",\"Earnings\",\"Day of Week\"")
        XCTAssertEqual(lines.count, 3)
        XCTAssertTrue(lines[1].hasPrefix("\"Layla \"\"Lulu\"\"\",\"Make bed\""), "Quotes are doubled")
        XCTAssertTrue(lines[1].hasSuffix("\"Sunday\""), "Rows run in day order")
        XCTAssertTrue(lines[2].contains(FamilyCurrency.find("SAR").symbol + "0.50"))
    }

    func testPDFsRenderForEveryDocument() {
        let kid = child("ليلى")
        let week = FamilyExport.ChildWeek(child: kid, chores: [chore("ترتيب السرير", days: [0, 5])],
                                          completed: [], perfectDays: 0, dueDays: 2, earnedCents: 0)
        let data = snapshot([week], currency: "SAR")
        for pdf in [FamilyExport.familyReportPDF(data), FamilyExport.choreChartPDF(data)]
            + FamilyExport.TemplateStyle.allCases.map({ FamilyExport.weeklyTemplatePDF(data, style: $0) }) {
            XCTAssertTrue(pdf.starts(with: Data("%PDF".utf8)))
        }
    }
}
