import XCTest
@testable import ChoreStar

/// Joining a family goes through the `join_family_with_code` RPC; these pin
/// how its result and its errors are read.
final class FamilyJoinTests: XCTestCase {
    func testNormalizeTrimsAndLowercases() {
        XCTAssertEqual(FamilyJoin.normalize("  AbC23xyZ \n"), "abc23xyz")
    }

    func testOwnerIdFromScalarResponse() {
        let id = UUID()
        let body = Data("\"\(id.uuidString.lowercased())\"".utf8)
        XCTAssertEqual(FamilyJoin.ownerId(fromResponse: body), id)
    }

    func testNullOrEmptyResponseMeansCodeNotFound() {
        XCTAssertNil(FamilyJoin.ownerId(fromResponse: Data("null".utf8)))
        XCTAssertNil(FamilyJoin.ownerId(fromResponse: Data()))
        XCTAssertNil(FamilyJoin.ownerId(fromResponse: Data("\"\"".utf8)))
    }

    func testFailureReadsKeywordFromMessageOrHint() {
        XCTAssertEqual(FamilyJoin.failure(message: "own_family", hint: nil), .ownFamily)
        XCTAssertEqual(FamilyJoin.failure(message: "join failed", hint: "family_not_premium"), .familyNotPremium)
        XCTAssertEqual(FamilyJoin.failure(message: "TOO_MANY_ATTEMPTS", hint: nil), .tooManyAttempts)
        XCTAssertEqual(FamilyJoin.failure(message: "x", hint: nil, detail: "code_not_found"), .codeNotFound)
        XCTAssertEqual(FamilyJoin.failure(message: "not_signed_in", hint: nil), .notSignedIn)
        XCTAssertEqual(FamilyJoin.failure(message: "network down", hint: nil), .other)
    }

    func testEveryKnownFailureHasAMessage() {
        for failure: FamilyJoin.Failure in [.codeNotFound, .ownFamily, .familyNotPremium, .tooManyAttempts, .notSignedIn] {
            XCTAssertNotNil(FamilyJoin.message(for: failure))
        }
        XCTAssertNil(FamilyJoin.message(for: .other))
    }
}
