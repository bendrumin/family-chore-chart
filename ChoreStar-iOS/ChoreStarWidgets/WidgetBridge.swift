import Foundation
import ActivityKit

// ⚠️ Keep in sync with ChoreStar/Models/WidgetBridge.swift (app target copy).
// The types are compiled into both targets; ActivityKit and the snapshot
// decoder match them by name and Codable shape.

enum WidgetBridgeConstants {
    static let appGroupID = "group.com.chorestar.ChoreStar"
    static let snapshotKey = "widget_snapshot_v1"
}

/// Daily progress snapshot the app writes for the widget to render.
struct WidgetSnapshot: Codable {
    struct ChildProgress: Codable, Identifiable {
        let id: UUID
        let name: String
        let colorName: String
        let done: Int
        let total: Int
    }

    let completedToday: Int
    let totalToday: Int
    let earnedTodayFormatted: String
    let children: [ChildProgress]
    let generatedAt: Date
    /// Longest current streak in the family. Optional so a snapshot written by
    /// an older app version still decodes.
    var topStreak: Int? = nil
    /// The family's theme accent pair, "#rrggbb", so the widget matches the
    /// app instead of staying brand indigo. Optional for old snapshots.
    var accentHex: String? = nil
    var secondaryHex: String? = nil

    var progress: Double {
        totalToday > 0 ? Double(completedToday) / Double(totalToday) : 0
    }

    static func load() -> WidgetSnapshot? {
        guard let defaults = UserDefaults(suiteName: WidgetBridgeConstants.appGroupID),
              let data = defaults.data(forKey: WidgetBridgeConstants.snapshotKey) else {
            return nil
        }
        return try? JSONDecoder().decode(WidgetSnapshot.self, from: data)
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
