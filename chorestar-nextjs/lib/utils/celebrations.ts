// Celebration utilities for React version

const KONAMI_CODE = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'b',
  'a',
]

export class CelebrationManager {
  private konamiSequence: string[] = []
  private konamiTimeout: NodeJS.Timeout | null = null

  constructor() {
    this.initializeKonamiCode()
  }

  private initializeKonamiCode() {
    if (typeof window === 'undefined') return

    window.addEventListener('keydown', (e) => {
      // Reset sequence if too much time passes
      if (this.konamiTimeout) {
        clearTimeout(this.konamiTimeout)
      }
      this.konamiTimeout = setTimeout(() => {
        this.konamiSequence = []
      }, 3000)

      // Add key to sequence
      this.konamiSequence.push(e.key)

      // Keep only last 10 keys
      if (this.konamiSequence.length > 10) {
        this.konamiSequence.shift()
      }

      // Check if sequence matches Konami code
      if (this.konamiSequence.length === KONAMI_CODE.length) {
        const matches = this.konamiSequence.every(
          (key, index) => key.toLowerCase() === KONAMI_CODE[index].toLowerCase()
        )

        if (matches) {
          this.triggerKonamiEasterEgg()
          this.konamiSequence = []
        }
      }
    })
  }

  private triggerKonamiEasterEgg() {
    this.celebrateWithConfetti('epic')
    this.activateRainbowTheme()
  }

  private activateRainbowTheme() {
    if (typeof document === 'undefined') return
    document.body.classList.add('rainbow-theme')
    setTimeout(() => {
      document.body.classList.remove('rainbow-theme')
    }, 30000)
  }

  celebrateWithConfetti(type: 'normal' | 'epic' | 'achievement' | 'streak' | 'perfect' = 'normal') {
    if (typeof window === 'undefined' || typeof window.confetti === 'undefined') {
      console.log('Confetti celebration! 🎉')
      return
    }

    const confettiConfig = {
      normal: {
        particleCount: 50,
        spread: 70,
        origin: { y: 0.6 },
      },
      epic: {
        particleCount: 200,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'],
      },
      achievement: {
        particleCount: 100,
        spread: 80,
        origin: { y: 0.5 },
        colors: ['#fbbf24', '#f59e0b', '#d97706'],
      },
      streak: {
        particleCount: 75,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#ef4444', '#f97316', '#f59e0b'],
      },
      perfect: {
        particleCount: 150,
        spread: 90,
        origin: { y: 0.5 },
        colors: ['#8b5cf6', '#a78bfa', '#c4b5fd'],
      },
    }

    const config = confettiConfig[type] || confettiConfig.normal

    // Fire confetti
    window.confetti(config as any)

    // For epic celebrations, fire multiple bursts
    if (type === 'epic') {
      setTimeout(() => window.confetti({ ...config, angle: 60 } as any), 250)
      setTimeout(() => window.confetti({ ...config, angle: 120 } as any), 500)
    }
  }

  celebrateAchievement(achievementName: string) {
    this.celebrateWithConfetti('achievement')
  }

  celebrateStreak(streakDays: number) {
    this.celebrateWithConfetti('streak')
  }

  celebratePerfectWeek() {
    this.celebrateWithConfetti('perfect')
  }

  celebrateChoreCompletion(childName: string, choreName: string) {
    if (typeof window !== 'undefined' && typeof window.confetti !== 'undefined') {
      window.confetti({
        particleCount: 30,
        spread: 50,
        origin: { y: 0.8 },
        colors: ['#10b981', '#34d399'],
      } as any)
    }
  }
}

// Singleton instance
let celebrationManagerInstance: CelebrationManager | null = null

export function getCelebrationManager(): CelebrationManager {
  if (typeof window === 'undefined') {
    // Server-side: return a mock that satisfies the public interface
    return {
      celebrateWithConfetti: () => {},
      celebrateAchievement: () => {},
      celebrateStreak: () => {},
      celebratePerfectWeek: () => {},
      celebrateChoreCompletion: () => {},
    } as unknown as CelebrationManager
  }

  if (!celebrationManagerInstance) {
    celebrationManagerInstance = new CelebrationManager()
  }
  return celebrationManagerInstance
}
