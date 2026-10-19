'use client';

import { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';
import { routineTimeStatus, formatClock } from '@/lib/routines/routine-timer';
import { useKidT } from '@/lib/i18n/kid';

/**
 * Whole-routine "finish by" countdown (Premium). A calm bar that shrinks as
 * time passes, beside the per-step timers. Deliberately no red, no alarm and
 * no fail state: past the target it just switches to encouragement, because
 * the point is momentum, not pressure.
 *
 * Kid pages keep their playful light style on the gradient background.
 */
export function RoutineTimeBar({ startTime, targetSeconds }: { startTime: number; targetSeconds: number }) {
  const t = useKidT();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const status = routineTimeStatus((now - startTime) / 1000, targetSeconds);
  const fill =
    status.phase === 'plenty' ? 'bg-white' : status.phase === 'some' ? 'bg-sky-200' : 'bg-amber-200';

  return (
    <div className="w-full max-w-xl mx-auto px-4" role="timer" aria-live="off">
      <div className="flex items-center justify-between text-white font-bold text-sm mb-1.5">
        <span className="flex items-center gap-1.5">
          <Timer className="w-4 h-4" aria-hidden="true" />
          {t('player.finishBy')}
        </span>
        <span aria-label={status.overTime ? t('player.keepGoing') : t('player.timeLeft', { time: formatClock(status.remainingSeconds) })}>
          {status.overTime ? t('player.keepGoing') : t('player.timeLeft', { time: formatClock(status.remainingSeconds) })}
        </span>
      </div>
      <div className="h-3 rounded-full bg-white/25 overflow-hidden">
        <div
          className={`h-full rounded-full ${fill} transition-[width] duration-1000 ease-linear motion-reduce:transition-none`}
          style={{ width: `${Math.max(status.overTime ? 0 : 2, status.fractionLeft * 100)}%` }}
        />
      </div>
    </div>
  );
}
