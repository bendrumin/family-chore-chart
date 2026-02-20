'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Delete } from 'lucide-react';
import { useVerifyChildPin } from '@/lib/hooks/useChildPin';
import { useSound } from '@/lib/hooks/useSound';

export default function KidLoginWithFamilyPage({
  params,
}: {
  params: Promise<{ familyCode: string }>;
}) {
  const { familyCode } = use(params);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const router = useRouter();
  const verifyMutation = useVerifyChildPin(familyCode);
  const { playClick, playError, playRoutineComplete } = useSound();

  const handleNumberClick = (num: number) => {
    if (pin.length < 6) {
      playClick();
      setPin(pin + num);
      setError(null);
    }
  };

  const handleDelete = () => {
    if (pin.length > 0) {
      playClick();
      setPin(pin.slice(0, -1));
      setError(null);
    }
  };

  const handleClear = () => {
    playClick();
    setPin('');
    setError(null);
  };

  const verifyPin = async (pinToVerify: string) => {
    try {
      const result = await verifyMutation.mutateAsync(pinToVerify);
      if (result.success && result.child) {
        playRoutineComplete();
        const sessionData = {
          child: result.child,
          kidToken: result.kidToken,
          familyCode,
          timestamp: Date.now(),
          expiresIn: 8 * 60 * 60 * 1000,
        };
        localStorage.setItem('kidMode', JSON.stringify(sessionData));
        router.push(`/kid/${result.child.id}`);
      }
    } catch (err: any) {
      playError();
      setError(err?.message?.includes('Invalid family code') ? 'Wrong link. Get your link from your parent.' : 'Oops! Try again');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      setPin('');
    }
  };

  useEffect(() => {
    if (pin.length >= 4 && pin.length <= 6) {
      const pinToVerify = pin;
      const timer = setTimeout(() => verifyPin(pinToVerify), 300);
      return () => clearTimeout(timer);
    }
  }, [pin]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 kid-mode-bg">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center mb-8"
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            className="text-8xl mb-4"
          >
            {error ? '😅' : '👋'}
          </motion.div>
          <h1 className="text-4xl font-black text-white mb-2">
            {error ? 'Oops!' : 'Welcome!'}
          </h1>
          <p className="text-xl text-white/90">
            {error ? error : 'Enter your 4-6 digit PIN'}
          </p>
        </motion.div>

        <motion.div
          animate={isShaking ? { x: [-10, 10, -10, 10, 0] } : {}}
          transition={{ duration: 0.5 }}
          className="flex justify-center gap-4 mb-12"
        >
          {[0, 1, 2, 3].map((index) => (
            <motion.div
              key={index}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className={`w-5 h-5 rounded-full transition-all duration-300 ${
                index < pin.length
                  ? 'bg-white scale-110 shadow-lg shadow-white/50'
                  : 'bg-white/30 border-2 border-white/50'
              }`}
            />
          ))}
        </motion.div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <motion.button
              key={num}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleNumberClick(num)}
              className="kid-button aspect-square rounded-2xl bg-white text-4xl font-black text-purple-600 shadow-lg hover:shadow-xl transition-shadow"
            >
              {num}
            </motion.button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleClear}
            className="kid-button aspect-square rounded-2xl bg-red-500 text-white text-xl font-bold shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center"
          >
            Clear
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleNumberClick(0)}
            className="kid-button aspect-square rounded-2xl bg-white text-4xl font-black text-purple-600 shadow-lg hover:shadow-xl transition-shadow"
          >
            0
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleDelete}
            className="kid-button aspect-square rounded-2xl bg-orange-500 text-white shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center"
          >
            <Delete className="w-10 h-10" />
          </motion.button>
        </div>

        <AnimatePresence>
          {verifyMutation.isPending && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center mt-8 text-white text-lg font-bold"
            >
              Checking... ✨
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          onClick={() => router.push('/kid-login')}
          className="mt-8 text-white/70 hover:text-white text-sm font-semibold mx-auto block"
        >
          ← Different family? Enter code
        </motion.button>
      </div>

      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-6xl opacity-10"
            initial={{
              x: Math.random() * 1000,
              y: Math.random() * 1000,
            }}
            animate={{
              y: [null, Math.random() * 1000],
              rotate: [0, 360],
            }}
            transition={{
              duration: 15 + Math.random() * 10,
              repeat: Infinity,
              ease: 'linear',
            }}
          >
            {['⭐', '✨', '🌟', '💫'][Math.floor(Math.random() * 4)]}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
