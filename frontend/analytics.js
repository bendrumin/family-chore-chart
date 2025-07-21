// Analytics Helper for ChoreStar
class Analytics {
    constructor() {
        this.userId = null;
        this.userType = 'anonymous';
        this.subscriptionStatus = 'free';
        this.childrenCount = 0;
    }

    // Initialize analytics with user data
    init(userId, userType = 'user', subscriptionStatus = 'free', childrenCount = 0) {
        this.userId = userId;
        this.userType = userType;
        this.subscriptionStatus = subscriptionStatus;
        this.childrenCount = childrenCount;

        // Set user properties
        if (window.gtag) {
            gtag('config', 'G-746ST4RH2E', {
                user_id: userId,
                user_type: userType,
                subscription_status: subscriptionStatus,
                children_count: childrenCount
            });
        }
    }

    // Track page views
    trackPageView(pageName) {
        if (window.gtag) {
            gtag('event', 'page_view', {
                page_title: pageName,
                page_location: window.location.href,
                user_type: this.userType,
                subscription_status: this.subscriptionStatus
            });
        }
    }

    // Track user registration
    trackRegistration(email, familyName) {
        if (window.gtag) {
            gtag('event', 'sign_up', {
                method: 'email',
                user_type: 'new_user',
                family_name: familyName
            });
        }
    }

    // Track user login
    trackLogin(email) {
        if (window.gtag) {
            gtag('event', 'login', {
                method: 'email',
                user_type: this.userType
            });
        }
    }

    // Track child addition
    trackAddChild(childName, childAge) {
        if (window.gtag) {
            gtag('event', 'add_child', {
                child_name: childName,
                child_age: childAge,
                children_count: this.childrenCount + 1,
                user_type: this.userType,
                subscription_status: this.subscriptionStatus
            });
        }
    }

    // Track chore addition
    trackAddChore(choreName, childId) {
        if (window.gtag) {
            gtag('event', 'add_chore', {
                chore_name: choreName,
                child_id: childId,
                user_type: this.userType,
                subscription_status: this.subscriptionStatus
            });
        }
    }

    // Track chore completion
    trackChoreCompletion(choreName, childId, dayOfWeek) {
        if (window.gtag) {
            gtag('event', 'chore_completion', {
                chore_name: choreName,
                child_id: childId,
                day_of_week: dayOfWeek,
                user_type: this.userType,
                subscription_status: this.subscriptionStatus
            });
        }
    }

    // Track upgrade modal shown
    trackUpgradeModalShown() {
        if (window.gtag) {
            gtag('event', 'upgrade_modal_shown', {
                user_type: this.userType,
                subscription_status: this.subscriptionStatus,
                children_count: this.childrenCount
            });
        }
    }

    // Track payment initiation
    trackPaymentStart() {
        if (window.gtag) {
            gtag('event', 'begin_checkout', {
                currency: 'USD',
                value: 4.99,
                user_type: this.userType,
                subscription_status: this.subscriptionStatus
            });
        }
    }

    // Track successful payment
    trackPaymentSuccess() {
        if (window.gtag) {
            gtag('event', 'purchase', {
                currency: 'USD',
                value: 4.99,
                transaction_id: Date.now().toString(),
                user_type: this.userType,
                subscription_status: 'premium'
            });
        }
    }

    // Track payment cancellation
    trackPaymentCancel() {
        if (window.gtag) {
            gtag('event', 'payment_cancelled', {
                user_type: this.userType,
                subscription_status: this.subscriptionStatus
            });
        }
    }

    // Track app install prompt
    trackInstallPrompt() {
        if (window.gtag) {
            gtag('event', 'install_prompt', {
                user_type: this.userType,
                subscription_status: this.subscriptionStatus
            });
        }
    }

    // Track app installation
    trackAppInstall() {
        if (window.gtag) {
            gtag('event', 'app_install', {
                user_type: this.userType,
                subscription_status: this.subscriptionStatus
            });
        }
    }

    // Track settings changes
    trackSettingsChange(settingName, oldValue, newValue) {
        if (window.gtag) {
            gtag('event', 'settings_change', {
                setting_name: settingName,
                old_value: oldValue,
                new_value: newValue,
                user_type: this.userType,
                subscription_status: this.subscriptionStatus
            });
        }
    }

    // Track error events
    trackError(errorType, errorMessage) {
        if (window.gtag) {
            gtag('event', 'error', {
                error_type: errorType,
                error_message: errorMessage,
                user_type: this.userType,
                subscription_status: this.subscriptionStatus
            });
        }
    }

    // Track user engagement
    trackEngagement(action, details = {}) {
        if (window.gtag) {
            gtag('event', 'user_engagement', {
                action: action,
                ...details,
                user_type: this.userType,
                subscription_status: this.subscriptionStatus
            });
        }
    }
}

// Global analytics instance
window.analytics = new Analytics(); 