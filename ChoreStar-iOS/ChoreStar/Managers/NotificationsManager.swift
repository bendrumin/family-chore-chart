import Foundation
import UserNotifications

/// Local notifications: a configurable daily "check today's chores" reminder.
/// Remote APNs activity alerts are handled separately (PushDelegate + server).
final class NotificationsManager {
    static let shared = NotificationsManager()

    private static let dailyReminderID = "daily_chore_reminder"
    /// One-shot reminders used while a vacation window is set (a repeating
    /// calendar trigger cannot skip days). Suffixed with the fire date.
    private static let oneShotPrefix = "daily_chore_reminder_day_"

    /// Same keys SettingsView binds via @AppStorage.
    private static let reminderEnabledKey = "dailyReminderEnabled"
    private static let reminderTimeKey = "dailyReminderTime"

    /// Default reminder time: 5:00 PM today (only hour/minute matter).
    static var defaultReminderTimeInterval: Double {
        let calendar = Calendar.current
        let fivePM = calendar.date(bySettingHour: 17, minute: 0, second: 0, of: Date()) ?? Date()
        return fivePM.timeIntervalSinceReferenceDate
    }

    private init() {}

    func requestAuthorization() async -> Bool {
        let center = UNUserNotificationCenter.current()
        let settings = await center.notificationSettings()

        switch settings.authorizationStatus {
        case .authorized, .provisional, .ephemeral:
            return true
        case .denied:
            return false
        case .notDetermined:
            return (try? await center.requestAuthorization(options: [.alert, .sound, .badge])) ?? false
        @unknown default:
            return false
        }
    }

    /// Schedules (or reschedules) the daily reminder at the given time of day.
    ///
    /// With no vacation window (or one already over), this is the plain
    /// repeating trigger it always was. While a window is set, days inside it
    /// stay quiet: one-shot reminders are scheduled for each day OUTSIDE the
    /// window, out to 30 days past its end (well within the 64-request limit).
    /// The next app launch re-syncs, so the repeating trigger comes back once
    /// the window is cleared or expired.
    func scheduleDailyReminder(at time: Date, pausedDuring window: ClosedRange<Date>? = nil) {
        let center = UNUserNotificationCenter.current()
        cancelDailyReminder()

        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        let timeComponents = calendar.dateComponents([.hour, .minute], from: time)

        guard let window, window.upperBound >= today else {
            var components = timeComponents
            components.second = 0
            let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: true)
            center.add(UNNotificationRequest(
                identifier: Self.dailyReminderID,
                content: Self.reminderContent(),
                trigger: trigger
            ))
            return
        }

        guard let horizon = calendar.date(byAdding: .day, value: 30, to: window.upperBound) else { return }
        var day = today
        var scheduled = 0
        while day <= horizon && scheduled < 45 {
            let next = calendar.date(byAdding: .day, value: 1, to: day)
            defer { day = next ?? horizon.addingTimeInterval(1) }

            if window.contains(day) { continue }
            var components = calendar.dateComponents([.year, .month, .day], from: day)
            components.hour = timeComponents.hour
            components.minute = timeComponents.minute
            components.second = 0
            guard let fireDate = calendar.date(from: components), fireDate > Date() else { continue }

            let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: false)
            center.add(UNNotificationRequest(
                identifier: Self.oneShotPrefix + VacationMode.string(from: day),
                content: Self.reminderContent(),
                trigger: trigger
            ))
            scheduled += 1
        }
    }

    /// Re-syncs the daily reminder with the vacation window using the saved
    /// preference. Called when family settings load or the window changes, so
    /// vacation days go quiet without a visit to the Settings screen. A no-op
    /// when the reminder is off.
    func refreshDailyReminder(vacationWindow: ClosedRange<Date>?) {
        guard UserDefaults.standard.bool(forKey: Self.reminderEnabledKey) else { return }
        let stored = UserDefaults.standard.double(forKey: Self.reminderTimeKey)
        let interval = stored != 0 ? stored : Self.defaultReminderTimeInterval
        scheduleDailyReminder(
            at: Date(timeIntervalSinceReferenceDate: interval),
            pausedDuring: vacationWindow
        )
    }

    func cancelDailyReminder() {
        // One-shot identifiers are deterministic (prefix + date), so they can
        // be removed without an async pending-requests fetch — a fetch's
        // callback could land after a reschedule and wipe the fresh requests.
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        var identifiers = [Self.dailyReminderID]
        for offset in -2...90 {
            if let day = calendar.date(byAdding: .day, value: offset, to: today) {
                identifiers.append(Self.oneShotPrefix + VacationMode.string(from: day))
            }
        }
        UNUserNotificationCenter.current()
            .removePendingNotificationRequests(withIdentifiers: identifiers)
    }

    private static func reminderContent() -> UNMutableNotificationContent {
        let content = UNMutableNotificationContent()
        content.title = "ChoreStar ⭐"
        content.body = "Time to check today's chores. A little progress goes a long way!"
        content.sound = .default
        return content
    }
}
