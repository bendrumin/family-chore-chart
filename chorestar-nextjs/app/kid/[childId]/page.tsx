'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Play, LogOut, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRoutines } from '@/lib/hooks/useRoutines';
import { ROUTINE_ICONS, type RoutineIconKey } from '@/lib/constants/routine-icons';

interface ChildData {
  id: string;
  name: string;
  avatar_color: string | null;
  avatar_url: string | null;
  avatar_file: string | null;
}

export default function KidDashboardPage({ params }: { params: Promise<{ childId: string }> }) {
  const { childId } = use(params);
  const router = useRouter();
  const [child, setChild] = useState<ChildData | null>(null);

  const { data: routines, isLoading } = useRoutines(childId);

  // Load child data from localStorage with expiry check
  useEffect(() => {
    const kidModeData = localStorage.getItem('kidMode');
    if (!kidModeData) {
      router.push('/kid-login');
      return;
    }

    try {
      const sessionData = JSON.parse(kidModeData);

      // Check if session has expired (8 hours)
      if (sessionData.timestamp && sessionData.expiresIn) {
        const now = Date.now();
        const sessionAge = now - sessionData.timestamp;

        if (sessionAge > sessionData.expiresIn) {
          // Session expired, clear and redirect
          localStorage.removeItem('kidMode');
          router.push('/kid-login?message=Session expired');
          return;
        }
      }

      const childData = sessionData.child || sessionData; // Support both new and old format
      if (childData.id !== childId) {
        router.push('/kid-login');
        return;
      }
      setChild(childData);
    } catch (error) {
      // Invalid session data, clear and redirect
      localStorage.removeItem('kidMode');
      router.push('/kid-login');
    }
  }, [childId, router]);

  const handleLogout = () => {
    localStorage.removeItem('kidMode');
    router.push('/kid-login');
  };

  const handlePlayRoutine = (routineId: string) => {
    router.push(`/kid/${childId}/routine/${routineId}`);
  };

  if (!child) {
    return (
      <div className="min-h-screen flex items-center justify-center kid-mode-bg">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="text-8xl"
        >
          ⭐
        </motion.div>
      </div>
    );
  }

  const activeRoutines = routines?.filter((r) => r.is_active) || [];

  return (
    <div className="min-h-screen kid-mode-bg p-4 md:p-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', duration: 0.6, bounce: 0.5 }}
        >
          {/* Avatar */}
          <div
            className="w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center text-5xl font-black text-white shadow-2xl"
            style={{
              backgroundColor: child.avatar_color || '#6366f1',
              backgroundImage: child.avatar_url || child.avatar_file ? `url(${child.avatar_url || child.avatar_file})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            {!child.avatar_url && !child.avatar_file && child.name.charAt(0).toUpperCase()}
          </div>

          {/* Welcome Message */}
          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-5xl md:text-6xl font-black text-white mb-2"
          >
            Hi, {child.name}! 👋
          </motion.h1>

          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-2xl text-white/80 font-bold"
          >
            Ready for your routines?
          </motion.p>
        </motion.div>

        {/* Logout Button */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-6">
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="text-white hover:bg-white/20 rounded-xl gap-2"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </Button>
        </motion.div>
      </div>

      {/* Routines Grid */}
      <div className="max-w-6xl mx-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="text-8xl"
            >
              ⭐
            </motion.div>
          </div>
        ) : activeRoutines.length === 0 ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center py-20"
          >
            <div className="text-8xl mb-4">📋</div>
            <h2 className="text-4xl font-black text-white mb-4">No Routines Yet</h2>
            <p className="text-xl text-white/80">Ask a grownup to add routines for you!</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeRoutines.map((routine, index) => {
              const IconComponent = ROUTINE_ICONS[routine.icon as RoutineIconKey]?.icon;
              // const completedToday = false; // TODO: Check completion status

              return (
                <motion.div
                  key={routine.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{
                    delay: 0.1 * index,
                    type: 'spring',
                    duration: 0.6,
                    bounce: 0.4,
                  }}
                >
                  <motion.button
                    whileHover={{ scale: 1.05, y: -5 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handlePlayRoutine(routine.id)}
                    className="w-full bg-white rounded-3xl p-8 shadow-2xl hover:shadow-3xl transition-all text-left relative overflow-hidden"
                  >
                    {/* Background Pattern */}
                    <div
                      className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10"
                      style={{
                        backgroundColor: routine.color,
                        transform: 'translate(30%, -30%)',
                      }}
                    />

                    {/* Icon */}
                    <div
                      className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4 relative z-10"
                      style={{
                        backgroundColor: `${routine.color}20`,
                      }}
                    >
                      {IconComponent && (
                        <IconComponent className="w-12 h-12" style={{ color: routine.color, strokeWidth: 2.5 }} />
                      )}
                    </div>

                    {/* Routine Name */}
                    <h3 className="text-3xl font-black mb-2 relative z-10" style={{ color: routine.color }}>
                      {routine.name}
                    </h3>

                    {/* Steps Count */}
                    <p className="text-gray-600 font-bold mb-4 relative z-10">
                      {routine.routine_steps?.length || 0} steps
                    </p>

                    {/* Play Button */}
                    <div className="flex items-center justify-between relative z-10">
                      <div
                        className="flex items-center gap-2 font-black text-lg"
                        style={{ color: routine.color }}
                      >
                        <Play className="w-6 h-6" fill={routine.color} />
                        Start
                      </div>

                      {/* Reward */}
                      <div className="bg-yellow-100 px-3 py-1 rounded-full">
                        <span className="text-yellow-700 font-black text-sm">+{routine.reward_cents}¢</span>
                      </div>
                    </div>

                    {/* Completed Badge */}
                    {/* {completedToday && (
                      <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full flex items-center gap-1 text-sm font-bold">
                        <CheckCircle2 className="w-4 h-4" />
                        Done!
                      </div>
                    )} */}
                  </motion.button>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Background Decorations */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-6xl opacity-10"
            initial={{
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
              y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1000),
            }}
            animate={{
              y: [null, Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1000)],
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
