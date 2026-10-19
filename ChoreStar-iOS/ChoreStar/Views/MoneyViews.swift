import SwiftUI

// MARK: - Parent: Settings > Family > Money

/// Kid money management (Premium, migration 030): each kid's jars, weekly
/// allowance, interest, fines and paybacks, and screen-time minutes. Reads and
/// writes through /api/money; balances are derived on the server. A free
/// family sees a preview, each tool opening the paywall with its own source.
struct MoneySettingsView: View {
    @EnvironmentObject var manager: SupabaseManager
    /// Open on this kid (from the kid's page).
    var initialChildId: UUID? = nil

    @State private var response: MoneyLogic.Response?
    @State private var failed = false
    @State private var selected: String?

    var body: some View {
        Form {
            if failed {
                Section {
                    Text("Could not load money settings. Try again in a moment.")
                        .foregroundColor(.choreStarTextSecondary)
                }
            } else if let response {
                if !response.premium {
                    MoneyPreviewSections(currencyCode: response.currencyCode)
                } else if response.ready == false {
                    Section {
                        Text("Money tools are being set up. Check back soon.")
                            .foregroundColor(.choreStarTextSecondary)
                    }
                } else if response.kids.isEmpty {
                    Section { Text("Add a child first.") }
                } else {
                    if response.kids.count > 1 {
                        Section {
                            Picker("Child", selection: $selected) {
                                ForEach(response.kids) { kid in
                                    Text(kid.name).tag(kid.childId as String?)
                                }
                            }
                            .pickerStyle(.segmented)
                        }
                    }
                    if let index = response.kids.firstIndex(where: { $0.childId == selected }),
                       response.kids[index].isDetailed {
                        KidMoneyPanel(
                            kid: Binding(
                                get: { self.response?.kids[index] ?? response.kids[index] },
                                set: { replaceKid($0) }
                            ),
                            currencyCode: response.currencyCode
                        )
                        .id(response.kids[index].childId)
                    }
                }
            } else {
                Section {
                    HStack { Spacer(); ProgressView(); Spacer() }
                }
            }
        }
        .navigationTitle("Money")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
        .refreshable { await load() }
    }

    private func load() async {
        guard let loaded = await manager.loadMoney() else {
            if response == nil { failed = true }
            return
        }
        failed = false
        response = loaded
        if selected == nil || !loaded.kids.contains(where: { $0.childId == selected }) {
            let preferred = initialChildId?.uuidString.lowercased()
            selected = loaded.kids.first(where: { $0.childId.lowercased() == preferred })?.childId ?? loaded.kids.first?.childId
        }
    }

    private func replaceKid(_ kid: MoneyLogic.Kid) {
        guard let current = response else { return }
        response = MoneyLogic.Response(
            premium: current.premium,
            currencyCode: current.currencyCode,
            timezone: current.timezone,
            ready: current.ready,
            kids: current.kids.map { $0.childId == kid.childId ? kid : $0 }
        )
    }
}

/// What a free family sees: a sample kid's jars and the five tools, each a way into the paywall.
private struct MoneyPreviewSections: View {
    let currencyCode: String?
    private func money(_ cents: Int) -> String { MoneyLogic.format(cents: cents, currencyCode: currencyCode) }

