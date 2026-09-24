import WidgetKit
import SwiftUI
import AppIntents

/// Extension-target half of `CompleteChoreIntent`. The app target defines the
/// real one; because the intent is a `LiveActivityIntent` compiled into the
/// app too, the system runs it there. The extension has no Supabase session,
/// so if it ever ends up running the intent itself it leaves data untouched
/// and the timeline reload shows the unchanged state.
enum WidgetTickPerformer {
    static func perform(choreId: UUID) async {}
}

/// How many remaining rows each child gets when `lines` lines are available
/// and every shown child also spends one line on its header. Rows are dealt
/// out one per child per round, in order, so no kid is crowded out by a
/// sibling with a long list.
func widgetRowBudget(remainingCounts: [Int], lines: Int) -> [Int] {
    var budget = Array(repeating: 0, count: remainingCounts.count)
    var left = lines - remainingCounts.count
    var progressed = true
    while left > 0 && progressed {
        progressed = false
        for i in remainingCounts.indices where left > 0 && budget[i] < remainingCounts[i] {
            budget[i] += 1
            left -= 1
            progressed = true
        }
    }
    return budget
}

/// The round tick target. A plain circle for an open chore, an hourglass for
/// a kid's tick that is waiting on a parent (a tick here approves it).
struct TickCircle: View {
    let isPending: Bool
    let tint: Color
    var size: CGFloat = 18

    var body: some View {
        Image(systemName: isPending ? "hourglass.circle" : "circle")
            .font(.system(size: size, weight: .medium))
            .foregroundStyle(tint)
            .frame(width: size + 4, height: size + 4)
            .contentShape(Rectangle())
    }
}

/// One remaining chore. Tickable rows are an intent button; display-only rows
/// (kid session, signed out, yesterday's snapshot) open the child in the app.
struct ChoreTickRow: View {
    let item: WidgetSnapshot.ChoreItem
    let childId: UUID
    let tint: Color
    let tickable: Bool

    var body: some View {
        if tickable {
            Button(intent: CompleteChoreIntent(choreId: item.id)) {
                label
            }
            .buttonStyle(.plain)
            .accessibilityLabel(Text("Mark \(item.name) done"))
        } else {
            Link(destination: chorestarURL(childId: childId)) {
                label
            }
        }
    }

    private var label: some View {
        HStack(spacing: 8) {
            TickCircle(isPending: item.isPending == true, tint: tickable ? tint : .secondary)
            if let emoji = item.emoji {
                Text(emoji).font(.caption)
            }
            Text(item.name)
                .font(.caption)
                .foregroundStyle(.primary)
                .lineLimit(1)
            Spacer(minLength: 4)
            if item.isPending == true {
                Text("Needs your OK")
                    .font(.system(.caption2, design: .rounded).weight(.semibold))
                    .foregroundStyle(.orange)
                    .lineLimit(1)
            }
        }
    }
}
