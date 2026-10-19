'use client';

import { use, useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { FloatingSparkles } from '@/components/kid/floating-sparkles';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProgressDots } from '@/components/routines/progress-dots';
import { VisualTimer } from '@/components/routines/visual-timer';
import { RoutineTimeBar } from '@/components/routines/routine-time-bar';
import { ReadAloudButton } from '@/components/routines/read-aloud-button';
import { useScreenWakeLock } from '@/lib/hooks/use-wake-lock';
import { CelebrationScreen } from '@/components/routines/celebration-screen';
import { useRoutine, useCompleteRoutine } from '@/lib/hooks/useRoutines';
import { useSound } from '@/lib/hooks/useSound';
import { ROUTINE_ICONS, type RoutineIconKey } from '@/lib/constants/routine-icons';
import { useKidT, useKidTemplateString, detectKidLocale } from '@/lib/i18n/kid';
import { speak, stopSpeaking, speechLangFor, speechTextFor } from '@/lib/routines/speech';
import { finishedEarlyBy } from '@/lib/routines/routine-timer';
import { createThrottledReporter } from '@/lib/routines/live-progress';
import { sendRoutineProgress, type ProgressReport } from '@/lib/routines/client';
import { toast } from 'sonner';

function readKidToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('kidMode');
    return raw ? JSON.parse(raw)?.kidToken ?? null : null;
  } catch {
    return null;
  }
}