    var body: some View {
        Section {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Text("Example: Maya, 9")
                        .font(.caption.weight(.bold))
                        .foregroundColor(.choreStarTextSecondary)
                    Spacer()
                    Image(systemName: "lock.fill")
                        .foregroundColor(.choreStarTextSecondary)
                        .accessibilityHidden(true)
                }
                HStack(spacing: 8) {
                    JarTile(label: String(localized: "Spend"), amount: money(1240), pct: nil, tint: .green)
                    JarTile(label: String(localized: "Save"), amount: money(860), pct: nil, tint: .blue)
                    JarTile(label: String(localized: "Give"), amount: money(310), pct: nil, tint: .pink)
                }
                VStack(alignment: .leading, spacing: 4) {
                    Text("+\(money(500)) weekly allowance, Saturday (92% of chores done)")
                    Text("+\(money(17)) interest on Save")
                    Text("-\(money(200)) phone bill")
                    Text("+45 min screen time this week")
                }
                .font(.caption)
                .foregroundColor(.choreStarTextSecondary)
            }
            .padding(.vertical, 4)
            .accessibilityElement(children: .combine)
        } header: {
            Label("Premium", systemImage: "crown.fill")
        } footer: {
            Text("Spend, Save and Give jars, a weekly allowance, interest on savings, fines and paybacks, and screen-time minutes. Each kid gets their own settings.")
        }

        Section {
            PremiumUpsellCard(title: "Spend, Save, Give jars", message: "Every cent earned splits 70/20/10, or whatever you pick.", source: MoneyLogic.Feature.jars.paywallSource, icon: "building.columns.fill")
            PremiumUpsellCard(title: "Weekly allowance", message: "Paid on your day, optionally only at 80% of chores.", source: MoneyLogic.Feature.allowance.paywallSource, icon: "calendar.badge.clock")
            PremiumUpsellCard(title: "Interest on Save", message: "A small weekly % so saving visibly pays.", source: MoneyLogic.Feature.interest.paywallSource, icon: "percent")
            PremiumUpsellCard(title: "Fines and paybacks", message: "\"Phone bill, $2 a week.\" Never below zero unless you say so.", source: MoneyLogic.Feature.fines.paywallSource, icon: "doc.text.fill")
            PremiumUpsellCard(title: "Screen-time minutes", message: "Chores earn minutes too. You mark them used.", source: MoneyLogic.Feature.minutes.paywallSource, icon: "timer")
        }
    }
}

/// One jar's amount, tinted. Used by the parent panel and the preview.
struct JarTile: View {
    let label: String
    let amount: String
    let pct: Int?
    let tint: Color
    var negative = false

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            HStack {
                Text(label).font(.caption.weight(.bold))
                Spacer(minLength: 2)
                if let pct { Text("\(pct)%").font(.caption2.weight(.bold)).opacity(0.7) }
            }
            Text(amount)
                .font(.headline.weight(.heavy))
                .monospacedDigit()
                .foregroundColor(negative ? .red : .choreStarTextPrimary)
                .lineLimit(1)
                .minimumScaleFactor(0.6)
        }
        .foregroundColor(tint)
        .padding(.horizontal, 10)
        .padding(.vertical, 8)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(tint.opacity(0.14))
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}

// MARK: - One kid's money

/// Every change posts one action to /api/money and gets the kid's fresh
/// state back. A 403 premium_required (the plan lapsed since the screen
/// loaded) opens the paywall with that feature's source.
struct KidMoneyPanel: View {
    @EnvironmentObject var manager: SupabaseManager
    @Binding var kid: MoneyLogic.Kid
    let currencyCode: String?

    @State private var busy = false
    @State private var notice: String?
    @State private var paywallSource: String?

    // Jars
    @State private var editingSplit = false
    @State private var split = MoneyLogic.defaultSplit
    @State private var confirmJarsOff = false
    @State private var donationAmount = ""
    @State private var donationTo = ""
    @State private var showingDonation = false
    // Schedule
    @State private var payday = 6
    @State private var allowanceText = ""
    @State private var useThreshold = false
    @State private var thresholdText = "80"
    @State private var interestText = ""
    // Fines
    @State private var fineAmount = ""
    @State private var fineReason = ""
    @State private var fineAllowNegative = false
    @State private var repayTitle = ""
    @State private var repayAmount = ""
    @State private var repayAllowNegative = false
    // Minutes
    @State private var customMinutes = ""

    private func money(_ cents: Int) -> String { MoneyLogic.format(cents: cents, currencyCode: currencyCode) }
    private var jars: MoneyLogic.Jars? { kid.balance?.jars }
    private var jarsOn: Bool { jars?.enabled ?? false }
    private var balance: Int { kid.balance?.balanceCents ?? 0 }

