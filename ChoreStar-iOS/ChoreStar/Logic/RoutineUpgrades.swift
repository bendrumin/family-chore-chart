import Foundation

/// Routine upgrades (migration 032): finish-by timer, live progress, picture
/// steps and Build with AI. Pure helpers, ported from
/// chorestar-nextjs/lib/routines/{routine-timer,live-progress,step-photos}.ts.
enum RoutineUpgrades {
    static let paywallPhotos = "gate_routine_photos"
    static let paywallTimer = "gate_routine_timer"
    static let paywallAI = "gate_ai_routine"
    static let paywallLive = "gate_routine_live"

    // MARK: - Finish-by timer (Premium)

    static let minTargetSeconds = 60
    static let maxTargetSeconds = 7200

    /// Gentle on purpose: no fail state, no red. Past the target it just says keep going.
    enum TimePhase: Equatable { case plenty, some, little, over }

    struct TimeStatus: Equatable {
        let remainingSeconds: Int
        /// 1 -> 0 share of the target still left; drives the shrinking bar.
        let fractionLeft: Double
        let overTime: Bool
        let phase: TimePhase
    }

    static func timeStatus(elapsedSeconds: Double, targetSeconds: Int) -> TimeStatus {
        let target = max(1, targetSeconds)
        let elapsed = max(0, Int(elapsedSeconds.rounded(.down)))
        let remaining = max(0, target - elapsed)
        let fraction = Double(remaining) / Double(target)
        let over = elapsed >= target
        let phase: TimePhase = over ? .over : fraction > 0.5 ? .plenty : fraction > 0.25 ? .some : .little
        return TimeStatus(remainingSeconds: remaining, fractionLeft: fraction, overTime: over, phase: phase)
    }

    /// Seconds a finished routine beat its target by; nil without a target,
    /// when it ran over, or when it is under 30 s (not worth a fanfare).
    static func finishedEarlyBy(durationSeconds: Int, targetSeconds: Int?) -> Int? {
        guard let targetSeconds, targetSeconds > 0 else { return nil }
        let early = targetSeconds - durationSeconds
        return early >= 30 ? early : nil
    }

    /// "12:05"
    static func formatClock(_ totalSeconds: Int) -> String {
        let s = max(0, totalSeconds)
        return String(format: "%d:%02d", s / 60, s % 60)
    }

    /// "3 min" / "45 sec" / "1 min 30 sec", for "Finished 3 min early!".
    static func formatEarly(_ seconds: Int) -> String {
        let m = seconds / 60
        let s = seconds % 60
        if m == 0 { return String(localized: "\(s) sec") }
        if s == 0 { return String(localized: "\(m) min") }
        return String(localized: "\(m) min \(s) sec")
    }

    /// What a routine save does to target_duration_seconds.
    enum FinishByChange: Equatable {
        case unchanged
        case clear
        case set(Int)

        /// From the builder: what it loaded with, and what it holds now.
        static func from(before: Int?, after: Int?) -> FinishByChange {
            if before == after { return .unchanged }
            if let after { return .set(after) }
            return .clear
        }
    }

    /// Builder minutes (0 = none) -> stored seconds or nil, clamped to the column range.
    static func targetSeconds(fromMinutes minutes: Int) -> Int? {
        guard minutes > 0 else { return nil }
        return min(maxTargetSeconds, max(minTargetSeconds, minutes * 60))
    }

    /// Sum of the step timers plus 10%, whole minutes, as a suggestion.
    static func suggestedTargetSeconds(stepDurations: [Int?]) -> Int? {
        let total = stepDurations.reduce(0) { $0 + max(0, $1 ?? 0) }
        guard total > 0 else { return nil }
        let withSlack = Int((Double(total) * 1.1 / 60).rounded(.up)) * 60
        return min(maxTargetSeconds, max(minTargetSeconds, withSlack))
    }

    // MARK: - Live progress

    static let staleAfter: TimeInterval = 30 * 60
    static let progressThrottle: TimeInterval = 4

