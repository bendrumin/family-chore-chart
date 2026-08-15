import XCTest
@testable import ChoreStar

/// Locks in the avatar storage-path rules. Storage object names are
/// case-sensitive and the RLS policy compares the leading folder against
/// auth.uid()::text, which Postgres renders lowercase — while Foundation's
/// UUID.uuidString is uppercase. Building the path without lowercasing
/// produced uploads the policy rejected outright.
final class AvatarPathTests: XCTestCase {

    private let ownerId = "5D3F9C4A-1B2E-4F6A-8C7D-0E1F2A3B4C5D"
    private let childId = UUID(uuidString: "A1B2C3D4-E5F6-4A5B-8C9D-0E1F2A3B4C5D")!

    func testEveryComponentIsLowercased() {
        let path = SupabaseManager.avatarObjectPath(ownerId: ownerId, childId: childId)
        XCTAssertEqual(path, path.lowercased(), "RLS compares against auth.uid()::text, which is lowercase")
    }

    func testPathShape() {
        let path = SupabaseManager.avatarObjectPath(ownerId: ownerId, childId: childId)
        let components = path.split(separator: "/")

        XCTAssertEqual(components.count, 3, "Expected {user_id}/{child_id}/{uuid}.jpg")
        XCTAssertEqual(String(components[0]), ownerId.lowercased())
        XCTAssertEqual(String(components[1]), childId.uuidString.lowercased())
        XCTAssertTrue(components[2].hasSuffix(".jpg"))
    }

    func testFilenameIsUniquePerCall() {
        let first = SupabaseManager.avatarObjectPath(ownerId: ownerId, childId: childId)
        let second = SupabaseManager.avatarObjectPath(ownerId: ownerId, childId: childId)
        XCTAssertNotEqual(first, second, "Re-uploads must not overwrite the previous object")
    }
}
