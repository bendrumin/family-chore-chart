'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProgressDots } from '@/components/routines/progress-dots';
import { VisualTimer } from '@/components/routines/visual-timer';
import { CelebrationScreen } from '@/components/routines/celebration-screen';
import { useRoutine, useCompleteRoutine } from '@/lib/hooks/useRoutines';
import { useSound } from '@/lib/hooks/useSound';
import { ROUTINE_ICONS, type RoutineIconKey } from '@/lib/constants/routine-icons';

export default function RoutinePlayerPage({
  params,
}: {
  params: Promise<{ childId: string; routineId: string }>;
}) {
  const { childId, routineId } = use(params);
  const router = useRouter();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [showCelebration, setShowCelebration] = useState(false);
  const [completionData, setCompletionData] = useState<any>(null);

  const { data: routine, isLoading, error } = useRoutine(routineId);
  const completeMutation = useCompleteRoutine();
  const { playStepComplete, playRoutineComplete } = useSound();

  // Safety check: Verify child from kid mode session (localStorage for persistence)
  useEffect(() => {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('kidMode') : null;
    if (!raw) {
      router.push('/kid-login');
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      const familyCode = parsed.familyCode;
      const kidLoginPath = familyCode ? `/kid-login/${familyCode}` : '/kid-login';
      if (parsed.child?.id !== childId) {
        router.push(kidLoginPath);
        return;
      }
      // Check expiry
      const age = Date.now() - (parsed.timestamp || 0);
      if (age > (parsed.expiresIn || 8 * 60 * 60 * 1000)) {
        localStorage.removeItem('kidMode');
        router.push(familyCode ? `${kidLoginPath}?message=Session expired` : '/kid-login?message=Session expired');
        return;
      }
    } catch {
      router.push('/kid-login');
    }
  }, [childId, router]);

  if (isLoading) {
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

  if (error || !routine) {
    return (
      <div className="min-h-screen flex items-center justify-center kid-mode-bg text-white text-center p-4">
        <div>
          <div className="text-8xl mb-4">😕</div>
          <h1 className="text-3xl font-bold mb-4">Oops! Routine not found</h1>
          <Button onClick={() => router.push(`/kid/${childId}`)} className="kid-button">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const steps = routine.routine_steps || [];
  const currentStep = steps[currentStepIndex];

  if (!currentStep && !showCelebration) {
    // No steps, go back
    router.push(`/kid/${childId}`);
    return null;
  }

  const handleStepComplete = () => {
    playStepComplete();

    if (currentStepIndex < steps.length - 1) {
      // Move to next step
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      // Last step completed - show celebration
      const endTime = Date.now();
      const durationSeconds = Math.floor((endTime - startTime) / 1000);

      playRoutineComplete();

      // Mark routine as complete (include kidToken for auth when parent not logged in)
      const kidModeRaw = typeof window !== 'undefined' ? localStorage.getItem('kidMode') : null;
      const kidMode = kidModeRaw ? (() => { try { return JSON.parse(kidModeRaw); } catch { return null; } })() : null;
      completeMutation.mutate(
        {
          routineId,
          childId,
          stepsCompleted: steps.length,
          stepsTotal: steps.length,
          durationSeconds,
          kidToken: kidMode?.kidToken,
        },
        {
          onSuccess: (data) => {
            setCompletionData({
              pointsEarned: data.pointsEarned || routine.reward_cents,
              duration: durationSeconds,
            });
            setShowCelebration(true);
          },
        }
      );
    }
  };

  const handleExit = () => {
    if (confirm('Are you sure you want to exit? Your progress will be lost.')) {
      router.push(`/kid/${childId}`);
    }
  };

  if (showCelebration && completionData) {
    return (
      <CelebrationScreen
        routineName={routine.name}
        pointsEarned={completionData.pointsEarned}
        totalSteps={steps.length}
        duration={completionData.duration}
        onContinue={() => router.push(`/kid/${childId}`)}
        color={routine.color}
      />
    );
  }

  const IconComponent = ROUTINE_ICONS[currentStep.icon as RoutineIconKey]?.icon;

  return (
    <div className="min-h-screen flex flex-col kid-mode-bg">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleExit}
          className="text-white hover:bg-white/20 rounded-xl"
        >
          <X className="w-6 h-6" />
        </Button>

        <ProgressDots currentStep={currentStepIndex} totalSteps={steps.length} color={routine.color} />

        <div className="w-10" /> {/* Spacer for centering */}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStepIndex}
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: -50 }}
            transition={{ type: 'spring', duration: 0.6, bounce: 0.4 }}
            className="w-full max-w-2xl text-center"
          >
            {/* Step Icon */}
            <motion.div
              animate={{
                scale: [1, 1.05, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="mb-8"
            >
              <div
                className="w-48 h-48 mx-auto rounded-full flex items-center justify-center shadow-2xl"
                style={{
                  backgroundColor: `${routine.color}20`,
                  border: `8px solid ${routine.color}40`,
                }}
              >
                {IconComponent && (
                  <IconComponent className="w-28 h-28" style={{ color: routine.color, strokeWidth: 2.5 }} />
                )}
              </div>
            </motion.div>

            {/* Step Title */}
            <h1 className="text-5xl md:text-6xl font-black text-white mb-4 px-4">{currentStep.title}</h1>

            {/* Step Description */}
            {currentStep.description && (
              <p className="text-2xl text-white/80 mb-8 px-4">{currentStep.description}</p>
            )}

            {/* Timer (if step has duration) */}
            {currentStep.duration_seconds && (
              <div className="mb-8">
                <VisualTimer
                  durationSeconds={currentStep.duration_seconds}
                  color={routine.color}
                  autoStart={true}
                />
              </div>
            )}

            {/* Done Button */}
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={handleStepComplete}
                className="kid-button w-full max-w-md text-4xl font-black rounded-3xl shadow-2xl"
                style={{ backgroundColor: routine.color }}
                disabled={completeMutation.isPending}
              >
                {completeMutation.isPending
                  ? '✨ Saving...'
                  : currentStepIndex === steps.length - 1
                  ? '🎉 Finish!'
                  : '✓ Done!'}
              </Button>
            </motion.div>

            {/* Step Counter */}
            <div className="mt-8 text-white/60 text-xl font-bold">
              Step {currentStepIndex + 1} of {steps.length}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Background Decorations */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-6xl opacity-10"
            initial={{
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
              y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1000),
            }}
            animate={{
              y: [null, (Math.random() - 0.5) * 200],
              x: [null, (Math.random() - 0.5) * 200],
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