    var body: some View {
        Group {
            balanceSection
            jarsSection
            scheduleSection
            finesSection
            minutesSection
            activitySection
        }
        .onAppear(perform: syncFromKid)
        .alert(isPresented: Binding(get: { notice != nil }, set: { if !$0 { notice = nil } })) {
            Alert(title: Text(notice ?? ""))
        }
        .sheet(isPresented: Binding(get: { paywallSource != nil }, set: { if !$0 { paywallSource = nil } })) {
            PaywallView(source: paywallSource ?? MoneyLogic.Feature.jars.paywallSource)
        }
        .confirmationDialog(
            String(localized: "Turn off \(kid.name)'s jars? Save and Give go back into one balance."),
            isPresented: $confirmJarsOff,
            titleVisibility: .visible
        ) {
            Button("Turn off jars", role: .destructive) {
                Task { await post("jars", ["enabled": false, "spend": 100, "save": 0, "give": 0], .jars, success: String(localized: "Jars off. Everything is one balance again.")) }
            }
        }
        .disabled(busy)
    }

    private func syncFromKid() {
        if let saved = kid.split, saved.enabled {
            split = MoneyLogic.JarSplit(spend: saved.spend, save: saved.save, give: saved.give)
        }
        if let s = kid.schedule {
            payday = s.paydayWeekday
            allowanceText = MoneyLogic.plainAmount(cents: s.allowanceCents)
            useThreshold = s.thresholdPct != nil
            thresholdText = String(s.thresholdPct ?? 80)
            interestText = s.interestBps > 0 ? MoneyLogic.formatRate(bps: s.interestBps).replacingOccurrences(of: "%", with: "") : ""
        }
    }

    @discardableResult
    private func post(_ action: String, _ payload: [String: Any], _ feature: MoneyLogic.Feature, success: String? = nil) async -> Bool {
        busy = true
        defer { busy = false }
        switch await manager.postMoney(action: action, childId: kid.childId, payload: payload, feature: feature) {
        case .success(let fresh):
            kid = fresh
            syncFromKid()
            if let success { notice = success }
            return true
        case .failure(let failure):
            switch failure.error {
            case .premiumRequired(let f): paywallSource = f.paywallSource
            case .notEnoughCents(let available):
                notice = String(localized: "Only \(money(available)) available. Lower the amount, or allow going below zero.")
            case .notEnoughMinutes(let available):
                notice = String(localized: "\(kid.name) only has \(MoneyLogic.formatMinutes(available)) banked.")
            case .message(let message): notice = message
            }
            return false
        }
    }

    // MARK: Balance

    private var balanceSection: some View {
        Section {
            if let jars, jars.enabled {
                HStack(spacing: 8) {
                    JarTile(label: String(localized: "Spend"), amount: money(jars.spendCents), pct: jars.split.spend, tint: .green, negative: jars.spendCents < 0)
                    JarTile(label: String(localized: "Save"), amount: money(jars.saveCents), pct: jars.split.save, tint: .blue)
                    JarTile(label: String(localized: "Give"), amount: money(jars.giveCents), pct: jars.split.give, tint: .pink)
                }
            } else {
                HStack {
                    Text("\(kid.name)'s balance")
                        .foregroundColor(.choreStarTextSecondary)
                    Spacer()
                    Text(money(balance))
                        .font(.title3.weight(.heavy))
                        .monospacedDigit()
                        .foregroundColor(balance < 0 ? .red : .choreStarTextPrimary)
                }
            }
            if balance < 0 {
                Text("\(kid.name) owes you \(money(-balance)). It gets paid back as \(kid.name) earns.")
                    .font(.subheadline.weight(.semibold))
                    .foregroundColor(.red)
            }
            if let m = kid.minutes, m.available, m.earned > 0 || m.balance != 0 {
                HStack {
                    Text("Screen time banked")
                    Spacer()
                    Text(MoneyLogic.formatMinutes(m.balance)).bold().monospacedDigit()
                }
            }
        }
    }

    // MARK: Jars