    /// One row of GET /api/routines/live. Step fields are absent when `locked`.
    struct LiveRoutine: Decodable, Identifiable, Equatable {
        let routineId: UUID
        let routineName: String
        let routineColor: String?
        let childId: UUID
        let childName: String
        let childColor: String?
        let startedAt: String
        let updatedAt: String
        let locked: Bool
        let stepIndex: Int?
        let stepsTotal: Int?
        let stepTitle: String?
        var id: UUID { routineId }
    }

    struct LiveResponse: Decodable {
        let items: [LiveRoutine]
    }

    static func isFresh(updatedAt: String, now: Date = Date()) -> Bool {
        guard let t = Entitlements.parseTimestamp(updatedAt) else { return false }
        return now.timeIntervalSince(t) < staleAfter
    }

    /// "Maya is on step 3 of 6: Brush teeth"
    static func liveLine(childName: String, stepIndex: Int, stepsTotal: Int, stepTitle: String?) -> String {
        let step = min(stepsTotal, max(1, stepIndex + 1))
        let base = String(localized: "\(childName) is on step \(step) of \(stepsTotal)")
        if let title = stepTitle?.trimmingCharacters(in: .whitespacesAndNewlines), !title.isEmpty {
            return "\(base): \(title)"
        }
        return base
    }

    // MARK: - Picture steps

    static let photoBucket = "routine-step-photos"

    /// A step picture inside this family's folder: {owner}/{child}/{uuid}.jpg.
    /// Never sign anything else.
    static func isStepPhotoPath(_ path: String?, ownerId: String, childId: String? = nil) -> Bool {
        guard let path, path.count <= 300 else { return false }
        let parts = path.split(separator: "/", omittingEmptySubsequences: false).map(String.init)
        guard parts.count == 3, parts[0] == ownerId.lowercased(),
              UUID(uuidString: parts[1]) != nil, parts[1] == parts[1].lowercased() else { return false }
        if let childId, parts[1] != childId.lowercased() { return false }
        guard parts[2].hasSuffix(".jpg") else { return false }
        let stem = String(parts[2].dropLast(4))
        return stem == stem.lowercased() && UUID(uuidString: stem) != nil
    }

    /// Picture paths a save may keep: any in-folder path on Premium, only the
    /// ones already on the routine otherwise (a lapsed family keeps its pictures).
    static func allowedImagePath(_ requested: String?, ownerId: String, childId: String, premium: Bool, existing: Set<String>) -> String? {
        guard let requested, isStepPhotoPath(requested, ownerId: ownerId, childId: childId) else { return nil }
        return premium || existing.contains(requested) ? requested : nil
    }

    /// Paths that were on the routine before a save and are not after it.
    static func orphanedPhotos(before: [String?], after: [String?]) -> [String] {
        let keep = Set(after.compactMap { $0 })
        var out: [String] = []
        for p in before.compactMap({ $0 }) where !keep.contains(p) && !out.contains(p) { out.append(p) }
        return out
    }

    // MARK: - Build with AI

    struct DraftStep: Decodable {
        let title: String
        let icon: String
        let duration_seconds: Int?
    }

    struct Draft: Decodable {
        let name: String
        let type: String
        let icon: String
        let color: String
        let steps: [DraftStep]
        let tip: String?
    }

    struct DraftResponse: Decodable {
        let draft: Draft
        /// 'ai' or 'templates' (the AI was unavailable).
        let source: String
    }

