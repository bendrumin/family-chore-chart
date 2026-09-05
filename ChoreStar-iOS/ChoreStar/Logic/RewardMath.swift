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
/// Which two days "Weekends" means. The chore grid is still Sunday=0; this
/// only changes the Weekdays/Weekends presets and their labels.
enum WeekendStyle: Equatable {
    /// Saturday–Sunday. US, Europe, most of the world. Days 0 and 6.
    case saturdaySunday
    /// Friday–Saturday. Saudi Arabia, UAE, and much of the Gulf. Days 5 and 6.
    case fridaySaturday

    var weekends: [Int] {
        switch self {
        case .saturdaySunday: return [0, 6]
        case .fridaySaturday: return [5, 6]
        }
    }

    var weekdays: [Int] {
        switch self {
        case .saturdaySunday: return [1, 2, 3, 4, 5]
        case .fridaySaturday: return [0, 1, 2, 3, 4]
        }
    }

    /// IANA zones whose civil weekend is Friday–Saturday.
    /// Iran (Thu–Fri) is intentionally not in this set.
    static let fridaySaturdayTimeZones: Set<String> = [
        "Asia/Riyadh", "Asia/Dubai", "Asia/Qatar", "Asia/Bahrain",
        "Asia/Kuwait", "Asia/Muscat", "Asia/Aden",
        "Asia/Amman", "Asia/Baghdad", "Asia/Damascus",
        "Asia/Gaza", "Asia/Hebron", "Asia/Jerusalem",
        "Africa/Cairo", "Africa/Khartoum", "Africa/Tripoli", "Africa/Djibouti",
    ]

    /// Family timezone wins when it is a real IANA zone (not the web default
    /// of `UTC`). Otherwise the iPhone's zone — so a Riyadh phone still gets
    /// Friday–Saturday presets before anyone opens Settings.
    static func inferred(
        familyTimezone: String?,
        deviceTimezone: String = TimeZone.current.identifier
    ) -> WeekendStyle {
        let id: String
        if let familyTimezone,
           familyTimezone != "UTC",
           !familyTimezone.isEmpty,
           TimeZone(identifier: familyTimezone) != nil {
            id = familyTimezone
        } else {
            id = deviceTimezone
        }
        return fridaySaturdayTimeZones.contains(id) ? .fridaySaturday : .saturdaySunday
    }
}

enum ChoreSchedule {

    static let everyDay: [Int] = [0, 1, 2, 3, 4, 5, 6]
    static let weekdays: [Int] = WeekendStyle.saturdaySunday.weekdays
    static let weekends: [Int] = WeekendStyle.saturdaySunday.weekends

    static let shortNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    static let longNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

    /// The order the seven day slots render in, honoring the calendar's first
    /// weekday (Monday-first in the UK and most of Europe, Sunday-first in the
    /// US and the Gulf). Data stays Sunday=0 everywhere; this is presentation
    /// only, so a stored schedule never changes meaning across locales.
    static func displayOrder(calendar: Calendar = .current) -> [Int] {
        let first = (calendar.firstWeekday - 1) % 7 // Calendar.firstWeekday is 1-based, 1 = Sunday
        return (0..<7).map { (first + $0) % 7 }
    }

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
    /// `weekendStyle` only affects what counts as Weekdays/Weekends; a Sat–Sun
    /// chore in a Gulf family still labels as "Sun, Sat", not "Weekends".
    static func label(for days: [Int], weekendStyle: WeekendStyle = .saturdaySunday) -> String {
        let d = normalized(days)
        if d.count == 7 { return "Every day" }
        if d == weekendStyle.weekdays { return "Weekdays" }
        if d == weekendStyle.weekends { return "Weekends" }
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

    /**
     The cells "Mark Today Done" / "Mark Week So Far Done" should insert.
     Mirrors the web's bulk-complete helper so both apps agree on what a
     parent's bulk tick covers:

     - a cell is (chore, dayOfWeek) in the CURRENT week;
     - only days `fromDay...throughDay` are considered (0 = Sunday .. 6 =
       Saturday; `fromDay` defaults to 0, so plain `throughDay` means
       "the week so far");
     - only cells where the chore is due per its `daysOfWeek` schedule;
     - any cell that already has a completion row of ANY status (approved,
       pending, pre-migration nil) is skipped — pending rows are the approve
       flow's job, not an insert's.

     Order is deterministic: by day, then by the order the chores were given.
     Out-of-range day indexes are clamped; an empty range returns [].
     */
    static func missingDueCells(
        chores: [Chore],
        existing: Set<ChoreDayCell>,
        throughDay: Int,
        fromDay: Int = 0
    ) -> [ChoreDayCell] {
        let first = max(fromDay, 0)
        let last = min(throughDay, 6)
        guard first <= last else { return [] }

        var missing: [ChoreDayCell] = []
        for day in first...last {
            for chore in chores where chore.isDue(on: day) {
                let cell = ChoreDayCell(choreId: chore.id, dayOfWeek: day)
                if !existing.contains(cell) {
                    missing.append(cell)
                }
            }
        }
        return missing
    }
}

/// One cell of the weekly grid: a chore on a weekday (0 = Sunday .. 6 =
/// Saturday), the unit `chore_completions` rows are keyed by within a week.
struct ChoreDayCell: Hashable {
    let choreId: UUID
    let dayOfWeek: Int
}
