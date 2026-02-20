/**
 * Push Notifications Manager
 * Handles browser push notifications for ChoreStar
 */

class NotificationManager {
  private isSupported: boolean
  private permission: NotificationPermission = 'default'
  private subscription: PushSubscription | null = null

  constructor() {
    this.isSupported = typeof window !== 'undefined' && 
                      'serviceWorker' in navigator && 
                      'PushManager' in window &&
                      'Notification' in window
  }

  /**
   * Initialize notifications
   */
  async init(): Promise<boolean> {
    if (!this.isSupported) {
      console.log('Push notifications not supported')
      return false
    }

    // Don't request permission automatically - wait for user gesture
    this.permission = Notification.permission

    if (this.permission === 'granted') {
      await this.subscribeToPush()
      return true
    }

    return false
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<boolean> {
    if (!this.isSupported) {
      return false
    }

    this.permission = await Notification.requestPermission()

    if (this.permission === 'granted') {
      await this.subscribeToPush()
      return true
    }

    return false
  }

  /**
   * Subscribe to push notifications
   */
  private async subscribeToPush(): Promise<boolean> {
    try {
      const registration = await navigator.serviceWorker.ready
      
      // VAPID public key (you'll need to generate this for production)
      const vapidPublicKey = 'BEl62iUYgUivxIkv69yViEuiBIa1HI0Fk-6jvem70JXlF5DDvPDHv5PJPB20HwFGoAZvz7Ms5SWkWNF2N_G5Jo'
      
      this.subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey) as BufferSource
      })

      // Send subscription to server (you'll need to implement this endpoint)
      await this.saveSubscription(this.subscription)

      console.log('Push notification subscription successful')
      return true
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error)
      return false
    }
  }

  /**
   * Save subscription to server
   */
  private async saveSubscription(subscription: PushSubscription): Promise<boolean> {
    try {
      const sub = subscription.toJSON()
      if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
        console.warn('Invalid subscription format')
        return false
      }

      const response = await fetch('/api/push-subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
        }),
        credentials: 'include',
      })

      if (!response.ok) {
        console.error('Failed to save subscription:', await response.text())
        return false
      }
      return true
    } catch (error) {
      console.error('Failed to save subscription:', error)
      return false
    }
  }

  /**
   * Check if notifications are enabled
   */
  isEnabled(): boolean {
    return this.isSupported && this.permission === 'granted'
  }

  /**
   * Send local notification (for testing)
   */
  async sendLocalNotification(title: string, body: string, data: any = {}): Promise<boolean> {
    if (!this.isEnabled()) {
      return false
    }

    try {
      const registration = await navigator.serviceWorker.ready
      await registration.showNotification(title, {
        body: body,
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        vibrate: [100, 50, 100] as number[],
        data: {
          ...data,
          dateOfArrival: Date.now()
        },
        actions: [
          {
            action: 'open',
            title: 'Open App',
            icon: '/icon-192x192.png'
          },
          {
            action: 'close',
            title: 'Close',
            icon: '/icon-192x192.png'
          }
        ]
      } as NotificationOptions)

      return true
    } catch (error) {
      console.error('Failed to send local notification:', error)
      return false
    }
  }

  /**
   * Send daily chore reminder
   */
  async sendDailyReminder(): Promise<boolean> {
    return await this.sendLocalNotification(
      '🌟 Daily Chore Reminder',
      'Time to check off today\'s chores! Click to open ChoreStar.',
      { type: 'daily_reminder', url: '/' }
    )
  }

  /**
   * Send weekly progress report
   */
  async sendWeeklyReport(completed: number, total: number): Promise<boolean> {
    return await this.sendLocalNotification(
      '📊 Weekly Progress Report',
      `Great job this week! Your family completed ${completed} out of ${total} chores.`,
      { type: 'weekly_report', url: '/' }
    )
  }

  /**
   * Convert VAPID key to Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }
}

// Export singleton instance
export const notificationManager = new NotificationManager()

