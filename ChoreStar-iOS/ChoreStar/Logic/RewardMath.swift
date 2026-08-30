import Foundation

/// Pure earnings math, extracted from SupabaseManager so it can be unit
/// tested without a network or a live manager. Mirrors the web app's rules:
/// per-chore mode pays each completed chore's reward; daily mode pays a flat
/// amount only when every chore that day is done.
enum RewardMath {

    /// Matches the web default and the `family_settings.daily_reward_cents`
    /// column default.
    static let defaultDailyRewardCents = 7

    /// Cents earned for one day.
    ///
    /// - Parameters:
    ///   - completedRewards: dollar rewards of the chores completed that day.
    ///   - totalChoreCount: how many chores the child has assigned.
    ///   - isPerChoreMode: `family_settings.reward_mode == "per_chore"`.
    ///   - dailyRewardCents: flat daily reward; nil falls back to the default.
    ///
    /// Rewards are stored in the DB as `reward_cents` (Int) but travel through
    /// the `Chore` model as dollars (Double), so per-chore mode rounds each
    /// chore back to whole cents before summing — summing doubles first would
    /// let float error accumulate across chores.
    static func dayEarningsCents(
        completedRewards: [Double],
        totalChoreCount: Int,
        isPerChoreMode: Bool,
        dailyRewardCents: Int?
    ) -> Int {
        guard totalChoreCount > 0 else { return 0 }

        if isPerChoreMode {
            return completedRewards.reduce(0) { $0 + Int(round($1 * 100)) }
        }

        // Daily mode: the flat reward is earned only on a perfect day.
        guard completedRewards.count == totalChoreCount else { return 0 }
        return dailyRewardCents ?? defaultDailyRewardCents
    }

    /// Day-of-week index used across the schema and both apps: Sunday = 0
    /// through Saturday = 6, matching JavaScript's `Date.getDay()` and the
    /// `chore_completions.day_of_week` column. Foundation's `.weekday` is
    /// 1-based, hence the -1.
    static func dayIndex(of date: Date, calendar: Calendar = .current) -> Int {
        calendar.component(.weekday, from: date) - 1
    }
}

/// Chore scheduling: which weekdays a chore is due. Mirrors the web's
/// lib/utils/schedule.ts so both apps agree on "is this on today's list".
///
/// A missing or empty schedule means every day: that is what every chore was
/// before `chores.days_of_week` existed, and it keeps old rows behaving the
/// same way.
enum ChoreSchedule {

    static let everyDay: [Int] = [0, 1, 2, 3, 4, 5, 6]
    static let weekdays: [Int] = [1, 2, 3, 4, 5]
    static let weekends: [Int] = [0, 6]

    static let shortNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    static let longNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

    /// Sorted, de-duplicated, in range. Empty (or nil) becomes every day.
    static func normalized(_ days: [Int]?) -> [Int] {
        let cleaned = Set((days ?? []).filter { (0...6).contains($0) }).sorted()
        return cleaned.isEmpty ? everyDay : cleaned
    }

    static func isDue(_ days: [Int], on dayIndex: Int) -> Bool {
        normalized(days).contains(dayIndex)
    }

    static func isEveryDay(_ days: [Int]) -> Bool {
        normalized(days).count == 7
    }

    /// "Every day", "Weekdays", "Weekends", "Tuesdays", or "Mon, Wed, Fri".
    static func label(for days: [Int]) -> String {
        let d = normalized(days)
        if d.count == 7 { return "Every day" }
        if d == weekdays { return "Weekdays" }
        if d == weekends { return "Weekends" }
        if d.count == 1 { return longNames[d[0]] + "s" }
        return d.map { shortNames[$0] }.joined(separator: ", ")
    }

    /// The chores from `chores` due on `dayIndex`.
    static func due(_ chores: [Chore], on dayIndex: Int) -> [Chore] {
        chores.filter { $0.isDue(on: dayIndex) }
    }

    /// How many of the seven days have at least one chore due.
    static func dueDayCount(_ chores: [Chore]) -> Int {
        (0..<7).filter { day in chores.contains { $0.isDue(on: day) } }.count
    }
}
