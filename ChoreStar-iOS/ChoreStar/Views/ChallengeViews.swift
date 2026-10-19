import SwiftUI

// MARK: - Parent dashboard card

/// Family challenges (Premium, migration 031): siblings team up for a shared
/// reward. Rows come through RLS and progress is derived on the device with
/// the web's own rules (Logic/ChallengeProgress.swift). Creating needs
/// Premium (POST /api/challenges); delivering, ending and viewing stay open
/// after a lapse. One-kid families don't see the card.
struct FamilyChallengesCard: View {
    @EnvironmentObject var manager: SupabaseManager
    @State private var list: [ChallengeProgress.WithProgress] = []
    @State private var available = true
    @State private var showingBuilder = false
    @State private var showingPaywall = false
    @State private var busyId: UUID?
    @State private var message: String?
    @State private var confirmingEnd: ChallengeProgress.WithProgress?
    @State private var celebrate = false

    private var currencyCode: String? { manager.familySettings?.currencyCode }

    var body: some View {
        if manager.children.count >= 2 {
            VStack(alignment: .leading, spacing: 14) {
                HStack {
                    Label("Family challenges", systemImage: "trophy.fill")
                        .font(.headline)
                        .foregroundColor(.choreStarTextPrimary)
                    Spacer()
                    if available {
                        Button {
                            if manager.isPremium { showingBuilder = true } else { showingPaywall = true }
                        } label: {
                            Label("New", systemImage: manager.isPremium ? "plus" : "crown.fill")
                                .font(.subheadline.weight(.bold))
                        }
                    }
                }

                if !manager.isPremium && list.isEmpty {
                    lockedSample
                } else if list.isEmpty {
                    Text("Give the kids a goal to reach together, like 50 chores this week for pizza night.")
                        .font(.subheadline)
                        .foregroundColor(.choreStarTextSecondary)
                } else {
                    ForEach(list) { item in
                        challengeRow(item)
                    }
                }

                if let message {
                    Text(message)
                        .font(.caption.weight(.semibold))
                        .foregroundColor(.red)
                }
            }
            .padding(16)
            .appCard()
            .overlay {
                if celebrate {
                    ConfettiView().allowsHitTesting(false)
                }
            }
            .task(id: manager.weekCompletions.count) { await load() }
            .sheet(isPresented: $showingBuilder) {
                ChallengeBuilderSheet { await load() }
                    .environmentObject(manager)
            }
            .sheet(isPresented: $showingPaywall) { PaywallView(source: "gate_challenges") }
            .confirmationDialog(
                confirmingEnd.map { String(localized: "End \"\($0.challenge.title)\" early? The kids will stop seeing it.") } ?? "",
                isPresented: Binding(get: { confirmingEnd != nil }, set: { if !$0 { confirmingEnd = nil } }),
                titleVisibility: .visible
            ) {
                Button("End challenge", role: .destructive) {
                    if let item = confirmingEnd { Task { await cancel(item) } }
                }
            }
        }
    }

    private func load() async {
        guard let loaded = await manager.loadFamilyChallenges() else {
            available = false
            list = []
            return
        }
        available = true
        list = loaded
        // The first time a challenge is won: a celebration, once per device.
        var fresh = false
        for item in loaded where item.phase == .won {
            let key = "challengeCelebrated:\(item.id.uuidString)"
            guard !UserDefaults.standard.bool(forKey: key) else { continue }
            UserDefaults.standard.set(true, forKey: key)
            fresh = true
        }
        if fresh {
            celebrate = true
            SoundManager.shared.play(.cheer)
            Haptics.success()
            Task {
                try? await Task.sleep(nanoseconds: 4_000_000_000)
                await MainActor.run { celebrate = false }
            }
        }
    }

    private func deliver(_ item: ChallengeProgress.WithProgress) async {
        busyId = item.id
        message = await manager.deliverChallenge(id: item.id)
        busyId = nil
        await load()
    }

    private func cancel(_ item: ChallengeProgress.WithProgress) async {
        busyId = item.id
        if !(await manager.cancelChallenge(id: item.id)) {
            message = String(localized: "Could not end the challenge")
        }
        busyId = nil
        confirmingEnd = nil
        await load()
    }

    private func name(of id: UUID) -> String {
        manager.children.first { $0.id == id }?.name ?? String(localized: "A kid")
    }