    /// The web routine builder's icon keys (lib/constants/routine-icons.ts) as
    /// emoji, so AI drafts and web-made routines show a picture on iOS too.
    static let webIconEmoji: [String: String] = [
        "wake-up": "☀️", "make-bed": "🛏️", "brush-teeth": "🪥", "wash-face": "💧", "get-dressed": "👕",
        "brush-hair": "💇", "eat-breakfast": "🥣", "pack-backpack": "🎒", "put-on-shoes": "👟", "get-ready": "😊",
        "morning-stretch": "🤸", "take-bath": "🛁", "take-shower": "🚿", "put-on-pajamas": "🌙", "read-book": "📖",
        "hugs-kisses": "🤗", "lights-out": "💡", "bedtime-story": "📚", "set-alarm": "⏰", "calm-music": "🎵",
        "shower": "🚿", "wash-hands": "🧼", "floss-teeth": "🦷", "use-bathroom": "🚽", "put-on-deodorant": "✨",
        "clip-nails": "✂️", "eat-lunch": "🥪", "eat-dinner": "🍽️", "have-snack": "🍎", "drink-water": "🥤",
        "drink-milk": "🥛", "eat-fruit": "🍓", "eat-veggies": "🥦", "set-table": "🍴", "clear-dishes": "🧽",
        "do-homework": "✏️", "study": "📘", "practice-reading": "📖", "practice-math": "🧮", "check-backpack": "🎒",
        "organize-desk": "🗂️", "school-supplies": "🏫", "feed-pet": "🐶", "walk-dog": "🐕", "water-plants": "🌱",
        "take-out-trash": "🗑️", "clean-room": "🧹", "put-away-toys": "🧸", "help-cook": "👩‍🍳", "fold-laundry": "🧺",
        "vacuum": "🧹", "dust": "🪶", "play-outside": "🌳", "ride-bike": "🚲", "play-game": "🎮",
        "do-puzzle": "🧩", "draw-paint": "🎨", "listen-music": "🎧", "dance": "💃", "build-blocks": "🧱",
        "play-instrument": "🎹", "exercise": "🏃", "stretch": "🤸", "sports": "⚽", "yoga": "🧘",
        "check": "✅", "checkmark": "✅", "timer": "⏱️", "star": "⭐", "trophy": "🏆",
        "rocket": "🚀", "bell": "🔔", "heart": "❤️", "smile": "😊", "sparkles": "✨", "home": "🏠",
    ]

    static func emoji(forWebIcon key: String) -> String? { webIconEmoji[key] }

    /// The builder's step icon for a draft step: the emoji when known, else a check.
    static func builderIcon(forDraftIcon key: String) -> String { webIconEmoji[key] ?? "✅" }
}

/// Latest-wins throttle for the routine player's progress reports (the web's
/// createThrottledReporter). Sends at most once per `interval`; a report inside
/// the window is held and sent when it closes, replacing anything older.
final class ThrottledReporter<Value> {
    typealias Scheduler = (_ delay: TimeInterval, _ work: @escaping () -> Void) -> () -> Void

    private let send: (Value) -> Void
    private let interval: TimeInterval
    private let now: () -> TimeInterval
    private let schedule: Scheduler
    private var last: TimeInterval = -.infinity
    private var pending: Value?
    private var cancelTimer: (() -> Void)?

    init(
        interval: TimeInterval = RoutineUpgrades.progressThrottle,
        now: @escaping () -> TimeInterval = { Date().timeIntervalSince1970 },
        schedule: @escaping Scheduler = { delay, work in
            let item = DispatchWorkItem(block: work)
            DispatchQueue.main.asyncAfter(deadline: .now() + delay, execute: item)
            return { item.cancel() }
        },
        send: @escaping (Value) -> Void
    ) {
        self.interval = interval
        self.now = now
        self.schedule = schedule
        self.send = send
    }

    private func fire() {
        cancelTimer = nil
        guard let value = pending else { return }
        pending = nil
        last = now()
        send(value)
    }

    func report(_ value: Value) {
        pending = value
        let wait = last + interval - now()
        if wait <= 0 {
            cancelTimer?()
            cancelTimer = nil
            fire()
        } else if cancelTimer == nil {
            cancelTimer = schedule(wait) { [weak self] in self?.fire() }
        }
    }

    /// Send the held report now.
    func flush() {
        cancelTimer?()
        cancelTimer = nil
        fire()
    }

    /// Drop the held report.
    func cancel() {
        cancelTimer?()
        cancelTimer = nil
        pending = nil
    }
}
