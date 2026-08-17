import Foundation

/// Decides when to ask for an App Store rating. The ask itself goes through
/// StoreKit's requestReview — which Apple already caps at 3 prompts per year —
/// but this gate keeps our calls rarer still, and only at happy moments:
/// a perfect-day celebration on the PARENT dashboard. Kid-mode surfaces must
/// never prompt; kids can't leave reviews and shouldn't be interrupted.
enum ReviewPrompter {

    static let minDaysSinceFirstLaunch = 3
    static let minPerfectDays = 2
    static let minDaysBetweenPrompts = 90

    private static let firstLaunchKey = "review.firstLaunchDate"
    private static let perfectDayCountKey = "review.perfectDayCount"
    private static let lastPromptKey = "review.lastPromptDate"

    /// Idempotent; stamps the first launch date once.
    static func recordLaunch(defaults: UserDefaults = .standard, now: Date = Date()) {
        if defaults.object(forKey: firstLaunchKey) == nil {
            defaults.set(now, forKey: firstLaunchKey)
        }
    }

    /// Call when the perfect-day celebration is dismissed. Increments the
    /// perfect-day count and returns true when the system prompt should be
    /// requested (also stamping the prompt date so the cooldown starts).
    static func recordPerfectDayAndCheck(defaults: UserDefaults = .standard, now: Date = Date()) -> Bool {
        let count = defaults.integer(forKey: perfectDayCountKey) + 1
        defaults.set(count, forKey: perfectDayCountKey)

        let decision = shouldPrompt(
            firstLaunch: defaults.object(forKey: firstLaunchKey) as? Date,
            perfectDayCount: count,
            lastPrompt: defaults.object(forKey: lastPromptKey) as? Date,
            now: now
        )
        if decision {
            defaults.set(now, forKey: lastPromptKey)
        }
        return decision
    }

    /// Pure decision core, unit-tested: prompt only when the family has used
    /// the app a few days, celebrated more than once, and hasn't been asked
    /// recently.
    static func shouldPrompt(firstLaunch: Date?, perfectDayCount: Int, lastPrompt: Date?, now: Date) -> Bool {
        let day: TimeInterval = 86_400
        guard let firstLaunch,
              now.timeIntervalSince(firstLaunch) >= TimeInterval(minDaysSinceFirstLaunch) * day else {
            return false
        }
        guard perfectDayCount >= minPerfectDays else { return false }
        if let lastPrompt,
           now.timeIntervalSince(lastPrompt) < TimeInterval(minDaysBetweenPrompts) * day {
            return false
        }
        return true
    }
}
