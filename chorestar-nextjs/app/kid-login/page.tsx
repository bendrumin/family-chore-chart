'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function KidLoginPage() {
  const [familyCode, setFamilyCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = familyCode.trim().toLowerCase();
    if (!code) {
      setError('Please enter your family code');
      return;
    }
    setError(null);
    router.push(`/kid-login/${encodeURIComponent(code)}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 kid-mode-bg">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', duration: 0.6 }}
          className="text-center"
        >
          <div className="text-8xl mb-6">👋</div>
          <h1 className="text-4xl font-black text-white mb-2">Kid Login</h1>
          <p className="text-xl text-white mb-8">
            Enter your family code to get started
          </p>
          <p className="text-sm text-white/90 mb-6">
            Ask a parent for your family&apos;s kid login link. It looks like<br />
            <code className="bg-white/20 px-2 py-1 rounded">chorestar.app/kid-login/abc123</code>
          </p>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <div>
            <Label htmlFor="familyCode" className="text-white font-semibold">
              Family code
            </Label>
            <Input
              id="familyCode"
              type="text"
              value={familyCode}
              onChange={(e) => {
                setFamilyCode(e.target.value);
                setError(null);
              }}
              placeholder="e.g. abc12345"
              className="mt-2 h-14 text-lg font-mono bg-white/90"
              maxLength={12}
            />
            <div aria-live="polite" aria-atomic="true">
              {error && (
                <p role="alert" className="text-red-200 text-sm mt-2">{error}</p>
              )}
            </div>
          </div>
          <Button
            type="submit"
            variant="gradient"
            size="lg"
            className="w-full h-14 text-xl font-bold text-white"
          >
            Continue
          </Button>
        </motion.form>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8 text-center text-white/90 text-sm"
        >
          Parents: Get your family&apos;s link in Settings → Family
        </motion.p>

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
    </div>
  );
}
