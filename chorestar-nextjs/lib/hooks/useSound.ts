'use client';

import { useCallback, useRef, useState, useEffect } from 'react';

export function useSound() {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioContextRef = useRef<{ [key: string]: HTMLAudioElement }>({});

  // Load sound preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('chorestar-sound-enabled');
    if (saved !== null) {
      setSoundEnabled(saved === 'true');
    }
  }, []);

  // Save sound preference
  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const newValue = !prev;
      localStorage.setItem('chorestar-sound-enabled', String(newValue));
      return newValue;
    });
  }, []);

  // Preload a sound
  const preloadSound = useCallback((key: string, src: string) => {
    if (!audioContextRef.current[key]) {
      const audio = new Audio(src);
      audio.preload = 'auto';
      audioContextRef.current[key] = audio;
    }
  }, []);

  // Play a sound
  const playSound = useCallback(
    (src: string, volume: number = 0.5) => {
      if (!soundEnabled) return;

      try {
        const audio = new Audio(src);
        audio.volume = volume;
        audio.play().catch((err) => {
          // iOS requires user interaction before playing audio
          console.warn('Audio play failed:', err.message);
        });
      } catch (err) {
        console.warn('Failed to create audio:', err);
      }
    },
    [soundEnabled]
  );

  // Specific sound effects
  const playStepComplete = useCallback(() => {
    playSound('/sounds/step-complete.mp3', 0.5);
  }, [playSound]);

  const playRoutineComplete = useCallback(() => {
    playSound('/sounds/routine-complete.mp3', 0.6);
  }, [playSound]);

  const playClick = useCallback(() => {
    playSound('/sounds/click.mp3', 0.3);
  }, [playSound]);

  const playError = useCallback(() => {
    playSound('/sounds/error.mp3', 0.4);
  }, [playSound]);

  return {
    soundEnabled,
    toggleSound,
    preloadSound,
    playSound,
    playStepComplete,
    playRoutineComplete,
    playClick,
    playError,
  };
}
