'use client';

import { useCallback, useState, useEffect } from 'react';
import { soundManager } from '@/lib/utils/sound';

/**
 * Unified sound hook - reads from chorestar_sound_settings (Family tab)
 * and uses soundManager for Web Audio tone-based effects (no MP3 files required).
 */
export function useSound() {
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Load sound preference from chorestar_sound_settings (matches Family tab)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('chorestar_sound_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSoundEnabled(parsed.enabled !== false);
      } catch {
        // Use default
      }
    }
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const newValue = !prev;
      soundManager.updateSettings({ enabled: newValue });
      return newValue;
    });
  }, []);

  const playStepComplete = useCallback(() => {
    soundManager.playSound('success');
  }, []);

  const playRoutineComplete = useCallback(() => {
    soundManager.playSound('celebration');
  }, []);

  const playClick = useCallback(() => {
    soundManager.playSound('notification');
  }, []);

  const playError = useCallback(() => {
    soundManager.playSound('error');
  }, []);

  return {
    soundEnabled,
    toggleSound,
    playStepComplete,
    playRoutineComplete,
    playClick,
    playError,
  };
}
