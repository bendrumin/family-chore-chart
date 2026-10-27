import SwiftUI
import StoreKit

/// The free limits around a subscription ending (web lib/billing/plan-limits.ts,
/// GET/POST /api/plan-limits):
///
/// - Premium is ending (renewal off): say what will pause and when, while
///   there is still time to keep it.
/// - Premium ended: what is paused, that nothing is deleted, a way back to
///   Premium, and a chooser for which kids and chores stay on.
///
/// Renders nothing for every other family, including all that never subscribed.
struct PlanLimitsCard: View {
    @EnvironmentObject var manager: SupabaseManager
    @State private var state: PlanLimitsState?
    @State private var choosing = false
    @State private var showingPaywall = false

    var body: some View {
        VStack(spacing: 0) {
            if let state, let content = content(state) {
                card(content, state: state)
            } else {
                // A real view, so the .task below installs (see ApprovalTrayView).
                Color.clear.frame(width: 0, height: 0)
            }
        }
        .task(id: manager.isPremium) { await load() }
        .sheet(isPresented: $choosing) {
            if let state {
                ChooseActiveSheet(state: state) { next in
                    self.state = next
                    manager.refreshData()
                }
            }
        }
        .sheet(isPresented: $showingPaywall) { PaywallView() }
    }

    private struct Content {
        let title: String
        let body: String
        let ending: Bool
    }

    private func content(_ s: PlanLimitsState) -> Content? {
        if s.premium, let _ = s.ending {
            let will = Self.summary(kids: s.wouldPause.kids, chores: s.wouldPause.chores)
            guard !will.isEmpty else { return nil }
            let title: String
            if let endsAt = s.ending?.endsAt.flatMap(Self.parseDate) {
                title = String(localized: "Premium ends \(endsAt.formatted(.dateTime.month(.wide).day()))")
            } else {
                title = String(localized: "Premium is set to end")
            }
            return Content(
                title: title,
                body: String(localized: "After that, \(will) pause, since the free plan has \(s.limits.kids) kids and \(s.limits.chores) chores. Turn renewal back on to keep them."),
                ending: true
            )
        }
        if !s.premium, !s.pausedKids.isEmpty || s.pausedChores > 0 {
            let paused = Self.summary(kids: s.pausedKids.map(\.name), chores: s.pausedChores)
            return Content(
                title: String(localized: "\(paused) paused"),
                body: String(localized: "Premium ended, and the free plan has \(s.limits.kids) kids and \(s.limits.chores) chores. Nothing is deleted: resume Premium and everything comes back, or choose what stays on."),
                ending: false
            )
        }
        return nil
    }

