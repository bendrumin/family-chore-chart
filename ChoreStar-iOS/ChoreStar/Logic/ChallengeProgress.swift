import Foundation

/// Family challenges (Premium, migration 031): cooperative sibling goals.
///
/// A line-for-line port of chorestar-nextjs/lib/challenges/progress.ts, so the
/// parent screen on iOS shows the same number as the web dashboard, the kid
/// API and the deliver route. Progress is never stored: it is derived from the
/// approved chore ticks and routine completions inside the window.
///
/// Dates are family-local calendar days as "YYYY-MM-DD" strings, with UTC
/// arithmetic so the phone's own time zone never leaks in.
enum ChallengeProgress {
    // MARK: - Definitions

    struct Row: Decodable, Identifiable, Equatable {
        let id: UUID
        let user_id: UUID
        let title: String
        let emoji: String?
        let reward_text: String
        let reward_cents: Int
        /// 'chores' | 'routines'
        let metric: String
        /// 'team' | 'each'
        let mode: String
        let target: Int
        let chore_filter: String?
        let routine_type: String?
        let child_ids: [UUID]
        let starts_on: String
        let ends_on: String
        /// 'active' | 'delivered' | 'cancelled'
        let status: String
        let delivered_at: String?
        let created_at: String
    }

    static let columns = "id, user_id, title, emoji, reward_text, reward_cents, metric, mode, target, chore_filter, routine_type, child_ids, starts_on, ends_on, status, delivered_at, created_at"

    struct ChoreLite: Decodable {
        let id: UUID
        let child_id: UUID
        /// 025: 'grab' marks a bonus chore.
        let rotation_mode: String?
    }

    struct ChoreCompletionLite: Decodable {
        let chore_id: UUID
        let week_start: String?
        let day_of_week: Int?
        let status: String?
    }

    struct RoutineLite: Decodable {
        let id: UUID
        let child_id: UUID
        let type: String?
    }

    struct RoutineCompletionLite: Decodable {
        let routine_id: UUID
        let child_id: UUID
        let date: String?
        let completed_at: String?
    }

    struct Inputs {
        var chores: [ChoreLite] = []
        var choreCompletions: [ChoreCompletionLite] = []
        var routines: [RoutineLite] = []
        var routineCompletions: [RoutineCompletionLite] = []
        /// IANA zone from family_settings.timezone. UTC when unknown.
        var timeZone: String? = nil
    }

    struct KidContribution: Equatable {
        let childId: UUID
        let count: Int
        /// 'each': reached the target. 'team': helped at least once.
        let done: Bool
        /// 'each': still needed. 0 in team mode.
        let toGo: Int
    }

    struct Progress: Equatable {
        let current: Int
        let goal: Int
        /// 0...100
        let percent: Int
        let met: Bool
        let remaining: Int
        let kids: [KidContribution]
    }

    enum Phase: String {
        case upcoming, active, won, delivered, missed, cancelled
        var sortOrder: Int {
            switch self {
            case .won: return 0
            case .active: return 1
            case .upcoming: return 2
            case .delivered: return 3
            case .missed: return 4
            case .cancelled: return 5
            }
        }
    }

    struct WithProgress: Identifiable {
        let challenge: Row
        let progress: Progress
        let phase: Phase
        let daysLeft: Int
        var id: UUID { challenge.id }
    }

    static let routineTypes = ["morning", "bedtime", "afterschool", "custom"]
    static let maxDays = 93

    // MARK: - Dates

    private static let utc: Calendar = {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = TimeZone(identifier: "UTC")!
        return c
    }()

