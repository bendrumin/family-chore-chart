import ActivityKit
import WidgetKit
import SwiftUI

/// Live Activity for a routine in progress: lock screen banner + Dynamic Island.
/// Attributes are defined in WidgetBridge.swift (shared shape with the app target).
struct RoutineLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: RoutineActivityAttributes.self) { context in
            // Lock screen / banner
            LockScreenRoutineView(context: context)
                .activityBackgroundTint(Color(red: 0.388, green: 0.400, blue: 0.945).opacity(0.12))
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(context.attributes.routineName)
                            .font(.headline)
                            .lineLimit(1)
                        Text(context.attributes.childName)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                DynamicIslandExpandedRegion(.trailing) {
                    if let endDate = context.state.stepEndDate {
                        Text(timerInterval: Date()...endDate, countsDown: true)
                            .font(.system(.title3, design: .rounded).weight(.bold))
                            .monospacedDigit()
                            .frame(maxWidth: 60)
                            .multilineTextAlignment(.trailing)
                    } else {
                        stepFraction(context)
                            .font(.system(.title3, design: .rounded).weight(.bold))
                    }
                }
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text(context.state.stepTitle)
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .lineLimit(1)

                        ProgressView(value: stepProgress(context))
                            .tint(Color(red: 0.388, green: 0.400, blue: 0.945))
                    }
                }
            } compactLeading: {
                Image(systemName: "star.fill")
                    .foregroundColor(Color(red: 0.961, green: 0.620, blue: 0.043))
            } compactTrailing: {
                if let endDate = context.state.stepEndDate {
                    Text(timerInterval: Date()...endDate, countsDown: true)
                        .monospacedDigit()
                        .font(.caption2)
                        .frame(maxWidth: 44)
                } else {
                    stepFraction(context)
                        .font(.caption2)
                }
            } minimal: {
                Image(systemName: "star.fill")
                    .foregroundColor(Color(red: 0.961, green: 0.620, blue: 0.043))
            }
        }
    }

    private func stepFraction(_ context: ActivityViewContext<RoutineActivityAttributes>) -> Text {
        Text("\(context.state.stepIndex + 1)/\(context.attributes.totalSteps)")
    }

    private func stepProgress(_ context: ActivityViewContext<RoutineActivityAttributes>) -> Double {
        guard context.attributes.totalSteps > 0 else { return 0 }
        return Double(context.state.stepIndex) / Double(context.attributes.totalSteps)
    }
}

private struct LockScreenRoutineView: View {
    let context: ActivityViewContext<RoutineActivityAttributes>

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Image(systemName: "star.fill")
                    .foregroundColor(Color(red: 0.961, green: 0.620, blue: 0.043))
                Text("\(context.attributes.childName) · \(context.attributes.routineName)")
                    .font(.subheadline)
                    .fontWeight(.bold)
                    .lineLimit(1)

                Spacer()

                if let endDate = context.state.stepEndDate {
                    Text(timerInterval: Date()...endDate, countsDown: true)
                        .font(.system(.subheadline, design: .rounded).weight(.bold))
                        .monospacedDigit()
                        .frame(maxWidth: 56)
                }
            }

            Text("Step \(context.state.stepIndex + 1) of \(context.attributes.totalSteps): \(context.state.stepTitle)")
                .font(.headline)
                .lineLimit(1)

            ProgressView(value: Double(context.state.stepIndex), total: Double(max(context.attributes.totalSteps, 1)))
                .tint(Color(red: 0.388, green: 0.400, blue: 0.945))
        }
        .padding(16)
    }
}
