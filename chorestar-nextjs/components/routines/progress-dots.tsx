'use client';

import { motion } from 'framer-motion';

interface ProgressDotsProps {
  currentStep: number;
  totalSteps: number;
  color?: string;
}

export function ProgressDots({ currentStep, totalSteps, color = '#6366f1' }: ProgressDotsProps) {
  return (
    <div className="flex items-center justify-center gap-2 py-4">
      {Array.from({ length: totalSteps }).map((_, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;

        return (
          <motion.div
            key={index}
            initial={{ scale: 0 }}
            animate={{
              scale: isCurrent ? [1, 1.2, 1] : 1,
              backgroundColor: isCompleted ? color : isCurrent ? `${color}80` : '#e5e7eb',
            }}
            transition={{
              scale: {
                duration: 0.5,
                repeat: isCurrent ? Infinity : 0,
                repeatDelay: 0.5,
              },
              backgroundColor: { duration: 0.3 },
            }}
            className={`rounded-full transition-all ${
              isCurrent ? 'w-4 h-4' : 'w-3 h-3'
            }`}
            style={{
              boxShadow: isCurrent ? `0 0 12px ${color}60` : 'none',
            }}
          />
        );
      })}
    </div>
  );
}