    @ViewBuilder private func challengeRow(_ item: ChallengeProgress.WithProgress) -> some View {
        let c = item.challenge
        let won = item.phase == .won || item.phase == .delivered
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .top, spacing: 10) {
                Text(c.emoji ?? "🏆").font(.title)
                VStack(alignment: .leading, spacing: 2) {
                    Text(c.title)
                        .font(.subheadline.weight(.bold))
                        .foregroundColor(.choreStarTextPrimary)
                    Text("\(ChallengeProgress.describeTarget(metric: c.metric, mode: c.mode, target: c.target, choreFilter: c.chore_filter, routineType: c.routine_type)) for \(c.reward_text)")
                        .font(.caption)
                        .foregroundColor(.choreStarTextSecondary)
                    Text(ChallengeProgress.statusLine(phase: item.phase, daysLeft: item.daysLeft))
                        .font(.caption.weight(.bold))
                        .foregroundColor(item.phase == .won ? .choreStarWarning : .choreStarTextSecondary)
                }
                Spacer()
                if item.phase != .delivered {
                    Button {
                        if item.phase == .missed { Task { await cancel(item) } } else { confirmingEnd = item }
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(.choreStarTextSecondary)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(item.phase == .missed ? String(localized: "Clear \(c.title)") : String(localized: "End \(c.title)"))
                }
            }

            ProgressView(value: Double(item.progress.current), total: Double(max(1, item.progress.goal)))
                .tint(won ? .choreStarWarning : .choreStarPrimary)
                .accessibilityLabel("\(item.progress.current) of \(item.progress.goal)")
            Text("\(item.progress.current) of \(item.progress.goal)")
                .font(.caption.weight(.semibold).monospacedDigit())
                .foregroundColor(.choreStarTextSecondary)

            VStack(alignment: .leading, spacing: 4) {
                ForEach(item.progress.kids, id: \.childId) { kid in
                    HStack {
                        Text(name(of: kid.childId)).font(.caption.weight(.semibold))
                        Spacer()
                        Text(ChallengeProgress.contributionLabel(count: kid.count, toGo: kid.toGo, done: kid.done, mode: c.mode))
                            .font(.caption)
                            .foregroundColor(kid.done && c.mode == "each" ? .choreStarSuccess : .choreStarTextSecondary)
                    }
                }
            }

            if item.phase == .won {
                Button {
                    Task { await deliver(item) }
                } label: {
                    HStack {
                        if busyId == item.id { ProgressView().tint(.white) }
                        Text(c.reward_cents > 0
                             ? String(localized: "Reward delivered (+\(MoneyLogic.format(cents: c.reward_cents, currencyCode: currencyCode)) each)")
                             : String(localized: "Reward delivered"))
                            .fontWeight(.bold)
                    }
                    .frame(maxWidth: .infinity, minHeight: 44)
                    .background(Color.choreStarFill)
                    .foregroundColor(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
                .buttonStyle(.plain)
                .disabled(busyId != nil)
            } else if item.phase == .delivered {
                Label("Reward delivered. Great teamwork!", systemImage: "checkmark.seal.fill")
                    .font(.caption.weight(.bold))
                    .foregroundColor(.choreStarSuccess)
            }
        }
        .padding(12)
        .background(item.phase == .won ? Color.choreStarWarning.opacity(0.12) : Color.choreStarBackground)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }

    /// What a free family sees: a sample with their own kids' names.
    private var lockedSample: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 10) {
                Text("🍕").font(.title)
                VStack(alignment: .leading, spacing: 2) {
                    Text("Pizza Night").font(.subheadline.weight(.bold))
                    Text("50 chores together for pizza night")
                        .font(.caption)
                        .foregroundColor(.choreStarTextSecondary)
                }
                Spacer()
                Image(systemName: "lock.fill").foregroundColor(.choreStarTextSecondary)
            }
            ProgressView(value: 0.62).tint(.choreStarPrimary)
            HStack {
                ForEach(Array(manager.children.prefix(3).enumerated()), id: \.element.id) { index, kid in
                    Text("\(kid.name): \([12, 11, 8][index])")
                        .font(.caption.weight(.semibold))
                        .foregroundColor(.choreStarTextSecondary)
                }
            }
            Text("Siblings team up for a shared reward. Part of Premium.")
                .font(.caption)
                .foregroundColor(.choreStarTextSecondary)
            Button {
                showingPaywall = true
            } label: {
                Label("See Premium", systemImage: "crown.fill")
                    .fontWeight(.bold)
                    .frame(maxWidth: .infinity, minHeight: 44)
                    .background(Color.choreStarFill)
                    .foregroundColor(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            }
            .buttonStyle(.plain)
        }
        .padding(12)
        .background(Color.choreStarBackground)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
}