export default function RoutinePlayerPage({
  params,
}: {
  params: Promise<{ childId: string; routineId: string }>;
}) {
  const { childId, routineId } = use(params);
  const router = useRouter();
  const t = useKidT()
  const tpl = useKidTemplateString();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [startTime] = useState<number>(() => Date.now());
  const [showCelebration, setShowCelebration] = useState(false);
  const [completionData, setCompletionData] = useState<any>(null);
  const [kidLocale, setKidLocale] = useState<string>('en');
  const finishedRef = useRef(false);

  const { data: routine, isLoading, error } = useRoutine(routineId);
  const completeMutation = useCompleteRoutine();
  const { playStepComplete, playRoutineComplete } = useSound();
  // A bedtime routine with a two-minute teeth timer outlives most screen
  // timeouts; hold the screen on until the celebration.
  useScreenWakeLock(!showCelebration);

  useEffect(() => setKidLocale(detectKidLocale()), []);

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

  const steps = routine?.routine_steps || [];
  const currentStep = steps[currentStepIndex];

  // --- Live parent view: report the step (throttled, fire and forget) ------
  const reporterRef = useRef<ReturnType<typeof createThrottledReporter<ProgressReport>> | null>(null);
  if (!reporterRef.current) {
    reporterRef.current = createThrottledReporter<ProgressReport>((report) =>
      sendRoutineProgress(routineId, childId, report, readKidToken())
    );
  }
  useEffect(() => {
    if (!routine || !currentStep || showCelebration) return;
    reporterRef.current?.report({
      stepIndex: currentStepIndex,
      stepsTotal: steps.length,
      stepTitle: currentStep.title,
    });
  }, [routine, currentStep, currentStepIndex, steps.length, showCelebration]);
  // Leaving mid-routine (back button, closing kid mode) clears the live row.
  useEffect(() => {
    const reporter = reporterRef.current;
    return () => {
      stopSpeaking();
      if (!finishedRef.current) {
        reporter?.cancel();
        sendRoutineProgress(routineId, childId, { clear: true }, readKidToken());
      }
    };
  }, [routineId, childId]);

  // --- Read aloud (free) ----------------------------------------------------
  const speakStep = useCallback(() => {
    if (!currentStep) return;
    const shown = tpl(currentStep.title);
    const lang = speechLangFor({
      familyLanguage: routine?.family_language ?? null,
      kidLocale,
      localized: shown !== currentStep.title,
      deviceLanguage: typeof navigator !== 'undefined' ? navigator.language : null,
    });
    speak(speechTextFor(shown, currentStep.description), lang);
  }, [currentStep, tpl, routine?.family_language, kidLocale]);

  useEffect(() => {
    if (!routine?.auto_read_aloud || !currentStep || showCelebration) return;
    // Let the step animate in before speaking.
    const id = setTimeout(speakStep, 400);
    return () => clearTimeout(id);
  }, [routine?.auto_read_aloud, currentStep, showCelebration, speakStep]);

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
          <h1 className="text-3xl font-bold mb-4">{t('player.notFound')}</h1>
          <Button onClick={() => router.push(`/kid/${childId}`)} className="kid-button">
            {t('player.goBack')}
          </Button>
        </div>
      </div>
    );
  }

  if (!currentStep && !showCelebration) {
    // No steps, go back
    router.push(`/kid/${childId}`);
    return null;
  }

  // Finish-by is Premium; a value left on a lapsed family's routine is ignored.
  const targetSeconds = routine.family_premium ? routine.target_duration_seconds ?? null : null;

  const handleStepComplete = () => {
    playStepComplete();
    stopSpeaking();

    if (currentStepIndex < steps.length - 1) {
      // Move to next step
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      // Last step completed - show celebration
      const endTime = Date.now();
      const durationSeconds = Math.floor((endTime - startTime) / 1000);

      playRoutineComplete();

      // Mark routine as complete (include kidToken for auth when parent not logged in)
      completeMutation.mutate(
        {
          routineId,
          childId,
          stepsCompleted: steps.length,
          stepsTotal: steps.length,
          durationSeconds,
          kidToken: readKidToken() ?? undefined,
        },
        {
          onSuccess: (data) => {
            // /complete clears the live row server-side.
            finishedRef.current = true;
            reporterRef.current?.cancel();
            setCompletionData({
              pointsEarned: data.pointsEarned || routine.reward_cents,
              duration: durationSeconds,
              earlyBySeconds: finishedEarlyBy(durationSeconds, targetSeconds),
            });
            setShowCelebration(true);
          },
          onError: () => {
            // Never fail silently: tell the kid it didn't save so they can retry.
            // The mutation resets isPending, so the "Finish!" button re-enables.
            toast.error(t('player.saveFailed'), {
              duration: 6000,
            });
          },
        }
      );
    }
  };

  const handleExit = () => {
    if (confirm(t('player.exitConfirm'))) {
      router.push(`/kid/${childId}`);
    }
  };

  if (showCelebration && completionData) {
    return (
      <CelebrationScreen
        routineName={tpl(routine.name)}
        pointsEarned={completionData.pointsEarned}
        totalSteps={steps.length}
        duration={completionData.duration}
        earlyBySeconds={completionData.earlyBySeconds}
        onContinue={() => router.push(`/kid/${childId}`)}
        color={routine.color}
      />
    );
  }

  const IconComponent = ROUTINE_ICONS[currentStep.icon as RoutineIconKey]?.icon;
  const pictureUrl = currentStep.image_url ?? null;

  return (
    <div className="min-h-screen flex flex-col kid-mode-bg">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleExit}
          aria-label={t('player.goBack')}
          className="text-white hover:bg-white/20 rounded-xl"
        >
          <X className="w-6 h-6" />
        </Button>

        <ProgressDots currentStep={currentStepIndex} totalSteps={steps.length} color={routine.color} />

        <div className="w-10" /> {/* Spacer for centering */}
      </div>

      {/* Whole-routine finish-by bar (Premium) */}
      {targetSeconds ? <RoutineTimeBar startTime={startTime} targetSeconds={targetSeconds} /> : null}

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
            {/* Step picture (Premium) or icon */}
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
              {pictureUrl ? (
                <div className="relative w-64 h-64 sm:w-80 sm:h-80 mx-auto">
                  {/* Signed storage URL, shown big so pre-readers can follow along. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={pictureUrl}
                    alt={tpl(currentStep.title)}
                    className="w-full h-full rounded-[2.5rem] object-cover shadow-2xl bg-white"
                    style={{ border: `8px solid ${routine.color}` }}
                  />
                  {IconComponent && (
                    <div className="absolute -bottom-3 -right-3 w-16 h-16 rounded-full bg-white shadow-xl flex items-center justify-center">
                      <IconComponent className="w-9 h-9" style={{ color: routine.color, strokeWidth: 2.5 }} />
                    </div>
                  )}
                </div>
              ) : (
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
              )}
            </motion.div>

            {/* Step Title + read aloud (free) */}
            <div className="flex flex-wrap items-center justify-center gap-4 mb-4 px-4">
              <h1 className="text-5xl md:text-6xl font-black text-white">{tpl(currentStep.title)}</h1>
              <ReadAloudButton onSpeak={speakStep} label={t('player.readAloud')} color={routine.color} />
            </div>

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
                  ? t('player.saving')
                  : currentStepIndex === steps.length - 1
                  ? t('player.finish')
                  : t('player.done')}
              </Button>
            </motion.div>

            {/* Step Counter */}
            <div className="mt-8 text-white/60 text-xl font-bold">
              {t('player.stepOf', { current: currentStepIndex + 1, total: steps.length })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Background Decorations */}
      <FloatingSparkles count={15} drift="around" />
    </div>
  );
}
