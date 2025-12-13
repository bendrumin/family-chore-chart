/**
 * Sound Effects Utility
 * Provides audio feedback for user actions
 */

interface SoundSettings {
  enabled: boolean
  volume: number // 0-100
}

class SoundManager {
  private settings: SoundSettings = {
    enabled: true,
    volume: 50,
  }

  private audioContext: AudioContext | null = null

  constructor() {
    // Load settings from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('chorestar_sound_settings')
      if (saved) {
        try {
          this.settings = { ...this.settings, ...JSON.parse(saved) }
        } catch (e) {
          console.warn('Failed to load sound settings:', e)
        }
      }
    }
  }

  /**
   * Initialize audio context (must be called after user interaction)
   */
  private initAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    return this.audioContext
  }

  /**
   * Update sound settings
   */
  updateSettings(settings: Partial<SoundSettings>) {
    this.settings = { ...this.settings, ...settings }
    if (typeof window !== 'undefined') {
      localStorage.setItem('chorestar_sound_settings', JSON.stringify(this.settings))
    }
  }

  /**
   * Get current settings
   */
  getSettings(): SoundSettings {
    return { ...this.settings }
  }

  /**
   * Play a sound effect
   */
  playSound(soundType: 'success' | 'error' | 'notification' | 'celebration' = 'success') {
    if (!this.settings.enabled) return

    try {
      const audioContext = this.initAudioContext()
      const volume = this.settings.volume / 100

      type SoundConfig = 
        | { frequency: number; duration: number }
        | { frequency: number; duration: number; pattern: number[] }

      const sounds: Record<string, SoundConfig> = {
        success: { frequency: 800, duration: 0.2 },
        error: { frequency: 400, duration: 0.3 },
        celebration: { frequency: 600, duration: 0.1, pattern: [600, 700, 800, 900] },
        notification: { frequency: 500, duration: 0.15 },
      }

      const sound = sounds[soundType]
      if (!sound) return

      // Type guard to check if sound has pattern
      if ('pattern' in sound && sound.pattern) {
        // Play pattern of sounds
        const patternSound = sound as { frequency: number; duration: number; pattern: number[] }
        patternSound.pattern.forEach((freq, index) => {
          setTimeout(() => {
            this.playTone(audioContext, freq, patternSound.duration, volume)
          }, index * 100)
        })
      } else {
        const simpleSound = sound as { frequency: number; duration: number }
        this.playTone(audioContext, simpleSound.frequency, simpleSound.duration, volume)
      }
    } catch (error) {
      // Silently fail if audio context is not available
      console.warn('Sound playback failed:', error)
    }
  }

  /**
   * Play a tone
   */
  private playTone(audioContext: AudioContext, frequency: number, duration: number, volume: number) {
    try {
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.value = frequency
      oscillator.type = 'sine'

      gainNode.gain.setValueAtTime(0, audioContext.currentTime)
      gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.01)
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + duration)
    } catch (error) {
      console.warn('Tone playback failed:', error)
    }
  }
}

// Export singleton instance
export const soundManager = new SoundManager()

// Export convenience functions
export const playSound = (type: 'success' | 'error' | 'notification' | 'celebration' = 'success') => {
  soundManager.playSound(type)
}