// MARK: - Create a challenge

struct ChallengeBuilderSheet: View {
    @EnvironmentObject var manager: SupabaseManager
    @Environment(\.dismiss) private var dismiss
    let onSaved: () async -> Void

    @State private var title = ""
    @State private var emoji = "🏆"
    @State private var rewardText = ""
    @State private var rewardMoney = ""
    @State private var metric = "chores"
    @State private var mode = "team"
    @State private var target = 20
    @State private var bonusOnly = false
    @State private var routineType = "any"
    @State private var childIds: Set<UUID> = []
    @State private var startsOn = Date()
    @State private var endsOn = Date()
    @State private var saving = false
    @State private var error: String?
    @State private var showingPaywall = false

    private static func localYmd(_ date: Date) -> String {
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .gregorian)
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd"
        return f.string(from: date)
    }

    private static func localDate(_ ymd: String) -> Date {
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .gregorian)
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd"
        return f.date(from: ymd) ?? Date()
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Start from an idea") {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 10) {
                            ForEach(ChallengeProgress.templates) { t in
                                Button { apply(t) } label: {
                                    VStack(spacing: 4) {
                                        Text(t.emoji).font(.title2)
                                        Text(t.title).font(.caption.weight(.semibold)).lineLimit(1)
                                    }
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 8)
                                    .background(Color.choreStarPrimary.opacity(0.1))
                                    .clipShape(RoundedRectangle(cornerRadius: 12))
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                }

                Section("Challenge") {
                    TextField("Name (Pizza Night)", text: $title)
                    Picker("Emoji", selection: $emoji) {
                        ForEach(ChallengeProgress.emojis, id: \.self) { Text($0).tag($0) }
                    }
                    TextField("What they win (pizza night)", text: $rewardText)
                    HStack {
                        Text("Plus money for each kid")
                        Spacer()
                        TextField("None", text: $rewardMoney)
                            .keyboardType(.decimalPad)
                            .multilineTextAlignment(.trailing)
                            .frame(maxWidth: 100)
                    }
                }

                Section("What counts") {
                    Picker("Count", selection: $metric) {
                        Text("Chores").tag("chores")
                        Text("Routines").tag("routines")
                    }
                    .pickerStyle(.segmented)
                    if metric == "chores" {
                        Toggle("Bonus chores only", isOn: $bonusOnly)
                    } else {
                        Picker("Routine", selection: $routineType) {
                            Text("Any routine").tag("any")
                            Text("Morning").tag("morning")
                            Text("Bedtime").tag("bedtime")
                            Text("After School").tag("afterschool")
                            Text("Custom").tag("custom")
                        }
                    }
                    Picker("Goal", selection: $mode) {
                        Text("Together").tag("team")
                        Text("Each kid").tag("each")
                    }
                    .pickerStyle(.segmented)
                    Stepper(value: $target, in: 1...1000) {
                        Text(ChallengeProgress.describeTarget(metric: metric, mode: mode, target: target, choreFilter: bonusOnly ? "bonus" : "any", routineType: routineType == "any" ? nil : routineType))
                    }
                }

                Section {
                    ForEach(manager.children) { child in
                        Button {
                            if childIds.contains(child.id) { childIds.remove(child.id) } else { childIds.insert(child.id) }
                        } label: {
                            HStack {
                                Text(child.name).foregroundColor(.choreStarTextPrimary)
                                Spacer()
                                if childIds.contains(child.id) {
                                    Image(systemName: "checkmark.circle.fill").foregroundColor(.choreStarPrimary)
                                } else {
                                    Image(systemName: "circle").foregroundColor(.choreStarTextSecondary)
                                }
                            }
                        }
                    }
                } header: {
                    Text("Who's on the team")
                } footer: {
                    Text("Pick at least two kids.")
                }

                Section("When") {
                    DatePicker("Starts", selection: $startsOn, displayedComponents: .date)
                    DatePicker("Ends", selection: $endsOn, in: startsOn..., displayedComponents: .date)
                }

                if let error {
                    Section { Text(error).foregroundColor(.red) }
                }
            }
            .navigationTitle("New challenge")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Create") { Task { await save() } }
                        .disabled(saving)
                        .fontWeight(.bold)
                }
            }
            .sheet(isPresented: $showingPaywall) { PaywallView(source: "gate_challenges") }
            .onAppear(perform: setDefaults)
        }
    }

    private func setDefaults() {
        guard childIds.isEmpty else { return }
        childIds = Set(manager.children.map(\.id))
        let today = ChallengeProgress.today(in: manager.familySettings?.timezone)
        let week = ChallengeProgress.weekWindow(today)
        startsOn = Self.localDate(today)
        endsOn = Self.localDate(week.endsOn)
    }

    private func apply(_ t: ChallengeProgress.Template) {
        title = t.title
        emoji = t.emoji
        rewardText = t.rewardText
        metric = t.metric
        mode = t.mode
        target = t.target
        bonusOnly = t.choreFilter == "bonus"
        routineType = t.routineType ?? "any"
    }

    private func save() async {
        let ids = Array(childIds)
        let starts = Self.localYmd(startsOn)
        let ends = Self.localYmd(endsOn)
        if let problem = ChallengeProgress.validationError(title: title, rewardText: rewardText, target: target, childIds: ids, startsOn: starts, endsOn: ends) {
            error = problem
            return
        }
        var cents = 0
        if !rewardMoney.trimmingCharacters(in: .whitespaces).isEmpty {
            guard let parsed = MoneyLogic.cents(from: rewardMoney), parsed <= 100_000 else {
                error = String(localized: "Enter an amount, or leave it empty for none")
                return
            }
            cents = parsed
        }
        saving = true
        defer { saving = false }
        var body: [String: Any] = [
            "title": String(title.trimmingCharacters(in: .whitespaces).prefix(60)),
            "emoji": emoji,
            "rewardText": String(rewardText.trimmingCharacters(in: .whitespaces).prefix(80)),
            "rewardCents": cents,
            "metric": metric,
            "mode": mode,
            "target": target,
            "childIds": ids.map { $0.uuidString.lowercased() },
            "startsOn": starts,
            "endsOn": ends,
        ]
        if metric == "chores" { body["choreFilter"] = bonusOnly ? "bonus" : "any" }
        if metric == "routines" { body["routineType"] = routineType == "any" ? NSNull() : routineType }
        let result = await manager.createChallenge(body)
        if result.premiumRequired {
            showingPaywall = true
            return
        }
        if let message = result.error {
            error = message
            return
        }
        await onSaved()
        dismiss()
    }
}

