'use client'

import { isAndroidShell } from '@/lib/utils/platform'

/**
 * Daily chore reminders posted by Android itself.
 *
 * The web app's reminders ride the Push API, which an Android WebView does not
 * have: inside the shell `Notification` is undefined and `PushManager` is
 * false, so the browser-notification button could never switch on. Android's
 * own notification scheduler has no such gap, and a daily nudge does not need a
 * server, so the shell schedules it on the device.
 *
 * Server-sent alerts (a kid finishing a routine, an approval waiting) still
 * need Firebase Cloud Messaging and are not covered here.
 */

const CHANNEL_ID = 'chorestar-reminders'
const DAILY_ID = 1001
const STORAGE_KEY = 'chorestar-daily-reminder'

interface PendingNotification {
  id: number
}

interface LocalNotificationsPlugin {
  checkPermissions: () => Promise<{ display: string }>
  requestPermissions: () => Promise<{ display: string }>
  createChannel: (options: { id: string; name: string; description?: string; importance?: number; visibility?: number }) => Promise<void>
  schedule: (options: { notifications: unknown[] }) => Promise<unknown>
  cancel: (options: { notifications: PendingNotification[] }) => Promise<void>
  getPending: () => Promise<{ notifications: PendingNotification[] }>
}

function plugin(): LocalNotificationsPlugin | null {
  if (!isAndroidShell()) return null
  const plugins = (window as unknown as { Capacitor?: { Plugins?: { LocalNotifications?: LocalNotificationsPlugin } } }).Capacitor?.Plugins
  return plugins?.LocalNotifications ?? null
}

/** True only inside the Android shell, where Android can post the reminder. */
export function nativeRemindersAvailable(): boolean {
  return plugin() !== null
}

export interface ReminderTime {
  hour: number
  minute: number
}

export const DEFAULT_REMINDER_TIME: ReminderTime = { hour: 17, minute: 0 }

function readStoredTime(): ReminderTime | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ReminderTime
    if (typeof parsed?.hour !== 'number' || typeof parsed?.minute !== 'number') return null
    return parsed
  } catch {
    return null
  }
}

function storeTime(time: ReminderTime | null): void {
  try {
    if (time) localStorage.setItem(STORAGE_KEY, JSON.stringify(time))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Private mode: the schedule still stands, only the remembered time is lost.
  }
}

/**
 * What this device is actually set to. Android is the source of truth for
 * whether a reminder is pending; the stored time only says when.
 */
export async function reminderState(): Promise<{ scheduled: boolean; time: ReminderTime }> {
  const api = plugin()
  const time = readStoredTime() ?? DEFAULT_REMINDER_TIME
  if (!api) return { scheduled: false, time }
  try {
    const pending = await api.getPending()
    return { scheduled: pending.notifications.some((n) => n.id === DAILY_ID), time }
  } catch {
    return { scheduled: false, time }
  }
}

export type EnableResult = 'ok' | 'denied' | 'unavailable'

/**
 * Asks for Android's notification permission if needed, then schedules one
 * repeating reminder. Deliberately inexact: an exact alarm would need the
 * exact-alarm permission, which a chore nudge cannot justify.
 */
export async function enableDailyReminder(time: ReminderTime): Promise<EnableResult> {
  const api = plugin()
  if (!api) return 'unavailable'

  let status = await api.checkPermissions()
  if (status.display !== 'granted') status = await api.requestPermissions()
  if (status.display !== 'granted') return 'denied'

  try {
    await api.createChannel({
      id: CHANNEL_ID,
      name: 'Chore reminders',
      description: 'The daily nudge to check off chores',
      importance: 3,
      visibility: 1,
    })
  } catch {
    // Channels exist from Android 8; a failure here is not worth blocking on.
  }

  await api.cancel({ notifications: [{ id: DAILY_ID }] })
  await api.schedule({
    notifications: [
      {
        id: DAILY_ID,
        channelId: CHANNEL_ID,
        title: 'Time for chores',
        body: "Open ChoreStar and check off what's done today.",
        schedule: { on: { hour: time.hour, minute: time.minute } },
        extra: { url: '/dashboard' },
      },
    ],
  })
  storeTime(time)
  return 'ok'
}

export async function disableDailyReminder(): Promise<void> {
  const api = plugin()
  if (!api) return
  await api.cancel({ notifications: [{ id: DAILY_ID }] })
  storeTime(null)
}

export function formatReminderTime({ hour, minute }: ReminderTime): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

export function parseReminderTime(value: string): ReminderTime | null {
  const m = value.match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return null
  const hour = Number(m[1])
  const minute = Number(m[2])
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null
  return { hour, minute }
}
