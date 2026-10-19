'use client';

import { useEffect, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { speechSupported } from '@/lib/routines/speech';

/**
 * Big speaker button for the routine player (free). Reads the step aloud via
 * the caller's `onSpeak` (browser SpeechSynthesis, on device). Hidden when the
 * browser can't speak, so a kid never taps a dead button.
 */
export function ReadAloudButton({ onSpeak, label, color }: { onSpeak: () => void; label: string; color: string }) {
  const [supported, setSupported] = useState(false);
  useEffect(() => setSupported(speechSupported()), []);
  if (!supported) return null;
  return (
    <button
      type="button"
      onClick={onSpeak}
      aria-label={label}
      title={label}
      className="flex-shrink-0 w-16 h-16 rounded-full bg-white shadow-xl flex items-center justify-center active:scale-95 transition-transform focus:outline-none focus-visible:ring-4 focus-visible:ring-white/70"
    >
      <Volume2 className="w-9 h-9" style={{ color }} strokeWidth={2.5} />
    </button>
  );
}