    private func card(_ c: Content, state: PlanLimitsState) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .top, spacing: 12) {
                Image(systemName: "pause.circle.fill")
                    .font(.system(size: 20, weight: .semibold))
                    .foregroundColor(.orange)
                    .accessibilityHidden(true)
                VStack(alignment: .leading, spacing: 4) {
                    Text(c.title)
                        .font(.display(17, weight: .bold))
                        .foregroundColor(.choreStarTextPrimary)
                    Text(c.body)
                        .font(.subheadline)
                        .foregroundColor(.choreStarTextSecondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            if !manager.isSharedMember {
                HStack(spacing: 16) {
                    if c.ending {
                        Button {
                            Task { await openManageSubscriptions() }
                        } label: {
                            fill(String(localized: "Manage subscription"))
                        }
                    } else {
                        Button { showingPaywall = true } label: { fill(String(localized: "Resume Premium")) }
                        Button(String(localized: "Choose what stays on")) { choosing = true }
                            .font(.caption)
                            .fontWeight(.semibold)
                            .foregroundColor(.choreStarTextSecondary)
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(20)
        .background(Color.choreStarCardBackground)
        .cornerRadius(16)
        .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(Color.orange.opacity(0.4), lineWidth: 1))
    }

    private func fill(_ title: String) -> some View {
        Text(title)
            .font(.subheadline)
            .fontWeight(.bold)
            .foregroundColor(.white)
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(Color.choreStarFill)
            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
    }

    @MainActor
    private func openManageSubscriptions() async {
        guard let scene = UIApplication.shared.connectedScenes.first(where: { $0.activationState == .foregroundActive }) as? UIWindowScene else { return }
        try? await AppStore.showManageSubscriptions(in: scene)
    }

    private func load() async {
        guard !manager.isChildSession,
              let (data, status) = await manager.parentAPI("/api/plan-limits"), status == 200,
              let decoded = try? JSONDecoder().decode(PlanLimitsState.self, from: data) else { return }
        state = decoded
    }

    /// "Leo and 25 chores" / "Leo, Mia and 3 chores"
    static func summary(kids: [String], chores: Int) -> String {
        var parts: [String] = []
        if !kids.isEmpty { parts.append(kids.formatted(.list(type: .and))) }
        if chores > 0 { parts.append(String(localized: "\(chores) chores")) }
        return parts.formatted(.list(type: .and))
    }

    static func parseDate(_ iso: String) -> Date? {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f.date(from: iso) ?? ISO8601DateFormatter().date(from: iso)
    }
}

struct PlanLimitsState: Decodable {
    struct Limits: Decodable { let kids: Int; let chores: Int }
    struct Ending: Decodable { let endsAt: String? }
    struct NamedId: Decodable, Identifiable { let id: String; let name: String }
    struct ChoreRow: Decodable, Identifiable { let id: String; let name: String; let on: Bool }
    struct KidRow: Decodable, Identifiable { let id: String; let name: String; let paused: Bool; let chores: [ChoreRow] }
    struct WouldPause: Decodable { let kids: [String]; let chores: Int }

    var premium: Bool = false
    var ending: Ending?
    let limits: Limits
    let pausedKids: [NamedId]
    let pausedChores: Int
    let kids: [KidRow]
    let wouldPause: WouldPause

    enum CodingKeys: String, CodingKey { case premium, ending, limits, pausedKids, pausedChores, kids, wouldPause }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        // The POST answer has no plan fields: it's always a free family.
        premium = try c.decodeIfPresent(Bool.self, forKey: .premium) ?? false
        ending = try c.decodeIfPresent(Ending.self, forKey: .ending)
        limits = try c.decode(Limits.self, forKey: .limits)
        pausedKids = try c.decode([NamedId].self, forKey: .pausedKids)
        pausedChores = try c.decode(Int.self, forKey: .pausedChores)
        kids = try c.decode([KidRow].self, forKey: .kids)
        wouldPause = try c.decode(WouldPause.self, forKey: .wouldPause)
    }
}

/// Pick up to the free limits of kids and chores to keep on; the rest pause.
private struct ChooseActiveSheet: View {
    let state: PlanLimitsState
    let onSaved: (PlanLimitsState) -> Void
    @EnvironmentObject var manager: SupabaseManager
    @Environment(\.dismiss) private var dismiss
    @State private var kids: Set<String> = []
    @State private var chores: Set<String> = []
    @State private var saving = false
    @State private var error: String?

    private var keptKids: [PlanLimitsState.KidRow] { state.kids.filter { kids.contains($0.id) } }
    private var choreCount: Int { keptKids.flatMap(\.chores).filter { chores.contains($0.id) }.count }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    ForEach(state.kids) { kid in
                        Toggle(kid.name, isOn: Binding(
                            get: { kids.contains(kid.id) },
                            set: { on in
                                if on { if kids.count < state.limits.kids { kids.insert(kid.id) } } else { kids.remove(kid.id) }
                            }
                        ))
                        .disabled(!kids.contains(kid.id) && kids.count >= state.limits.kids)
                    }
                } header: {
                    Text("Kids (\(kids.count)/\(state.limits.kids))")
                }

                ForEach(keptKids) { kid in
                    Section {
                        ForEach(kid.chores) { chore in
                            Toggle(chore.name, isOn: Binding(
                                get: { chores.contains(chore.id) },
                                set: { on in if on { chores.insert(chore.id) } else { chores.remove(chore.id) } }
                            ))
                            .disabled(!chores.contains(chore.id) && choreCount >= state.limits.chores)
                        }
                    } header: {
                        Text(kid.name)
                    }
                }

                Section {
                    Text("Chores on: \(choreCount)/\(state.limits.chores). Everything else is paused, not deleted, and comes back with Premium.")
                        .font(.caption)
                        .foregroundColor(.choreStarTextSecondary)
                    if let error {
                        Text(error).font(.caption).foregroundColor(.red)
                    }
                }
            }
            .navigationTitle("Choose what stays on")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button(saving ? String(localized: "Saving…") : String(localized: "Save")) { Task { await save() } }
                        .disabled(saving)
                }
            }
            .onAppear {
                kids = Set(state.kids.filter { !$0.paused }.map(\.id))
                chores = Set(state.kids.flatMap(\.chores).filter(\.on).map(\.id))
            }
        }
    }

    private func save() async {
        saving = true
        defer { saving = false }
        let keepChores = keptKids.flatMap(\.chores).filter { chores.contains($0.id) }.map(\.id)
        guard let (data, status) = await manager.parentAPI("/api/plan-limits", method: "POST", json: ["kids": Array(kids), "chores": keepChores]) else {
            error = String(localized: "Couldn't save. Check your connection.")
            return
        }
        guard status == 200, let next = try? JSONDecoder().decode(PlanLimitsState.self, from: data) else {
            error = manager.apiMessage(data, fallback: String(localized: "Couldn't save. Try again."))
            return
        }
        onSaved(next)
        dismiss()
    }
}
