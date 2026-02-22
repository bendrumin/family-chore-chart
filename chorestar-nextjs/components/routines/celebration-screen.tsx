'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Trophy, Star, Home, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CelebrationScreenProps {
  routineName: string;
  pointsEarned: number;
  totalSteps: number;
  duration?: number; // in seconds
  onContinue: () => void;
  color?: string;
}

export function CelebrationScreen({
  routineName,
  pointsEarned,
  totalSteps,
  duration,
  onContinue,
  color = '#6366f1',
}: CelebrationScreenProps) {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // Trigger confetti
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(function () {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }

      const particleCount = 50 * (timeLeft / duration);

      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: [color, '#fbbf24', '#ef4444', '#10b981', '#8b5cf6'],
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: [color, '#fbbf24', '#ef4444', '#10b981', '#8b5cf6'],
      });
    }, 250);

    // Show content after a brief delay
    setTimeout(() => setShowContent(true), 300);

    return () => clearInterval(interval);
  }, [color]);

  const formatDuration = (seconds?: number) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 kid-mode-bg">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={showContent ? { scale: 1, opacity: 1 } : {}}
        transition={{ type: 'spring', duration: 0.8, bounce: 0.5 }}
        className="w-full max-w-2xl text-center"
      >
        {/* Trophy Animation */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 10, -10, 0],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            repeatDelay: 2,
          }}
          className="text-9xl mb-6 inline-block"
        >
          🎉
        </motion.div>

        {/* Main Message */}
        <motion.h1
          initial={{ y: 30, opacity: 0 }}
          animate={showContent ? { y: 0, opacity: 1 } : {}}
          transition={{ delay: 0.3 }}
          className="text-6xl md:text-7xl font-black text-white mb-4"
        >
          You Did It!
        </motion.h1>

        <motion.p
          initial={{ y: 30, opacity: 0 }}
          animate={showContent ? { y: 0, opacity: 1 } : {}}
          transition={{ delay: 0.4 }}
          className="text-3xl font-bold text-white mb-8"
        >
          {routineName} Complete!
        </motion.p>

        {/* Stats Cards */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={showContent ? { y: 0, opacity: 1 } : {}}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
        >
          {/* Points Earned */}
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-6 shadow-2xl">
            <Sparkles className="w-12 h-12 mx-auto mb-3 text-yellow-500" />
            <div className="text-5xl font-black mb-2" style={{ color }}>
              +{pointsEarned}¢
            </div>
            <div className="text-sm font-bold text-gray-600">Points Earned</div>
          </div>

          {/* Steps Completed */}
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-6 shadow-2xl">
            <Trophy className="w-12 h-12 mx-auto mb-3 text-green-500" />
            <div className="text-5xl font-black text-green-600 mb-2">{totalSteps}</div>
            <div className="text-sm font-bold text-gray-600">Steps Done</div>
          </div>

          {/* Time Taken */}
          {duration && (
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-6 shadow-2xl">
              <Star className="w-12 h-12 mx-auto mb-3 text-blue-500" />
              <div className="text-5xl font-black text-blue-600 mb-2">{formatDuration(duration)}</div>
              <div className="text-sm font-bold text-gray-600">Time</div>
            </div>
          )}
        </motion.div>

        {/* Encouraging Messages */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={showContent ? { y: 0, opacity: 1 } : {}}
          transition={{ delay: 0.6 }}
          className="mb-8"
        >
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 border-2 border-white/30">
            <p className="text-2xl font-bold text-white">
              {[
                '🌟 Amazing work!',
                '💪 You\'re a superstar!',
                '🎯 Great job!',
                '✨ Fantastic!',
                '🏆 You rock!',
                '🚀 Awesome!',
              ][Math.floor(Math.random() * 6)]}
            </p>
          </div>
        </motion.div>

        {/* Action Button */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={showContent ? { y: 0, opacity: 1 } : {}}
          transition={{ delay: 0.7 }}
        >
          <Button
            onClick={onContinue}
            className="kid-button w-full max-w-md text-2xl font-black rounded-2xl shadow-2xl"
            style={{ backgroundColor: color }}
          >
            <Home className="w-8 h-8 mr-3" />
            Back to Home
          </Button>
        </motion.div>

        {/* Floating Stars Background */}
        <div className="fixed inset-0 pointer-events-none -z-10">
          {[...Array(30)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute text-5xl"
              initial={{
                x: Math.random() * window.innerWidth,
                y: window.innerHeight + 100,
                opacity: 0,
              }}
              animate={{
                y: -100,
                opacity: [0, 1, 1, 0],
                rotate: [0, 360],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                delay: Math.random() * 2,
                repeat: Infinity,
                ease: 'linear',
              }}
            >
              {['⭐', '✨', '🌟', '💫', '🎊'][Math.floor(Math.random() * 5)]}
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
