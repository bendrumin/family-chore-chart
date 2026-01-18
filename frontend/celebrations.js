// Celebration Effects for ChoreStar
// Adds confetti, animations, and easter eggs

class CelebrationManager {
    constructor() {
        this.konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
        this.konamiSequence = [];
        this.konamiTimeout = null;
        this.init();
    }

    init() {
        this.initializeKonamiCode();
        this.loadConfettiScript();
    }

    loadConfettiScript() {
        // Load canvas-confetti from CDN if not already loaded
        if (typeof window.confetti === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.4/dist/confetti.browser.min.js';
            script.async = true;
            document.head.appendChild(script);
        }
    }

    // ==========================================
    // KONAMI CODE EASTER EGG
    // ==========================================
    initializeKonamiCode() {
        document.addEventListener('keydown', (e) => {
            // Reset sequence if too much time passes
            if (this.konamiTimeout) {
                clearTimeout(this.konamiTimeout);
            }
            this.konamiTimeout = setTimeout(() => {
                this.konamiSequence = [];
            }, 3000);

            // Add key to sequence
            this.konamiSequence.push(e.key);

            // Keep only last 10 keys
            if (this.konamiSequence.length > 10) {
                this.konamiSequence.shift();
            }

            // Check if sequence matches Konami code
            if (this.konamiSequence.length === this.konamiCode.length) {
                const matches = this.konamiSequence.every((key, index) => 
                    key.toLowerCase() === this.konamiCode[index].toLowerCase()
                );

                if (matches) {
                    this.triggerKonamiEasterEgg();
                    this.konamiSequence = [];
                }
            }
        });
    }

    triggerKonamiEasterEgg() {
        // Epic confetti celebration
        this.celebrateWithConfetti('epic');
        
        // Show special message
        this.showEasterEggMessage();
        
        // Unlock special rainbow theme temporarily
        this.activateRainbowTheme();
        
        // Track analytics
        if (window.analytics) {
            window.analytics.trackEngagement('konami_code_activated', {
                feature: 'easter_egg',
                type: 'konami_code'
            });
        }
    }

    showEasterEggMessage() {
        const message = document.createElement('div');
        message.className = 'easter-egg-message';
        message.innerHTML = `
            <div class="easter-egg-content">
                <div class="easter-egg-icon">🎉✨🌈</div>
                <h2>Easter Egg Unlocked!</h2>
                <p>You found the secret Konami code! Enjoy the rainbow theme!</p>
                <button class="btn btn-primary" onclick="this.parentElement.parentElement.remove()">Awesome!</button>
            </div>
        `;
        document.body.appendChild(message);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (message.parentElement) {
                message.remove();
            }
        }, 5000);
    }

    activateRainbowTheme() {
        // Add rainbow theme class
        document.body.classList.add('rainbow-theme');
        
        // Remove after 30 seconds
        setTimeout(() => {
            document.body.classList.remove('rainbow-theme');
        }, 30000);
    }

    // ==========================================
    // CONFETTI CELEBRATIONS
    // ==========================================
    celebrateWithConfetti(type = 'normal') {
        if (typeof window.confetti === 'undefined') {
            // Fallback if confetti not loaded
            console.log('Confetti celebration! 🎉');
            return;
        }

        const confettiConfig = {
            normal: {
                particleCount: 50,
                spread: 70,
                origin: { y: 0.6 }
            },
            epic: {
                particleCount: 200,
                spread: 100,
                origin: { y: 0.6 },
                colors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff']
            },
            achievement: {
                particleCount: 100,
                spread: 80,
                origin: { y: 0.5 },
                colors: ['#fbbf24', '#f59e0b', '#d97706']
            },
            streak: {
                particleCount: 75,
                spread: 60,
                origin: { y: 0.6 },
                colors: ['#ef4444', '#f97316', '#f59e0b']
            },
            perfect: {
                particleCount: 150,
                spread: 90,
                origin: { y: 0.5 },
                colors: ['#8b5cf6', '#a78bfa', '#c4b5fd']
            }
        };

        const config = confettiConfig[type] || confettiConfig.normal;
        
        // Fire confetti
        window.confetti(config);
        
        // For epic celebrations, fire multiple bursts
        if (type === 'epic') {
            setTimeout(() => window.confetti({ ...config, angle: 60 }), 250);
            setTimeout(() => window.confetti({ ...config, angle: 120 }), 500);
        }
    }

    celebrateAchievement(achievementName) {
        this.celebrateWithConfetti('achievement');
        this.showAchievementToast(achievementName);
    }

    celebrateStreak(streakDays) {
        this.celebrateWithConfetti('streak');
        this.showStreakToast(streakDays);
    }

    celebratePerfectWeek() {
        this.celebrateWithConfetti('perfect');
        this.showPerfectWeekToast();
    }

    celebrateChoreCompletion(childName, choreName) {
        // Light celebration for regular completions
        if (typeof window.confetti !== 'undefined') {
            window.confetti({
                particleCount: 30,
                spread: 50,
                origin: { y: 0.8 },
                colors: ['#10b981', '#34d399']
            });
        }
    }

    // ==========================================
    // TOAST NOTIFICATIONS
    // ==========================================
    showAchievementToast(achievementName) {
        if (window.app && typeof window.app.showToast === 'function') {
            window.app.showToast(`🏆 Achievement Unlocked: ${achievementName}!`, 'success', 5000);
        }
    }

    showStreakToast(days) {
        if (window.app && typeof window.app.showToast === 'function') {
            window.app.showToast(`🔥 ${days}-Day Streak! Keep it up!`, 'success', 4000);
        }
    }

    showPerfectWeekToast() {
        if (window.app && typeof window.app.showToast === 'function') {
            window.app.showToast(`⭐ Perfect Week! All chores completed!`, 'success', 5000);
        }
    }
}

// Initialize celebrations
if (typeof window !== 'undefined') {
    window.celebrationManager = new CelebrationManager();
}
