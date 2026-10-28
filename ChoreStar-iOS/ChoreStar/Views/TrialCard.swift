import SwiftUI

/// The free week at a glance (web lib/engagement/trial.ts via
/// /api/engagement/trial): which day it is, what the family has done, and one
/// Premium feature to try next. What decides whether a trial converts is
/// whether the kids are using it by the end of the week, so this sits at the
/// top of the dashboard for those seven days and nowhere else.
///
/// Renders nothing outside a trial. `inTrial` lets the dashboard hold back the
/// discover card, which would otherwise offer the same feature twice.
struct TrialCard: View {
    @EnvironmentObject var manager: SupabaseManager
    @Binding var inTrial: Bool
    @State private var trial: TrialState?
    @State private var sheet: DiscoverSheet?

    var body: some View {
        VStack(spacing: 0) {
            if let trial {
                card(trial)
            } else {
                // A real view, so the .task below installs (see ApprovalTrayView).
                Color.clear.frame(width: 0, height: 0)
            }
        }
        .task(id: manager.isPremium) { await load() }
        .featureSheet($sheet)
    }

    private func card(_ t: TrialState) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .top, spacing: 12) {
                Image(systemName: "gift.fill")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(.choreStarPrimary)
                    .accessibilityHidden(true)
                VStack(alignment: .leading, spacing: 4) {
                    Text("Day \(t.day) of your free week")
                        .font(.display(17, weight: .bold))
                        .foregroundColor(.choreStarTextPrimary)
                    Text(summary(t))
                        .font(.subheadline)
                        .foregroundColor(.choreStarTextSecondary)
                        .fixedSize(horizontal: false, vertical: true)
                    if !t.used.isEmpty {
                        Text("Premium you are using: \(t.used.formatted(.list(type: .and)))")
                            .font(.subheadline)
                            .foregroundColor(.choreStarTextSecondary)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
            }

            HStack(spacing: 4) {
                ForEach(0..<7, id: \.self) { i in
                    Capsule()
                        .fill(i < t.day ? Color.choreStarPrimary : Color.choreStarSecondary.opacity(0.3))
                        .frame(height: 6)
                }
            }
            .accessibilityElement()
            .accessibilityLabel(Text("Day \(t.day) of 7"))

            if let next = t.next, DiscoverCard.knownIds.contains(next.id) {
                VStack(alignment: .leading, spacing: 10) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Try next: \(next.title)")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundColor(.choreStarTextPrimary)
                        Text(next.body)
                            .font(.caption)
                            .foregroundColor(.choreStarTextSecondary)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    Button {
                        sheet = DiscoverSheet(featureId: next.id, firstChild: manager.children.first)
                    } label: {
                        Text(next.cta)
                            .font(.subheadline)
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 10)
                            .background(Color.choreStarFill)
                            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(12)
                .background(Color.choreStarPrimary.opacity(0.08))
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(20)
        .background(Color.choreStarCardBackground)
        .cornerRadius(16)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .strokeBorder(Color.choreStarPrimary.opacity(0.25), lineWidth: 1)
        )
    }

    private func summary(_ t: TrialState) -> String {
        var parts: [String] = []
        if t.choresDone > 0 || t.routinesDone > 0 {
            parts.append(String(localized: "Chores done: \(t.choresDone). Routines finished: \(t.routinesDone)."))
        } else {
            parts.append(String(localized: "Nothing checked off yet. Kids with their own PIN can start right away."))
        }
        if let ends = PlanLimitsCard.parseDate(t.endsAt) {
            let date = ends.formatted(.dateTime.weekday(.wide).month(.wide).day())
            if t.renewing {
                parts.append(String(localized: "Premium continues after \(date)."))
            } else {
                parts.append(String(localized: "Renewal is off, so Premium ends \(date)."))
            }
        }
        return parts.joined(separator: " ")
    }

    private func load() async {
        guard !manager.isChildSession else { return }
        let lang = Bundle.main.preferredLocalizations.first ?? "en"
        guard let (data, status) = await manager.parentAPI("/api/engagement/trial", query: ["lang": lang]),
              status == 200,
              let answer = try? JSONDecoder().decode(TrialAnswer.self, from: data) else { return }
        trial = answer.trial
        inTrial = answer.trial != nil
    }
}

struct TrialState: Decodable {
    let rail: String
    let endsAt: String
    let renewing: Bool
    let day: Int
    let choresDone: Int
    let routinesDone: Int
    let used: [String]
    let next: DiscoverFeature?
}

private struct TrialAnswer: Decodable {
    let trial: TrialState?
}