    private var jarsSection: some View {
        Section {
            if !jarsOn || editingSplit {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(MoneyLogic.splitPresets, id: \.self) { preset in
                            Button(preset.label) { split = preset }
                                .font(.caption.weight(.bold).monospacedDigit())
                                .padding(.horizontal, 12)
                                .padding(.vertical, 8)
                                .background(Capsule().fill(split == preset ? Color.choreStarFill : Color.choreStarTextSecondary.opacity(0.12)))
                                .foregroundColor(split == preset ? .white : .choreStarTextPrimary)
                                .buttonStyle(.plain)
                        }
                    }
                }
                Stepper(value: $split.spend, in: 0...100, step: 5) { Text("Spend: \(split.spend)%") }
                Stepper(value: $split.save, in: 0...100, step: 5) { Text("Save: \(split.save)%") }
                Stepper(value: $split.give, in: 0...100, step: 5) { Text("Give: \(split.give)%") }
                Text(split.isValid ? String(localized: "Total \(split.total)%") : String(localized: "Total \(split.total)% (needs 100%)"))
                    .font(.subheadline.weight(.semibold).monospacedDigit())
                    .foregroundColor(split.isValid ? .choreStarSuccess : .red)
                Button(jarsOn ? String(localized: "Save split") : String(localized: "Turn on jars")) {
                    Task {
                        let ok = await post(
                            "jars",
                            ["enabled": true, "spend": split.spend, "save": split.save, "give": split.give],
                            .jars,
                            success: jarsOn
                                ? String(localized: "Split updated. New earnings use it from today.")
                                : String(localized: "Jars are on for \(kid.name). New earnings split from today.")
                        )
                        if ok { editingSplit = false }
                    }
                }
                .disabled(!split.isValid)
                .fontWeight(.bold)
                if editingSplit {
                    Button("Cancel", role: .cancel) { editingSplit = false; syncFromKid() }
                }
            } else {
                Button("Change split") { editingSplit = true }
                Button {
                    showingDonation.toggle()
                } label: {
                    Label("Record a donation", systemImage: "heart.fill")
                }
                .disabled((jars?.giveCents ?? 0) <= 0)
                if showingDonation {
                    TextField("Amount", text: $donationAmount)
                        .keyboardType(.decimalPad)
                    TextField("Where it went (the animal shelter)", text: $donationTo)
                    Text("Up to \(money(max(0, jars?.giveCents ?? 0))) in the Give jar.")
                        .font(.caption)
                        .foregroundColor(.choreStarTextSecondary)
                    Button("Save donation") { Task { await donate() } }
                        .fontWeight(.bold)
                }
                Button("Turn off jars", role: .destructive) { confirmJarsOff = true }
            }
        } header: {
            Label("Spend, Save, Give", systemImage: "building.columns.fill")
        } footer: {
            Text(jarsOn
                 ? "New earnings and allowance split into three jars as they come in. The store and payouts use Spend, goals fill from Save, and Give is for giving away."
                 : "Split what your kid earns from today into three jars. Money earned before today stays in Spend.")
        }
    }

    private func donate() async {
        let to = donationTo.trimmingCharacters(in: .whitespaces)
        guard let cents = MoneyLogic.cents(from: donationAmount), cents > 0, !to.isEmpty else {
            notice = String(localized: "Enter an amount and where it went")
            return
        }
        let ok = await post("donation", ["amountCents": cents, "note": String(String(localized: "Gave \(money(cents)) to \(to)").prefix(100))], .jars, success: String(localized: "Donation recorded"))
        if ok {
            showingDonation = false
            donationAmount = ""
            donationTo = ""
        }
    }

    // MARK: Schedule

    private var scheduleSection: some View {
        Section {
            Picker("Payday", selection: $payday) {
                ForEach(0..<7, id: \.self) { day in
                    Text(Calendar.current.standaloneWeekdaySymbols[day]).tag(day)
                }
            }
            HStack {
                Text("Weekly allowance")
                Spacer()
                TextField("None", text: $allowanceText)
                    .keyboardType(.decimalPad)
                    .multilineTextAlignment(.trailing)
                    .frame(maxWidth: 110)
            }
            Toggle("Only pay at a chore threshold", isOn: $useThreshold)
            if useThreshold {
                HStack {
                    Text("At least")
                    TextField("80", text: $thresholdText)
                        .keyboardType(.numberPad)
                        .multilineTextAlignment(.trailing)
                        .frame(maxWidth: 60)
                    Text("% of chores in the week before payday")
                        .font(.caption)
                        .foregroundColor(.choreStarTextSecondary)
                }
            }
            HStack {
                Text("Interest on Save, % a week")
                Spacer()
                TextField("0", text: $interestText)
                    .keyboardType(.decimalPad)
                    .multilineTextAlignment(.trailing)
                    .frame(maxWidth: 70)
                    .disabled(!jarsOn)
            }
            Button("Save payday") { Task { await saveSchedule() } }
                .fontWeight(.bold)
        } header: {
            Label("Weekly allowance and interest", systemImage: "calendar.badge.clock")
        } footer: {
            VStack(alignment: .leading, spacing: 4) {
                if let next = kid.schedule?.nextPayday {
                    Text("Paid automatically on payday in your family's time zone. Next payday: \(MoneyLogic.displayDate(next)).")
                }
                Text(jarsOn
                     ? String(localized: "You pay interest on payday, on what's in Save. Up to \(MoneyLogic.formatRate(bps: MoneyLogic.interestMaxBps)) and \(money(MoneyLogic.interestMaxCentsPerWeek)) a week.")
                     : String(localized: "Turn on the jars to pay interest on the Save jar."))
            }
        }
    }

    private func saveSchedule() async {
        let allowance: Int
        if allowanceText.trimmingCharacters(in: .whitespaces).isEmpty {
            allowance = 0
        } else if let cents = MoneyLogic.cents(from: allowanceText), cents <= 100_000 {
            allowance = cents
        } else {
            notice = String(localized: "Enter a weekly amount, or leave it empty for none")
            return
        }
        let pct = Int(thresholdText) ?? 0
        if useThreshold && !(1...100).contains(pct) {
            notice = String(localized: "The chore threshold is a whole percent from 1 to 100")
            return
        }
        guard let bps = MoneyLogic.interestBps(from: interestText) else {
            notice = String(localized: "Interest is between 0% and \(MoneyLogic.formatRate(bps: MoneyLogic.interestMaxBps)) a week")
            return
        }
        let feature: MoneyLogic.Feature = bps > 0 && allowance == 0 ? .interest : .allowance
        await post(
            "schedule",
            [
                "paydayWeekday": payday,
                "allowanceCents": allowance,
                "thresholdPct": useThreshold ? pct as Any : NSNull(),
                "interestBps": jarsOn ? bps : 0,
            ],
            feature,
            success: String(localized: "Payday saved")
        )
    }

    // MARK: Fines

    private var finesSection: some View {
        Section {
            Text("One-off").font(.subheadline.weight(.bold))
            TextField("Amount", text: $fineAmount).keyboardType(.decimalPad)
            TextField("Reason (left the bike out in the rain)", text: $fineReason)
            Toggle("Allow going below zero (\(kid.name) owes you the rest)", isOn: $fineAllowNegative)
            Button("Take it off") { Task { await takeFine() } }
                .fontWeight(.bold)

            Text("Pay a parent back, weekly").font(.subheadline.weight(.bold))
            ForEach(kid.repayments ?? []) { r in
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(r.title)
                        Text("\(money(r.amountCents)) a week")
                            .font(.caption)
                            .foregroundColor(.choreStarTextSecondary)
                    }
                    Spacer()
                    Button("Stop") {
                        Task { await post("repayment-stop", ["repaymentId": r.id], .fines, success: String(localized: "Stopped \(r.title)")) }
                    }
                    .buttonStyle(.borderless)
                }
            }
            TextField("What it's for (phone bill)", text: $repayTitle)
            TextField("Weekly amount", text: $repayAmount).keyboardType(.decimalPad)
            Toggle("Take the full amount even if Spend can't cover it", isOn: $repayAllowNegative)
            Button("Add weekly payback") { Task { await addRepayment() } }
                .fontWeight(.bold)
        } header: {
            Label("Fines and paybacks", systemImage: "doc.text.fill")
        } footer: {
            Text("Comes out of \(jarsOn ? String(localized: "Spend") : String(localized: "the balance")) (\(money(max(0, jarsOn ? (jars?.spendCents ?? 0) : balance))) now). Never below zero unless you allow it. \(kid.name) sees every one with its reason.")
        }
    }

    private func takeFine() async {
        let reason = fineReason.trimmingCharacters(in: .whitespaces)
        guard let cents = MoneyLogic.cents(from: fineAmount), cents > 0, !reason.isEmpty else {
            notice = String(localized: "Enter an amount and a reason")
            return
        }
        let ok = await post("fine", ["amountCents": cents, "reason": String(reason.prefix(100)), "allowNegative": fineAllowNegative], .fines,
                            success: String(localized: "Took \(money(cents)) off. \(kid.name) will see why."))
        if ok { fineAmount = ""; fineReason = ""; fineAllowNegative = false }
    }

    private func addRepayment() async {
        let title = repayTitle.trimmingCharacters(in: .whitespaces)
        guard let cents = MoneyLogic.cents(from: repayAmount), cents > 0, !title.isEmpty else {
            notice = String(localized: "Name it and give it a weekly amount")
            return
        }
        let ok = await post("repayment", ["title": String(title.prefix(60)), "amountCents": cents, "allowNegative": repayAllowNegative], .fines,
                            success: String(localized: "Weekly payback added. It comes out on payday."))
        if ok { repayTitle = ""; repayAmount = ""; repayAllowNegative = false }
    }

    // MARK: Minutes

    @ViewBuilder private var minutesSection: some View {
        if let m = kid.minutes, m.available {
            Section {
                HStack {
                    Text("Banked")
                    Spacer()
                    Text(MoneyLogic.formatMinutes(m.balance)).bold().monospacedDigit()
                }
                HStack(spacing: 8) {
                    Text("Used:")
                    ForEach(MoneyLogic.minutesUsePresets, id: \.self) { n in
                        Button("\(n) min") { Task { await useMinutes(n) } }
                            .buttonStyle(.bordered)
                            .disabled(m.balance < n)
                    }
                }
                HStack {
                    TextField("Minutes used", text: $customMinutes)
                        .keyboardType(.numberPad)
                    Button("Mark used") { Task { await useMinutes(Int(customMinutes) ?? 0) } }
                        .disabled(Int(customMinutes) ?? 0 <= 0)
                }
                if !m.chores.isEmpty || !m.routines.isEmpty {
                    DisclosureGroup("Minutes per chore and routine") {
                        ForEach(m.chores) { item in
                            MinutesRewardRow(name: item.name, isRoutine: false, minutes: item.minutes) { value in
                                Task { await post("minutes-reward", ["target": "chore", "id": item.id, "minutes": value], .minutes) }
                            }
                        }
                        ForEach(m.routines) { item in
                            MinutesRewardRow(name: item.name, isRoutine: true, minutes: item.minutes) { value in
                                Task { await post("minutes-reward", ["target": "routine", "id": item.id, "minutes": value], .minutes) }
                            }
                        }
                    }
                }
            } header: {
                Label("Screen-time minutes", systemImage: "timer")
            } footer: {
                Text("A second reward next to money. Chores and routines with minutes add to \(kid.name)'s bank when they're done; you mark minutes used. ChoreStar doesn't lock any device.")
            }
        }
    }

    private func useMinutes(_ minutes: Int) async {
        guard minutes > 0, minutes <= MoneyLogic.minutesMaxPerReward else { return }
        let ok = await post("minutes-use", ["minutes": minutes], .minutes, success: String(localized: "Marked \(MoneyLogic.formatMinutes(minutes)) used"))
        if ok { customMinutes = "" }
    }

    // MARK: Activity

    @ViewBuilder private var activitySection: some View {
        if let ledger = kid.ledger, !ledger.isEmpty {
            Section {
                ForEach(ledger) { row in
                    HStack(alignment: .top) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(row.note?.isEmpty == false ? row.note! : MoneyLogic.newsTitle(kind: row.kind, amountCents: row.amountCents))
                                .font(.subheadline.weight(.semibold))
                            Text(MoneyLogic.displayDate(row.effectiveOn))
                                .font(.caption)
                                .foregroundColor(.choreStarTextSecondary)
                        }
                        Spacer()
                        Text(MoneyLogic.formatSigned(cents: row.amountCents, currencyCode: currencyCode))
                            .font(.subheadline.weight(.bold).monospacedDigit())
                            .foregroundColor(row.amountCents < 0 ? .red : row.amountCents > 0 ? .choreStarSuccess : .choreStarTextSecondary)
                    }
                }
            } header: {
                Label("Recent money activity", systemImage: "clock.arrow.circlepath")
            }
        }
    }
}

