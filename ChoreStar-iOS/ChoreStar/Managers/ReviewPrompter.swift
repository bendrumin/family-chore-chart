import Foundation

/// Decides when to ask for an App Store rating. The ask itself goes through
/// StoreKit's requestReview — which Apple already caps at 3 prompts per year —
/// but this gate keeps our calls rarer still, and only at happy PARENT-side
/// moments: a perfect-day celebration, a payout, an approved store request. Kid-mode surfaces must
/// never prompt; kids can't leave reviews and shouldn't be interrupted.
enum ReviewPrompter {

    /// Public App Store listing, used by the Share row in Settings.
    static let appStoreURL = URL(string: "https://apps.apple.com/app/id6761279049")!
    /// Deep link straight to the App Store's "Write a Review" sheet. Explicit
    /// buttons must use this rather than requestReview, which may show nothing.
    static let writeReviewURL = URL(string: "https://apps.apple.com/app/id6761279049?action=write-review")!

    static let minDaysSinceFirstLaunch = 3
    static let minPerfectDays = 2
    static let minDaysBetweenPrompts = 90

    /// The dashboard's "Enjoying ChoreStar?" card. It links to the App Store's
    /// write-review page rather than calling requestReview, so it is not capped
    /// at three a year, which is exactly why it has to stay rare and polite:
    /// only after real use, snoozed for two months on "Not now", and gone for
    /// good once they tap Rate.
    static let rateCardMinDays = 3
    static let rateCardMinLaunches = 5
    static let rateCardSnoozeDays = 60

    private static let firstLaunchKey = "review.firstLaunchDate"
    private static let perfectDayCountKey = "review.perfectDayCount"
    private static let lastPromptKey = "review.lastPromptDate"
    private static let launchCountKey = "review.launchCount"
    private static let rateCardSnoozedKey = "review.rateCardSnoozedDate"
    private static let rateCardDoneKey = "review.rateCardDone"

    /// Stamps the first launch date once and counts launches.
    static func recordLaunch(defaults: UserDefaults = .standard, now: Date = Date()) {
        if defaults.object(forKey: firstLaunchKey) == nil {
            defaults.set(now, forKey: firstLaunchKey)
        }
        defaults.set(defaults.integer(forKey: launchCountKey) + 1, forKey: launchCountKey)
    }

    static func shouldShowRateCard(defaults: UserDefaults = .standard, now: Date = Date()) -> Bool {
        let day: TimeInterval = 86_400
        if defaults.bool(forKey: rateCardDoneKey) { return false }
        guard let firstLaunch = defaults.object(forKey: firstLaunchKey) as? Date,
              now.timeIntervalSince(firstLaunch) >= TimeInterval(rateCardMinDays) * day else {
            return false
        }
        guard defaults.integer(forKey: launchCountKey) >= rateCardMinLaunches else { return false }
        if let snoozed = defaults.object(forKey: rateCardSnoozedKey) as? Date,
           now.timeIntervalSince(snoozed) < TimeInterval(rateCardSnoozeDays) * day {
            return false
        }
        return true
    }

    static func snoozeRateCard(defaults: UserDefaults = .standard, now: Date = Date()) {
        defaults.set(now, forKey: rateCardSnoozedKey)
    }

    static func completeRateCard(defaults: UserDefaults = .standard) {
        defaults.set(true, forKey: rateCardDoneKey)
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

    /// Call after a successful money moment on the parent side: a payout, or
    /// an approved Reward Store request. Real money changed hands, which is a
    /// stronger signal than a perfect day, so a single moment qualifies. The
    /// prompt date is SHARED with the perfect-day path, so the two asks can
    /// never stack inside one cooldown window.
    static func recordMoneyMomentAndCheck(defaults: UserDefaults = .standard, now: Date = Date()) -> Bool {
        let decision = shouldPromptAfterMoneyMoment(
            firstLaunch: defaults.object(forKey: firstLaunchKey) as? Date,
            lastPrompt: defaults.object(forKey: lastPromptKey) as? Date,
            now: now
        )
        if decision {
            defaults.set(now, forKey: lastPromptKey)
        }
        return decision
    }

    /// Pure decision core for money moments, unit-tested: a few days of real
    /// use and no recent ask. No event-count threshold on purpose; the FIRST
    /// payout is exactly the moment worth asking at.
    static func shouldPromptAfterMoneyMoment(firstLaunch: Date?, lastPrompt: Date?, now: Date) -> Bool {
        let day: TimeInterval = 86_400
        guard let firstLaunch,
              now.timeIntervalSince(firstLaunch) >= TimeInterval(minDaysSinceFirstLaunch) * day else {
            return false
        }
        if let lastPrompt,
           now.timeIntervalSince(lastPrompt) < TimeInterval(minDaysBetweenPrompts) * day {
            return false
        }
        return true
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
