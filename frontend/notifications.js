// Notification Manager for ChoreStar
class NotificationManager {
    constructor() {
        this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
        this.permission = 'default';
        this.subscription = null;
    }

    // Initialize notifications
    async init() {
        if (!this.isSupported) {
            console.log('Push notifications not supported');
            return false;
        }

        // Don't request permission automatically - wait for user gesture
        this.permission = Notification.permission;
        
        if (this.permission === 'granted') {
            await this.subscribeToPush();
            return true;
        }
        
        return false;
    }

    // Subscribe to push notifications
    async subscribeToPush() {
        try {
            const registration = await navigator.serviceWorker.ready;
            this.subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.urlBase64ToUint8Array('BEl62iUYgUivxIkv69yViEuiBIa1HI0Fk-6jvem70JXlF5DDvPDHv5PJPB20HwFGoAZvz7Ms5SWkWNF2N_G5Jo')
            });

            // Send subscription to server
            await this.saveSubscription(this.subscription);
            
            console.log('Push notification subscription successful');
            return true;
        } catch (error) {
            console.error('Failed to subscribe to push notifications:', error);
            return false;
        }
    }

    // Save subscription to server
    async saveSubscription(subscription) {
        try {
            const response = await fetch('/api/save-subscription', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    subscription: subscription,
                    userId: window.apiClient?.currentUser?.id
                })
            });
            
            return response.ok;
        } catch (error) {
            console.error('Failed to save subscription:', error);
            return false;
        }
    }

    // Request notification permission
    async requestPermission() {
        if (!this.isSupported) {
            return false;
        }

        this.permission = await Notification.requestPermission();
        
        if (this.permission === 'granted') {
            await this.subscribeToPush();
            return true;
        }
        
        return false;
    }

    // Check if notifications are enabled
    isEnabled() {
        return this.isSupported && this.permission === 'granted';
    }

    // Send local notification (for testing)
    async sendLocalNotification(title, body, data = {}) {
        if (!this.isEnabled()) {
            return false;
        }

        try {
            const registration = await navigator.serviceWorker.ready;
            await registration.showNotification(title, {
                body: body,
                icon: '/manifest.json',
                badge: '/manifest.json',
                vibrate: [100, 50, 100],
                data: {
                    ...data,
                    dateOfArrival: Date.now()
                },
                actions: [
                    {
                        action: 'open',
                        title: 'Open App',
                        icon: '/manifest.json'
                    },
                    {
                        action: 'complete',
                        title: 'Mark Complete',
                        icon: '/manifest.json'
                    },
                    {
                        action: 'close',
                        title: 'Close',
                        icon: '/manifest.json'
                    }
                ]
            });
            
            return true;
        } catch (error) {
            console.error('Failed to send local notification:', error);
            return false;
        }
    }

    // Send daily chore reminder
    async sendDailyReminder() {
        return await this.sendLocalNotification(
            '🌟 Daily Chore Reminder',
            'Time to check off today\'s chores! Click to open ChoreStar.',
            { type: 'daily_reminder', url: '/' }
        );
    }

    // Send weekly progress report
    async sendWeeklyReport(progress) {
        return await this.sendLocalNotification(
            '📊 Weekly Progress Report',
            `Great job this week! Your family completed ${progress.completed} out of ${progress.total} chores.`,
            { type: 'weekly_report', url: '/' }
        );
    }

    // Send payment confirmation
    async sendPaymentConfirmation() {
        return await this.sendLocalNotification(
            '✅ Payment Successful!',
            'Welcome to ChoreStar Premium! You now have unlimited children and advanced features.',
            { type: 'payment_success', url: '/' }
        );
    }

    // Send welcome notification
    async sendWelcomeNotification(familyName) {
        return await this.sendLocalNotification(
            '🏠 Welcome to ChoreStar!',
            `Welcome ${familyName}! Start by adding your first child and creating some chores.`,
            { type: 'welcome', url: '/' }
        );
    }

    // Convert VAPID key to Uint8Array
    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    // Schedule daily reminders
    scheduleDailyReminder() {
        if (!this.isEnabled()) return;

        // Check if it's 6 PM
        const now = new Date();
        const reminderTime = new Date();
        reminderTime.setHours(18, 0, 0, 0); // 6 PM

        if (now.getHours() === 18 && now.getMinutes() === 0) {
            this.sendDailyReminder();
        }
    }

    // Schedule weekly reports
    scheduleWeeklyReport() {
        if (!this.isEnabled()) return;

        // Check if it's Sunday at 9 AM
        const now = new Date();
        if (now.getDay() === 0 && now.getHours() === 9 && now.getMinutes() === 0) {
            // Calculate weekly progress
            const progress = {
                completed: Math.floor(Math.random() * 20) + 10, // Mock data
                total: 25
            };
            this.sendWeeklyReport(progress);
        }
    }
}

// Global notification manager
window.notificationManager = new NotificationManager(); 