/// A chore's or routine's screen-time reward, saved when the field is submitted.
private struct MinutesRewardRow: View {
    let name: String
    let isRoutine: Bool
    let minutes: Int
    let onSave: (Int) -> Void
    @State private var text = ""

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 1) {
                Text(name).lineLimit(1)
                if isRoutine {
                    Text("Routine").font(.caption2).foregroundColor(.choreStarTextSecondary)
                }
            }
            Spacer()
            TextField("0", text: $text)
                .keyboardType(.numberPad)
                .multilineTextAlignment(.trailing)
                .frame(maxWidth: 56)
                .onSubmit(save)
            Text("min").font(.caption).foregroundColor(.choreStarTextSecondary)
            Button("Save", action: save)
                .buttonStyle(.borderless)
                .disabled((Int(text) ?? 0) == minutes)
        }
        .onAppear { text = minutes > 0 ? String(minutes) : "" }
    }

    private func save() {
        let value = min(MoneyLogic.minutesMaxPerReward, max(0, Int(text) ?? 0))
        guard value != minutes else { return }
        onSave(value)
    }
}

// MARK: - Kid mode: My money

/// The kid's money at a glance (Premium): three jars when the parent turned
/// them on, what they owe if a fine went below zero, banked screen-time
/// minutes, and the latest money news with the parent's reason for every
/// deduction. Renders nothing for a free family (the server sends none of
/// it), so a kid never meets a paywall.
struct KidMoneyCard: View {
    let child: Child
    @EnvironmentObject var manager: SupabaseManager

