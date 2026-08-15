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