// MARK: - Kid mode

/// The challenges this kid is part of, from GET /api/kid/challenges: the team
/// bar, every teammate's part (never ranked), and confetti the first time the
/// team gets there. Renders nothing when there are none.
struct KidChallengesCard: View {
    let child: Child
    @EnvironmentObject var manager: SupabaseManager
    @ObservedObject private var themeManager = ThemeManager.shared
    @State private var response: ChallengeProgress.KidResponse?
    @State private var celebrate = false

    var body: some View {
        Group {
            if let response, !response.challenges.isEmpty {
                VStack(alignment: .leading, spacing: 14) {
                    Text("Team challenge")
                        .font(.title2.weight(.bold))
                        .foregroundColor(.choreStarTextPrimary)
                    ForEach(response.challenges) { challenge in
                        card(challenge, currencyCode: response.currencyCode)
                    }
                }
                .padding(.horizontal, 20)
                .overlay {
                    if celebrate {
                        ConfettiView(palette: [themeManager.primaryColor, themeManager.secondaryColor, themeManager.accentColor, .choreStarAccent, .white])
                            .allowsHitTesting(false)
                    }
                }
            } else {
                // A real view, so the .task below installs (see ApprovalTrayView).
                Color.clear.frame(width: 0, height: 0)
            }
        }
        .task(id: manager.weekCompletions.count &+ manager.completedRoutineIds.count) { await load() }
    }

    private func load() async {
        guard let loaded = await manager.loadKidChallenges(childId: child.id) else { return }
        response = loaded
        var fresh = false
        for c in loaded.challenges where c.met {
            let key = "kidChallengeCelebrated:\(child.id.uuidString):\(c.id.uuidString)"
            guard !UserDefaults.standard.bool(forKey: key) else { continue }
            UserDefaults.standard.set(true, forKey: key)
            fresh = true
        }
        if fresh {
            celebrate = true
            SoundManager.shared.play(.cheer)
            Haptics.success()
            try? await Task.sleep(nanoseconds: 4_000_000_000)
            celebrate = false
        }
    }

