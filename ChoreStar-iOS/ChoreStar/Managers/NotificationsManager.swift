import Foundation
import UserNotifications

/// Local notifications: a configurable daily "check today's chores" reminder.
/// (Remote APNs pushes are a future, server-side feature.)
final class NotificationsManager {
    static let shared = NotificationsManager()

    private static let dailyReminderID = "daily_chore_reminder"

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
    func scheduleDailyReminder(at time: Date) {
        let center = UNUserNotificationCenter.current()
        center.removePendingNotificationRequests(withIdentifiers: [Self.dailyReminderID])

        let content = UNMutableNotificationContent()
        content.title = "ChoreStar ⭐"
        content.body = "Time to check today's chores — a little progress goes a long way!"
        content.sound = .default

        var components = Calendar.current.dateComponents([.hour, .minute], from: time)
        components.second = 0

        let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: true)
        let request = UNNotificationRequest(
            identifier: Self.dailyReminderID,
            content: content,
            trigger: trigger
        )

        center.add(request)
    }

    func cancelDailyReminder() {
        UNUserNotificationCenter.current()
            .removePendingNotificationRequests(withIdentifiers: [Self.dailyReminderID])
    }
}
