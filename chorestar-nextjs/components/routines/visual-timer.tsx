'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';

interface VisualTimerProps {
  durationSeconds: number;
  onComplete?: () => void;
  autoStart?: boolean;
  color?: string;
}

export function VisualTimer({
  durationSeconds,
  onComplete,
  autoStart = true,
  color = '#6366f1',
}: VisualTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds);
  const [isRunning, setIsRunning] = useState(autoStart);

  useEffect(() => {
    if (!isRunning || secondsLeft <= 0) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          onComplete?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, secondsLeft, onComplete]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const progress = ((durationSeconds - secondsLeft) / durationSeconds) * 100;

  // Color based on time remaining
  const getColor = () => {
    const percentage = (secondsLeft / durationSeconds) * 100;
    if (percentage > 50) return color;
    if (percentage > 25) return '#fbbf24'; // Amber
    return '#ef4444'; // Red
  };

  const currentColor = getColor();

  return (
    <div className="flex flex-col items-center justify-center">
      {/* Circular Progress */}
      <div className="relative w-32 h-32 mb-4">
        <svg className="w-full h-full transform -rotate-90">
          {/* Background Circle */}
          <circle
            cx="64"
            cy="64"
            r="56"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-gray-200 dark:text-gray-700"
          />
          {/* Progress Circle */}
          <motion.circle
            cx="64"
            cy="64"
            r="56"
            stroke={currentColor}
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            initial={{ strokeDasharray: '0 352' }}
            animate={{
              strokeDasharray: `${(progress / 100) * 352} 352`,
            }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
          />
        </svg>

        {/* Time Display */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            key={secondsLeft}
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center"
          >
            <div className="text-3xl font-black" style={{ color: currentColor }}>
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Clock Icon Indicator */}
      <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: currentColor }}>
        <Clock className="w-4 h-4" />
        <span>
          {secondsLeft === 0 ? "Time's up!" : isRunning ? 'Running...' : 'Paused'}
        </span>
      </div>
    </div>
  );
}