    private func kidTarget(_ c: ChallengeProgress.KidChallenge) -> String {
        ChallengeProgress.describeTarget(metric: c.metric, mode: c.mode, target: c.target, choreFilter: c.choreFilter, routineType: c.routineType)
    }

    @ViewBuilder private func card(_ c: ChallengeProgress.KidChallenge, currencyCode: String?) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top, spacing: 12) {
                Text(c.emoji ?? "🏆").font(.system(size: 40))
                VStack(alignment: .leading, spacing: 2) {
                    Text(c.title)
                        .font(.title3.weight(.bold))
                        .foregroundColor(.choreStarTextPrimary)
                    Text("Win together: \(c.rewardText)")
                        .font(.subheadline.weight(.semibold))
                        .foregroundColor(.choreStarTextSecondary)
                    if c.rewardCents > 0 {
                        Text("+\(MoneyLogic.format(cents: c.rewardCents, currencyCode: currencyCode)) each")
                            .font(.caption.weight(.bold))
                            .foregroundColor(.choreStarSuccess)
                    }
                }
            }

            Text(kidTarget(c))
                .font(.caption.weight(.bold))
                .foregroundColor(.choreStarTextSecondary)

            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(Color.choreStarBackground)
                    Capsule()
                        .fill(c.met ? AnyShapeStyle(Color.choreStarWarningGradient) : AnyShapeStyle(themeManager.gradient))
                        .frame(width: max(geo.size.width * CGFloat(min(c.percent, 100)) / 100, c.percent > 0 ? 14 : 0))
                        .animation(.spring(response: 0.7, dampingFraction: 0.8), value: c.percent)
                }
            }
            .frame(height: 18)
            .accessibilityElement()
            .accessibilityLabel("Team progress")
            .accessibilityValue("\(c.current) of \(c.goal)")

            HStack {
                Text("\(c.current) / \(c.goal)")
                    .font(.headline.weight(.heavy).monospacedDigit())
                    .foregroundColor(.choreStarTextPrimary)
                Spacer()
                Text(statusText(c))
                    .font(.subheadline.weight(.bold))
                    .foregroundColor(c.met ? .choreStarWarning : .choreStarTextSecondary)
            }

            ForEach(c.teammates) { mate in
                HStack(spacing: 10) {
                    Circle()
                        .fill(Color.fromHex(mate.avatarColor ?? "#6366f1"))
                        .frame(width: 28, height: 28)
                        .overlay(Text(String(mate.name.prefix(1))).font(.caption.weight(.bold)).foregroundColor(.white))
                    Text(mate.isMe ? String(localized: "You") : mate.name)
                        .font(.subheadline.weight(mate.isMe ? .heavy : .semibold))
                        .foregroundColor(.choreStarTextPrimary)
                    Spacer()
                    Text(teammateText(mate, mode: c.mode))
                        .font(.caption.weight(.bold))
                        .foregroundColor(mate.done && c.mode == "each" ? .choreStarSuccess : .choreStarTextSecondary)
                }
            }

            if c.met {
                Text(c.phase == "delivered" ? String(localized: "Reward time! Great teamwork! 🌟") : String(localized: "Ask a grown-up for your reward!"))
                    .font(.subheadline.weight(.semibold))
                    .foregroundColor(.choreStarWarning)
                    .padding(12)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color.choreStarWarning.opacity(0.12))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
        .padding(18)
        .background(Color.choreStarCardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        .shadow(color: .black.opacity(0.06), radius: 10, x: 0, y: 4)
    }

    private func statusText(_ c: ChallengeProgress.KidChallenge) -> String {
        if c.met { return String(localized: "You did it together! 🎉") }
        if c.phase == "upcoming" { return String(localized: "Starts soon") }
        if c.daysLeft == 1 { return String(localized: "Last day!") }
        return String(localized: "\(c.remaining) to go!")
    }

    private func teammateText(_ mate: ChallengeProgress.KidChallenge.Teammate, mode: String) -> String {
        if mode == "each" {
            return mate.done ? String(localized: "Done! ⭐") : String(localized: "\(mate.toGo) to go")
        }
        return mate.count == 0 ? String(localized: "Ready to help") : String(localized: "Helped \(mate.count)x")
    }
}