    private static func ymdFormatter(_ zone: TimeZone) -> DateFormatter {
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .gregorian)
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = zone
        f.dateFormat = "yyyy-MM-dd"
        return f
    }

    static func isIsoDate(_ s: String) -> Bool {
        guard s.count == 10, let d = date(s) else { return false }
        return ymdFormatter(TimeZone(identifier: "UTC")!).string(from: d) == s
    }

    static func date(_ ymd: String) -> Date? {
        ymdFormatter(TimeZone(identifier: "UTC")!).date(from: String(ymd.prefix(10)))
    }

    static func addDays(_ ymd: String, _ days: Int) -> String {
        guard let d = date(ymd), let moved = utc.date(byAdding: .day, value: days, to: d) else { return ymd }
        return ymdFormatter(TimeZone(identifier: "UTC")!).string(from: moved)
    }

    /// Whole days from a to b (b - a).
    static func daysBetween(_ a: String, _ b: String) -> Int {
        guard let da = date(a), let db = date(b) else { return 0 }
        return Int((db.timeIntervalSince(da) / 86_400).rounded())
    }

    static func zone(_ identifier: String?) -> TimeZone {
        guard let identifier, let tz = TimeZone(identifier: identifier) else { return TimeZone(identifier: "UTC")! }
        return tz
    }

    /// Today's calendar date in a time zone.
    static func today(in timeZone: String?, now: Date = Date()) -> String {
        ymdFormatter(zone(timeZone)).string(from: now)
    }

    /// The Sunday..Saturday week containing `today`, like chore_completions.week_start.
    static func weekWindow(_ today: String) -> (startsOn: String, endsOn: String) {
        guard let d = date(today) else { return (today, today) }
        let dow = utc.component(.weekday, from: d) - 1
        let start = addDays(today, -dow)
        return (start, addDays(start, 6))
    }

    /// The day a chore tick is FOR: its week's Sunday plus the day index.
    static func choreCompletionDate(_ c: ChoreCompletionLite) -> String? {
        guard let week = c.week_start, let dow = c.day_of_week, (0...6).contains(dow) else { return nil }
        return addDays(String(week.prefix(10)), dow)
    }

    /// The family-local day a routine was finished on.
    static func routineCompletionDate(_ c: RoutineCompletionLite, timeZone: String?) -> String? {
        if let raw = c.completed_at, let t = Entitlements.parseTimestamp(raw) {
            return today(in: timeZone, now: t)
        }
        return c.date.map { String($0.prefix(10)) }
    }

    static func inWindow(_ date: String, startsOn: String, endsOn: String) -> Bool {
        date >= startsOn && date <= endsOn
    }

    /// Days left including today (0 once ended).
    static func daysLeft(startsOn: String, endsOn: String, today: String) -> Int {
        if today > endsOn { return 0 }
        let from = today < startsOn ? startsOn : today
        return daysBetween(from, endsOn) + 1
    }

    /// The query range covering every window (chore rows are keyed by week,
    /// routine rows by the server's UTC day, so both are widened a little).
    static func fetchRange(_ rows: [Row]) -> (weekFrom: String, weekTo: String, dateFrom: String, dateTo: String)? {
        guard let first = rows.first else { return nil }
        let start = rows.reduce(first.starts_on) { min($0, $1.starts_on) }
        let end = rows.reduce(first.ends_on) { max($0, $1.ends_on) }
        return (weekWindow(start).startsOn, end, addDays(start, -1), addDays(end, 1))
    }

    // MARK: - Counting

    private static func isApproved(_ status: String?) -> Bool {
        status == nil || status == "" || status == "approved"
    }

    /// Each participant's count inside the window. Every participant has a key.
    static func countContributions(_ def: Row, _ input: Inputs) -> [UUID: Int] {
        var counts: [UUID: Int] = [:]
        let participants = Set(def.child_ids)
        for id in def.child_ids { counts[id] = 0 }

        if def.metric == "chores" {
            var byId: [UUID: ChoreLite] = [:]
            for chore in input.chores where participants.contains(chore.child_id) {
                if def.chore_filter == "bonus" && chore.rotation_mode != "grab" { continue }
                byId[chore.id] = chore
            }
            var seen = Set<String>()
            for c in input.choreCompletions {
                guard let chore = byId[c.chore_id], isApproved(c.status),
                      let day = choreCompletionDate(c),
                      inWindow(day, startsOn: def.starts_on, endsOn: def.ends_on) else { continue }
                let key = "\(c.chore_id)|\(day)"
                if !seen.insert(key).inserted { continue }
                counts[chore.child_id, default: 0] += 1
            }
            return counts
        }

        var byId: [UUID: RoutineLite] = [:]
        for routine in input.routines where participants.contains(routine.child_id) {
            if let type = def.routine_type, routine.type != type { continue }
            byId[routine.id] = routine
        }
        var seen = Set<String>()
        for c in input.routineCompletions {
            guard byId[c.routine_id] != nil, participants.contains(c.child_id),
                  let day = routineCompletionDate(c, timeZone: input.timeZone),
                  inWindow(day, startsOn: def.starts_on, endsOn: def.ends_on) else { continue }
            let key = "\(c.routine_id)|\(c.child_id)|\(day)"
            if !seen.insert(key).inserted { continue }
            counts[c.child_id, default: 0] += 1
        }
        return counts
    }

    static func progress(_ def: Row, counts: [UUID: Int]) -> Progress {
        progress(mode: def.mode, target: def.target, childIds: def.child_ids, counts: counts)
    }

    static func progress(mode: String, target rawTarget: Int, childIds: [UUID], counts: [UUID: Int]) -> Progress {
        let target = max(1, rawTarget)
        let kids: [KidContribution] = childIds.map { id in
            let count = counts[id] ?? 0
            return mode == "each"
                ? KidContribution(childId: id, count: count, done: count >= target, toGo: max(0, target - count))
                : KidContribution(childId: id, count: count, done: count > 0, toGo: 0)
        }
        if mode == "each" {
            let goal = target * max(1, kids.count)
            let current = kids.reduce(0) { $0 + min($1.count, target) }
            let met = !kids.isEmpty && kids.allSatisfy(\.done)
            return Progress(current: current, goal: goal, percent: pct(current, goal), met: met, remaining: goal - current, kids: kids)
        }
        let sum = kids.reduce(0) { $0 + $1.count }
        let current = min(sum, target)
        return Progress(current: current, goal: target, percent: pct(current, target), met: sum >= target, remaining: target - current, kids: kids)
    }

    private static func pct(_ current: Int, _ goal: Int) -> Int {
        guard goal > 0 else { return 0 }
        return min(100, Int((Double(current) / Double(goal) * 100).rounded()))
    }

    static func phase(status: String, startsOn: String, endsOn: String, met: Bool, today: String) -> Phase {
        if status == "cancelled" { return .cancelled }
        if status == "delivered" { return .delivered }
        if met { return .won }
        if today > endsOn { return .missed }
        if today < startsOn { return .upcoming }
        return .active
    }

    /// Progress, phase and days left for each challenge, at `now` in the family's zone.
    static func withProgress(_ rows: [Row], inputs: Inputs, now: Date = Date()) -> [WithProgress] {
        let today = today(in: inputs.timeZone, now: now)
        return rows.map { row in
            let p = progress(row, counts: countContributions(row, inputs))
            return WithProgress(
                challenge: row,
                progress: p,
                phase: phase(status: row.status, startsOn: row.starts_on, endsOn: row.ends_on, met: p.met, today: today),
                daysLeft: daysLeft(startsOn: row.starts_on, endsOn: row.ends_on, today: today)
            )
        }
    }

    /// Won-and-waiting first (the parent has something to do), then running ones.
    static func sorted(_ list: [WithProgress]) -> [WithProgress] {
        list.sorted { a, b in
            if a.phase.sortOrder != b.phase.sortOrder { return a.phase.sortOrder < b.phase.sortOrder }
            if a.challenge.ends_on != b.challenge.ends_on { return a.challenge.ends_on < b.challenge.ends_on }
            return a.challenge.created_at < b.challenge.created_at
        }
    }

    /// The web card's list: active, delivered in the last week, missed in the last week.
    static func parentList(_ rows: [Row], inputs: Inputs, now: Date = Date()) -> [WithProgress] {
        let recent: TimeInterval = 7 * 86_400
        let fresh = rows.filter { row in
            if row.status == "active" { return true }
            guard let raw = row.delivered_at, let at = Entitlements.parseTimestamp(raw) else { return false }
            return now.timeIntervalSince(at) < recent
        }
        return sorted(withProgress(fresh, inputs: inputs, now: now)).filter { item in
            guard item.phase == .missed else { return true }
            guard let end = date(item.challenge.ends_on) else { return false }
            return now.timeIntervalSince(end) < recent
        }
    }

    // MARK: - Copy

    /// "50 chores together", "5 bedtime routines each", "10 bonus chores together".
    static func describeTarget(metric: String, mode: String, target: Int, choreFilter: String?, routineType: String?) -> String {
        let each = mode == "each"
        if metric == "chores" {
            if choreFilter == "bonus" {
                return each ? String(localized: "\(target) bonus chores each") : String(localized: "\(target) bonus chores together")
            }
            return each ? String(localized: "\(target) chores each") : String(localized: "\(target) chores together")
        }
        let kind: String
        switch routineType {
        case "morning": kind = String(localized: "morning routines")
        case "bedtime": kind = String(localized: "bedtime routines")
        case "afterschool": kind = String(localized: "after-school routines")
        default: kind = String(localized: "routines")
        }
        return each ? String(localized: "\(target) \(kind) each") : String(localized: "\(target) \(kind) together")
    }

    /// Short, encouraging line about a kid's part. Never ranks kids.
    static func contributionLabel(count: Int, toGo: Int, done: Bool, mode: String) -> String {
        if mode == "each" {
            return done ? String(localized: "Done!") : String(localized: "\(count) so far, \(toGo) to go")
        }
        return count == 0 ? String(localized: "Ready to help") : String(localized: "Helped \(count)x")
    }

    static func statusLine(phase: Phase, daysLeft: Int) -> String {
        switch phase {
        case .won: return String(localized: "Target reached!")
        case .delivered: return String(localized: "Reward delivered")
        case .missed: return String(localized: "Ended before the target. Try a smaller one next time.")
        case .upcoming: return String(localized: "Starts soon")
        case .cancelled: return String(localized: "Ended")
        case .active:
            return daysLeft == 1 ? String(localized: "Last day") : String(localized: "\(daysLeft) days left")
        }
    }

    // MARK: - Templates (lib/challenges/templates.ts)

    struct Template: Identifiable {
        let key: String
        let emoji: String
        let title: String
        let rewardText: String
        let metric: String
        let mode: String
        let target: Int
        let choreFilter: String
        let routineType: String?
        var id: String { key }
    }

    static let templates: [Template] = [
        Template(key: "pizza_night", emoji: "🍕", title: String(localized: "Pizza Night"), rewardText: String(localized: "Pizza night"),
                 metric: "chores", mode: "team", target: 50, choreFilter: "any", routineType: nil),
        Template(key: "movie_night", emoji: "🎬", title: String(localized: "Movie Night"), rewardText: String(localized: "Family movie night"),
                 metric: "routines", mode: "each", target: 5, choreFilter: "any", routineType: "bedtime"),
        Template(key: "team_clean_up", emoji: "🧹", title: String(localized: "Team Clean-Up"), rewardText: String(localized: "Ice cream trip"),
                 metric: "chores", mode: "team", target: 10, choreFilter: "bonus", routineType: nil),
        Template(key: "early_birds", emoji: "🌅", title: String(localized: "Early Birds"), rewardText: String(localized: "Pancake breakfast"),
                 metric: "routines", mode: "team", target: 10, choreFilter: "any", routineType: "morning"),
        Template(key: "everyone_pitches_in", emoji: "🙌", title: String(localized: "Everyone Pitches In"), rewardText: String(localized: "Game night, winners pick"),
                 metric: "chores", mode: "each", target: 10, choreFilter: "any", routineType: nil),
    ]

    static let emojis = ["🏆", "🍕", "🎬", "🧹", "🌅", "🙌", "🍦", "🎲", "🏕️", "🎳", "🚀", "⭐"]

    /// Mirrors createChallengeSchema: nil when valid, else why not.
    static func validationError(title: String, rewardText: String, target: Int, childIds: [UUID], startsOn: String, endsOn: String) -> String? {
        if title.trimmingCharacters(in: .whitespaces).isEmpty { return String(localized: "Give the challenge a name") }
        if rewardText.trimmingCharacters(in: .whitespaces).isEmpty { return String(localized: "Say what the kids win") }
        if !(1...1000).contains(target) { return String(localized: "Pick a target from 1 to 1000") }
        if Set(childIds).count < 2 { return String(localized: "Pick at least two kids") }
        if endsOn < startsOn { return String(localized: "The challenge must end on or after its start") }
        if daysBetween(startsOn, endsOn) >= maxDays { return String(localized: "A challenge can run up to 93 days") }
        return nil
    }

    // MARK: - Kid view (GET /api/kid/challenges)

    struct KidResponse: Decodable {
        let childId: UUID?
        let currencyCode: String?
        let challenges: [KidChallenge]
    }

    struct KidChallenge: Decodable, Identifiable {
        struct Teammate: Decodable, Identifiable {
            let childId: UUID
            let name: String
            let avatarColor: String?
            let avatarEmoji: String?
            let count: Int
            let done: Bool
            let toGo: Int
            let isMe: Bool
            var id: UUID { childId }
        }
        let id: UUID
        let title: String
        let emoji: String?
        let rewardText: String
        let rewardCents: Int
        let metric: String
        let mode: String
        let target: Int
        let routineType: String?
        let choreFilter: String?
        let phase: String
        let daysLeft: Int
        let current: Int
        let goal: Int
        let percent: Int
        let met: Bool
        let remaining: Int
        let teammates: [Teammate]
    }
}
