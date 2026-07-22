import Foundation
import ActivityKit

/// Manages the routine Live Activity (Dynamic Island + lock screen) while a
/// kid plays through a routine. All methods are safe no-ops below iOS 16.2
/// or when Live Activities are disabled.
@MainActor
final class RoutineActivityController {
    static let shared = RoutineActivityController()

    private var activityID: String?

    private init() {}

    func start(routine: Routine, childName: String) {
        guard #available(iOS 16.2, *) else { return }
        guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }

        end() // never run two at once

        let attributes = RoutineActivityAttributes(
            routineName: routine.name,
            childName: childName,
            totalSteps: routine.steps.count
        )

        let firstStep = routine.steps.first
        let state = RoutineActivityAttributes.ContentState(
            stepIndex: 0,
            stepTitle: firstStep?.title ?? routine.name,
            stepEndDate: firstStep?.durationSeconds.map { Date().addingTimeInterval(TimeInterval($0)) }
        )

        do {
            let activity = try Activity.request(
                attributes: attributes,
                content: .init(state: state, staleDate: nil)
            )
            activityID = activity.id
        } catch {
            // Live Activities unavailable (e.g. disabled in Settings) — not fatal
            activityID = nil
        }
    }

    func update(stepIndex: Int, step: RoutineStep?) {
        guard #available(iOS 16.2, *), let activityID = activityID else { return }

        let state = RoutineActivityAttributes.ContentState(
            stepIndex: stepIndex,
            stepTitle: step?.title ?? "",
            stepEndDate: step?.durationSeconds.map { Date().addingTimeInterval(TimeInterval($0)) }
        )

        Task {
            for activity in Activity<RoutineActivityAttributes>.activities where activity.id == activityID {
                await activity.update(.init(state: state, staleDate: nil))
            }
        }
    }

    func end() {
        guard #available(iOS 16.2, *) else { return }
        guard activityID != nil else { return }
        activityID = nil

        Task {
            for activity in Activity<RoutineActivityAttributes>.activities {
                await activity.end(nil, dismissalPolicy: .immediate)
            }
        }
    }
}
