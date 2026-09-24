import Foundation
import WidgetKit
import ActivityKit
import AppIntents

// ⚠️ Keep in sync with ChoreStarWidgets/WidgetBridge.swift (widget target copy).
// The types are compiled into both targets; ActivityKit, App Intents, and the
// snapshot decoder match them by name and Codable shape. The only per-target
// piece is `WidgetTickPerformer`, which each target defines on its own.

enum WidgetBridgeConstants {
    static let appGroupID = "group.com.chorestar.ChoreStar"
    static let snapshotKey = "widget_snapshot_v1"
}

/// Daily progress snapshot the app writes for the widget to render.
struct WidgetSnapshot: Codable {
    /// A chore still on a child's list today: one tickable widget row.
    struct ChoreItem: Codable, Identifiable, Hashable {
        let id: UUID
        let name: String
        /// Only set when the chore's icon is an emoji; the widget cannot
        /// render the app's bundled icon art.
        var emoji: String? = nil
        /// A kid ticked it and it waits for a parent. A widget tick approves it.
        var isPending: Bool? = nil
    }

    struct ChildProgress: Codable, Identifiable {
        let id: UUID
        let name: String
        let colorName: String
        var done: Int
        let total: Int
        /// The child's active goal (2.0). Optional so older snapshots decode.
        var goalEmoji: String? = nil
        var goalPercent: Int? = nil
        /// Chores due today that are not done yet, in list order.
        var remaining: [ChoreItem]? = nil
    }

    var completedToday: Int
    let totalToday: Int
    let earnedTodayFormatted: String
    var children: [ChildProgress]
    let generatedAt: Date
    /// Longest current streak in the family. Optional so a snapshot written by
    /// an older app version still decodes.
    var topStreak: Int? = nil
    /// The family's theme accent pair, "#rrggbb", so the widget matches the
    /// app instead of staying brand indigo. Optional for old snapshots.
    var accentHex: String? = nil
    var secondaryHex: String? = nil
    /// The local day (yyyy-MM-dd) the numbers describe, so yesterday's rows
    /// are never offered as ticks after midnight.
    var day: String? = nil
    /// A parent is signed in and no kid session is active on the device. A
    /// widget tick is a parent's approved tick, so anything else renders
    /// display-only rows.
    var canTick: Bool? = nil

    var progress: Double {
        totalToday > 0 ? Double(completedToday) / Double(totalToday) : 0
    }

    static func dayKey(for date: Date, calendar: Calendar = .current) -> String {
        let c = calendar.dateComponents([.year, .month, .day], from: date)
        return String(format: "%04d-%02d-%02d", c.year ?? 0, c.month ?? 0, c.day ?? 0)
    }

    /// Whether rows may carry tick buttons at `date`.
    func allowsTicks(at date: Date = Date(), calendar: Calendar = .current) -> Bool {
        canTick == true && day == WidgetSnapshot.dayKey(for: date, calendar: calendar)
    }

    /// This snapshot with `choreId` checked off: out of its child's remaining
    /// rows and counted as done. nil when no remaining row has that id.
    func markingDone(choreId: UUID) -> WidgetSnapshot? {
        guard let index = children.firstIndex(where: {
            $0.remaining?.contains(where: { $0.id == choreId }) == true
        }) else { return nil }
        var copy = self
        copy.children[index].remaining?.removeAll { $0.id == choreId }
        copy.children[index].done = min(copy.children[index].done + 1, copy.children[index].total)
        copy.completedToday = min(copy.completedToday + 1, copy.totalToday)
        return copy
    }

    static func load() -> WidgetSnapshot? {
        guard let defaults = UserDefaults(suiteName: WidgetBridgeConstants.appGroupID),
              let data = defaults.data(forKey: WidgetBridgeConstants.snapshotKey) else {
            return nil
        }
        return try? JSONDecoder().decode(WidgetSnapshot.self, from: data)
    }

    /// Writes the snapshot to the shared app group and refreshes all widgets.
    func publish() {
        guard let defaults = UserDefaults(suiteName: WidgetBridgeConstants.appGroupID),
              let data = try? JSONEncoder().encode(self) else { return }
        defaults.set(data, forKey: WidgetBridgeConstants.snapshotKey)
        WidgetCenter.shared.reloadAllTimelines()
    }
}

/// Checks off one of today's chores from a widget row.
///
/// A `LiveActivityIntent` so that, with the type compiled into the app as
/// well as the extension, the system runs `perform()` in the APP's process
/// (launched in the background if needed). That process holds the parent's
/// Supabase session in its own keychain; the extension has no session and no
/// Supabase SDK, so it could not write the completion itself.
struct CompleteChoreIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Mark Chore Done"
    static var description: IntentDescription? = IntentDescription("Checks off one of today's chores from the widget.")
    static var isDiscoverable: Bool = false
    static var authenticationPolicy: IntentAuthenticationPolicy = .requiresAuthentication

    @Parameter(title: "Chore")
    var choreId: String

    init() {}

    init(choreId: UUID) {
        self.choreId = choreId.uuidString.lowercased()
    }

    func perform() async throws -> some IntentResult {
        if let id = UUID(uuidString: choreId) {
            await WidgetTickPerformer.perform(choreId: id)
        }
        return .result()
    }
}

/// Live Activity attributes for a routine in progress.
struct RoutineActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var stepIndex: Int          // 0-based
        var stepTitle: String
        var stepEndDate: Date?      // set when the step has a timer
    }

    var routineName: String
    var childName: String
    var totalSteps: Int
    /// Theme accent for the progress tint, "#rrggbb". Optional so an activity
    /// started by an older build still decodes.
    var accentHex: String? = nil
}