    private var wallet: SupabaseManager.KidWallet? { manager.wallets[child.id] }
    private func money(_ cents: Int) -> String { MoneyLogic.format(cents: abs(cents), currencyCode: wallet?.currencyCode) }

    var body: some View {
        if let wallet {
            let jars = wallet.jars?.enabled == true ? wallet.jars : nil
            let owes = max(0, -(wallet.balanceCents ?? 0))
            let minutes = wallet.minutes.flatMap { $0.earned > 0 || $0.balance != 0 ? $0 : nil }
            let news = Array((wallet.moneyNews ?? []).prefix(4))
            if jars != nil || owes > 0 || minutes != nil || !news.isEmpty {
                VStack(alignment: .leading, spacing: 14) {
                    Text("My money")
                        .font(.title2.weight(.bold))
                        .foregroundColor(.choreStarTextPrimary)

                    if let jars {
                        let fullest = max(jars.spendCents, jars.saveCents, jars.giveCents, 1)
                        HStack(spacing: 10) {
                            KidJar(icon: "bag.fill", label: String(localized: "Spend"), hint: String(localized: "For the store"), cents: jars.spendCents, amount: money(jars.spendCents), tint: .green, level: MoneyLogic.jarLevel(cents: jars.spendCents, fullest: fullest))
                            KidJar(icon: "building.columns.fill", label: String(localized: "Save"), hint: String(localized: "For your goals"), cents: jars.saveCents, amount: money(jars.saveCents), tint: .blue, level: MoneyLogic.jarLevel(cents: jars.saveCents, fullest: fullest))
                            KidJar(icon: "heart.fill", label: String(localized: "Give"), hint: String(localized: "To help others"), cents: jars.giveCents, amount: money(jars.giveCents), tint: .pink, level: MoneyLogic.jarLevel(cents: jars.giveCents, fullest: fullest))
                        }
                    }

                    if owes > 0 {
                        HStack(alignment: .top, spacing: 10) {
                            Image(systemName: "exclamationmark.circle.fill")
                                .font(.title2)
                                .foregroundColor(.red)
                            VStack(alignment: .leading, spacing: 2) {
                                Text("You owe \(money(owes))")
                                    .font(.headline.weight(.heavy))
                                    .foregroundColor(.red)
                                Text("It gets paid back from what you earn next.")
                                    .font(.subheadline.weight(.semibold))
                                    .foregroundColor(.red.opacity(0.85))
                            }
                        }
                        .padding(12)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color.red.opacity(0.1))
                        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                        .accessibilityElement(children: .combine)
                    }

                    if let minutes {
                        HStack(spacing: 12) {
                            Image(systemName: "timer")
                                .font(.title2.weight(.bold))
                                .foregroundColor(.purple)
                                .frame(width: 44, height: 44)
                                .background(Color.purple.opacity(0.18))
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                            VStack(alignment: .leading, spacing: 1) {
                                Text("Screen time")
                                    .font(.caption.weight(.bold))
                                    .foregroundColor(.purple)
                                Text("\(max(0, minutes.balance)) min saved up")
                                    .font(.title3.weight(.heavy))
                                    .foregroundColor(.choreStarTextPrimary)
                            }
                        }
                        .accessibilityElement(children: .combine)
                    }

                    if !news.isEmpty {
                        Text("Money news")
                            .font(.caption.weight(.bold))
                            .foregroundColor(.choreStarTextSecondary)
                        ForEach(news) { item in
                            HStack(alignment: .top) {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(MoneyLogic.newsTitle(kind: item.kind, amountCents: item.amountCents))
                                        .font(.headline)
                                        .foregroundColor(.choreStarTextPrimary)
                                    if let note = item.note, !note.isEmpty, MoneyLogic.showsNote(kind: item.kind, amountCents: item.amountCents) {
                                        Text(note)
                                            .font(.subheadline)
                                            .foregroundColor(.choreStarTextSecondary)
                                    }
                                }
                                Spacer()
                                Text(MoneyLogic.formatSigned(cents: item.amountCents, currencyCode: wallet.currencyCode))
                                    .font(.headline.weight(.heavy).monospacedDigit())
                                    .foregroundColor(item.amountCents > 0 ? .choreStarSuccess : item.amountCents < 0 ? .red : .choreStarTextSecondary)
                            }
                            .padding(10)
                            .background(Color.choreStarBackground)
                            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                            .accessibilityElement(children: .combine)
                        }
                    }
                }
                .padding(18)
                .background(Color.choreStarCardBackground)
                .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
                .shadow(color: .black.opacity(0.06), radius: 10, x: 0, y: 4)
                .padding(.horizontal, 20)
            }
        }
    }
}

/// A jar that fills relative to the fullest one.
private struct KidJar: View {
    let icon: String
    let label: String
    let hint: String
    let cents: Int
    let amount: String
    let tint: Color
    let level: Double

    var body: some View {
        VStack(spacing: 6) {
            ZStack(alignment: .bottom) {
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(tint.opacity(0.12))
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(tint.opacity(0.45))
                    .frame(height: 56 * level)
                    .animation(.spring(response: 0.8, dampingFraction: 0.8), value: level)
                Image(systemName: icon)
                    .font(.title3.weight(.bold))
                    .foregroundColor(tint)
                    .frame(maxHeight: .infinity)
            }
            .frame(width: 48, height: 56)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            Text(label).font(.subheadline.weight(.heavy)).foregroundColor(tint)
            Text(cents < 0 ? "-\(amount)" : amount)
                .font(.headline.weight(.heavy).monospacedDigit())
                .foregroundColor(cents < 0 ? .red : .choreStarTextPrimary)
                .lineLimit(1)
                .minimumScaleFactor(0.6)
            Text(hint)
                .font(.caption2.weight(.semibold))
                .foregroundColor(.choreStarTextSecondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 10)
        .background(tint.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .accessibilityElement(children: .combine)
    }
}
