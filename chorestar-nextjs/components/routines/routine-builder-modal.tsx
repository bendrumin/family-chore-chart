'use client';

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Sparkles, Plus, Trash2, GripVertical, Clock, DollarSign, Crown, Camera, X, Loader2, Volume2, Timer, Wand2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { openPremiumBilling } from '@/components/settings/premium-gate';
import { uploadStepPhoto, requestRoutineDraft } from '@/lib/routines/client';
import { targetMinutesToSeconds, suggestedTargetSeconds } from '@/lib/routines/routine-timer';
import { useEntitlements } from '@/lib/hooks/use-entitlements';
import { isPremium } from '@/lib/utils/subscription';
import { RoutineIconPicker } from './routine-icon-picker';
import { ROUTINE_TEMPLATES, ROUTINE_ICONS, type RoutineIconKey } from '@/lib/constants/routine-icons';
import { useCreateRoutine, useUpdateRoutine } from '@/lib/hooks/useRoutines';
import { playSound } from '@/lib/utils/sound';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface RoutineStep {
  id: string;
  title: string;
  description?: string;
  icon: RoutineIconKey;
  order_index: number;
  duration_seconds?: number;
  /** Picture step (Premium): storage path saved with the step. */
  image_path?: string | null;
  /** Signed preview URL for image_path (not saved). */
  image_url?: string | null;
}

interface RoutineBuilderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  childId: string;
  defaultRewardCents?: number;
  onSuccess: () => void;
  editRoutine?: {
    id: string;
    name: string;
    type: 'morning' | 'bedtime' | 'afterschool' | 'custom';
    icon: string;
    color: string;
    reward_cents: number;
    auto_read_aloud?: boolean;
    target_duration_seconds?: number | null;
    steps: RoutineStep[];
  };
}

/** Photo control on a step row: thumbnail + remove, a camera, or a crowned lock. */
function StepPhotoControl({
  step,
  index,
  canAddPhoto,
  showLocked,
  uploading,
  onPick,
  onRemove,
}: {
  step: RoutineStep;
  index: number;
  canAddPhoto: boolean;
  showLocked: boolean;
  uploading: boolean;
  onPick: () => void;
  onRemove: () => void;
}) {
  if (uploading) {
    return (
      <div className="flex-shrink-0 w-10 h-10 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center" aria-live="polite">
        <Loader2 className="w-4 h-4 animate-spin text-gray-500 dark:text-gray-400" aria-label="Uploading photo" />
      </div>
    );
  }
  if (step.image_path) {
    return (
      <div className="relative flex-shrink-0 w-10 h-10">
        {step.image_url ? (
          // Signed storage URL; next/image would need the bucket host allow-listed.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={step.image_url} alt={`Picture for step ${index + 1}`} className="w-10 h-10 rounded-lg object-cover border border-gray-200 dark:border-gray-700" />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <Camera className="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" />
          </div>
        )}
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove picture from step ${index + 1}`}
          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900 flex items-center justify-center shadow"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }
  if (canAddPhoto) {
    return (
      <button
        type="button"
        onClick={onPick}
        aria-label={`Add a picture to step ${index + 1}`}
        title="Add a picture (great for pre-readers)"
        className="flex-shrink-0 w-10 h-10 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-purple-400 hover:text-purple-600 dark:hover:border-purple-500 dark:hover:text-purple-300 flex items-center justify-center transition-colors"
      >
        <Camera className="w-4 h-4" />
      </button>
    );
  }
  if (showLocked) {
    return (
      <button
        type="button"
        onClick={() => openPremiumBilling('routine_photos')}
        aria-label="Picture steps are a Premium feature. Open Billing"
        title="Picture steps come with Premium"
        className="relative flex-shrink-0 w-10 h-10 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 flex items-center justify-center opacity-80 hover:opacity-100"
      >
        <Camera className="w-4 h-4" />
        <Crown className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 text-amber-500 dark:text-amber-400" aria-hidden="true" />
      </button>
    );
  }
  return null;
}

// Sortable Step Component
function SortableStep({
  step,
  index,
  onUpdate,
  onDelete,
  photo,
}: {
  step: RoutineStep;
  index: number;
  onUpdate: (updates: Partial<RoutineStep>) => void;
  onDelete: () => void;
  photo: {
    canAddPhoto: boolean;
    showLocked: boolean;
    uploading: boolean;
    onPick: () => void;
  };
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: step.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const IconComponent = ROUTINE_ICONS[step.icon]?.icon;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg"
    >
      {/* Drag Handle */}
      <button
        type="button"
        aria-label={`Reorder step ${index + 1}: ${step.title || 'untitled'}`}
        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-5 h-5" />
      </button>

      {/* Step Number */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 font-bold flex items-center justify-center text-sm">
        {index + 1}
      </div>

      {/* Step Icon (a picture replaces it in the player when there is one) */}
      <div className="hidden sm:block flex-shrink-0">
        {IconComponent && <IconComponent className="w-6 h-6 text-blue-600 dark:text-blue-400" />}
      </div>

      {/* Picture (Premium) */}
      <StepPhotoControl
        step={step}
        index={index}
        canAddPhoto={photo.canAddPhoto}
        showLocked={photo.showLocked}
        uploading={photo.uploading}
        onPick={photo.onPick}
        onRemove={() => onUpdate({ image_path: null, image_url: null })}
      />

      {/* Step Title Input */}
      <Input
        value={step.title}
        onChange={(e) => onUpdate({ title: e.target.value })}
        placeholder="Step name..."
        aria-label={`Step ${index + 1} name`}
        className="flex-1 min-w-0"
      />

      {/* Duration (optional) */}
      <div className="flex items-center gap-1">
        <Clock className="hidden sm:block w-4 h-4 text-gray-400 dark:text-gray-500" aria-hidden="true" />
        <Input
          type="number"
          value={step.duration_seconds ? Math.floor(step.duration_seconds / 60) : ''}
          onChange={(e) =>
            onUpdate({ duration_seconds: e.target.value ? parseInt(e.target.value) * 60 : undefined })
          }
          placeholder="min"
          aria-label={`Step ${index + 1} duration in minutes`}
          className="w-16 text-sm"
          min="0"
        />
      </div>

      {/* Delete Button */}
      <Button type="button" variant="ghost" size="sm" onClick={onDelete} aria-label={`Delete step ${index + 1}`} className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}

export function RoutineBuilderModal({
  open,
  onOpenChange,
  childId,
  defaultRewardCents = 7,
  onSuccess,
  editRoutine,
}: RoutineBuilderModalProps) {
  // The family's plan (co-parents share the owner's): unlocks the template library.
  const { tier, loading: planLoading } = useEntitlements();
  const familyIsPremium = isPremium(tier);
  // Locks only once the plan is known, never a crown that flickers away.
  const showLocks = !planLoading && !familyIsPremium;
  const [formData, setFormData] = useState({
    name: '',
    type: 'custom' as 'morning' | 'bedtime' | 'afterschool' | 'custom',
    icon: 'check' as RoutineIconKey,
    color: '#6366f1',
    reward_cents: defaultRewardCents,
  });

  const [steps, setSteps] = useState<RoutineStep[]>([]);
  const [showIconPicker, setShowIconPicker] = useState(false);

  // Kid-friendly helpers (migration 032)
  const [autoReadAloud, setAutoReadAloud] = useState(false);
  const [targetMinutes, setTargetMinutes] = useState('');

  // Picture steps: one hidden file input, pointed at a step by id.
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoForStep, setPhotoForStep] = useState<string | null>(null);
  const [uploadingStep, setUploadingStep] = useState<string | null>(null);

  // Build with AI
  const [aiGoal, setAiGoal] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);

  const createMutation = useCreateRoutine();
  const updateMutation = useUpdateRoutine();

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Set once the parent edits the reward, so a late default never overwrites it.
  const rewardTouched = useRef(false);

  // Load edit data
  useEffect(() => {
    if (editRoutine) {
      setFormData({
        name: editRoutine.name,
        type: editRoutine.type,
        icon: editRoutine.icon as RoutineIconKey,
        color: editRoutine.color,
        reward_cents: editRoutine.reward_cents,
      });
      setSteps(editRoutine.steps);
      setAutoReadAloud(!!editRoutine.auto_read_aloud);
      setTargetMinutes(editRoutine.target_duration_seconds ? String(Math.round(editRoutine.target_duration_seconds / 60)) : '');
    } else {
      // Reset form when modal opens for new routine
      setFormData({
        name: '',
        type: 'custom',
        icon: 'check',
        color: '#6366f1',
        reward_cents: defaultRewardCents,
      });
      setSteps([]);
      setAutoReadAloud(false);
      setTargetMinutes('');
    }
    setAiGoal('');
    setAiNote(null);
    rewardTouched.current = false;
    // Reset only when the modal opens or the routine being edited changes.
    // defaultRewardCents can arrive late (family settings load after the
    // dashboard) and must not wipe what the parent has typed; it is applied
    // by the effect below instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editRoutine, open]);

  // A late family default only fills the reward of a new, untouched routine.
  useEffect(() => {
    if (editRoutine || rewardTouched.current) return;
    setFormData((f) => ({ ...f, reward_cents: defaultRewardCents }));
  }, [defaultRewardCents, editRoutine]);

  const pickPhotoFor = (stepId: string) => {
    setPhotoForStep(stepId);
    fileInputRef.current?.click();
  };

  const handlePhotoChosen = async (file: File | undefined) => {
    const stepId = photoForStep;
    setPhotoForStep(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file || !stepId) return;
    setUploadingStep(stepId);
    const result = await uploadStepPhoto(file, childId);
    setUploadingStep(null);
    if (!result.ok) {
      if (result.premiumRequired) openPremiumBilling('routine_photos');
      else toast.error(result.error);
      return;
    }
    setSteps((prev) => prev.map((s) => (s.id === stepId ? { ...s, image_path: result.path, image_url: result.url } : s)));
  };

  const buildWithAI = async () => {
    if (planLoading) return;
    if (!familyIsPremium) {
      openPremiumBilling('ai_routine');
      return;
    }
    const goal = aiGoal.trim();
    if (goal.length < 3) {
      toast.error('Describe the routine in a few words first');
      return;
    }
    setAiBusy(true);
    const result = await requestRoutineDraft({ goal, childId, routineType: formData.type });
    setAiBusy(false);
    if (!result.ok) {
      if (result.premiumRequired) openPremiumBilling('ai_routine');
      else toast.error(result.error);
      return;
    }
    const { draft, source } = result;
    setFormData((prev) => ({ ...prev, name: draft.name, type: draft.type, icon: draft.icon, color: draft.color }));
    setSteps(
      draft.steps.map((step, index) => ({
        id: `temp-${Date.now()}-${index}`,
        title: step.title,
        icon: step.icon,
        order_index: index,
        duration_seconds: step.duration_seconds,
      }))
    );
    setAiNote(
      source === 'ai'
        ? draft.tip ?? 'Draft ready. Edit anything before saving.'
        : `The AI is resting, so we started you from a template. ${draft.tip ?? ''}`.trim()
    );
    playSound('success');
    toast.success(source === 'ai' ? 'Draft ready. Edit anything, then save.' : 'Started from a template. Edit anything, then save.');
  };

  // Load template
  const loadTemplate = (templateIndex: number) => {
    const template = ROUTINE_TEMPLATES[templateIndex];
    setFormData({
      ...formData,
      name: template.name,
      type: template.type,
      icon: template.icon,
      color: template.color,
    });
    setSteps(
      template.steps.map((step, index) => ({
        id: `temp-${Date.now()}-${index}`,
        title: step.title,
        description: step.description,
        icon: step.icon,
        order_index: index,
        duration_seconds: step.duration_seconds,
      }))
    );
    playSound('success');
    toast.success(`Loaded ${template.name} template!`);
  };

  // Add new step
  const addStep = () => {
    const newStep: RoutineStep = {
      id: `temp-${Date.now()}`,
      title: '',
      icon: 'check',
      order_index: steps.length,
    };
    setSteps([...steps, newStep]);
  };

  // Update step
  const updateStep = (index: number, updates: Partial<RoutineStep>) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], ...updates };
    setSteps(newSteps);
  };

  // Delete step
  const deleteStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSteps((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (steps.length === 0) {
      toast.error('Please add at least one step to the routine');
      return;
    }

    try {
      // Ensure steps have correct order_index
      const orderedSteps = steps.map((step, index) => ({
        title: step.title,
        description: step.description || null,
        icon: step.icon,
        order_index: index,
        duration_seconds: step.duration_seconds || null,
        // Only sent when set, so a database without migration 032 still saves.
        ...(step.image_path ? { image_path: step.image_path } : {}),
      }));

      // Same rule for the routine-level helpers: send when set, or when
      // clearing a value the routine had.
      const targetSeconds = familyIsPremium || editRoutine?.target_duration_seconds ? targetMinutesToSeconds(targetMinutes) : null;
      const extras: { auto_read_aloud?: boolean; target_duration_seconds?: number | null } = {};
      if (autoReadAloud || editRoutine?.auto_read_aloud) extras.auto_read_aloud = autoReadAloud;
      if (targetSeconds || editRoutine?.target_duration_seconds) extras.target_duration_seconds = targetSeconds;

      if (editRoutine) {
        await updateMutation.mutateAsync({
          routineId: editRoutine.id,
          routine: { ...formData, ...extras },
          steps: orderedSteps,
        });
        playSound('success');
        toast.success('Routine updated successfully!');
      } else {
        await createMutation.mutateAsync({
          routine: {
            ...formData,
            ...extras,
            child_id: childId,
          },
          steps: orderedSteps,
        });
        playSound('success');
        toast.success('Routine created successfully!');
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving routine:', error);
      playSound('error');
      toast.error(error.message || 'Failed to save routine');
    }
  };

  const routineTypes: { value: 'morning' | 'bedtime' | 'afterschool' | 'custom'; label: string; color: string; icon: string }[] = [
    { value: 'morning', label: 'Morning', color: '#fbbf24', icon: '🌅' },
    { value: 'bedtime', label: 'Bedtime', color: '#6366f1', icon: '🌙' },
    { value: 'afterschool', label: 'After School', color: '#10b981', icon: '🎒' },
    { value: 'custom', label: 'Custom', color: '#6b7280', icon: '⚙️' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onClose={() => onOpenChange(false)}
        className="overflow-y-auto max-h-[90vh] w-[90vw] sm:w-full max-w-3xl min-w-0 sm:min-w-[600px] dialog-content-bg"
      >
        <form onSubmit={handleSubmit} className="w-full min-w-0">
          <DialogHeader className="pb-2">
            <DialogTitle
              className="text-3xl font-black flex items-center gap-3"
              style={{ color: 'var(--text-primary)' }}
            >
              <Sparkles className="w-8 h-8" style={{ color: 'var(--primary)' }} />
              {editRoutine ? 'Edit Routine' : 'Create New Routine'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 mt-6 mb-6">
            {/* Build with AI - Premium (crowned lock for free families) */}
            {!editRoutine && !planLoading && (
              <div className="p-4 sm:p-5 rounded-2xl border-2 border-fuchsia-200 bg-fuchsia-50/30 dark:border-fuchsia-800 dark:bg-fuchsia-900/20 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Wand2 className="w-5 h-5 text-fuchsia-600 dark:text-fuchsia-400" aria-hidden="true" />
                  <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                    Build with AI
                  </h3>
                  {showLocks && <Crown className="w-4 h-4 text-amber-500 dark:text-amber-400" aria-label="Premium" />}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Describe the routine and who it&apos;s for. You get short, age-appropriate steps with icons and timers to edit before saving.
                </p>
                {familyIsPremium ? (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Label htmlFor="ai-goal" className="sr-only">What should this routine do?</Label>
                    <textarea
                      id="ai-goal"
                      value={aiGoal}
                      onChange={(e) => setAiGoal(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          void buildWithAI();
                        }
                      }}
                      maxLength={500}
                      rows={2}
                      placeholder="e.g. get ready for school, 7 year old, needs reminders to brush teeth"
                      className="flex-1 min-w-0 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-300 dark:focus:ring-fuchsia-700"
                    />
                    <Button type="button" variant="gradient" onClick={() => void buildWithAI()} disabled={aiBusy} className="gap-2 font-bold sm:self-stretch">
                      {aiBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                      {aiBusy ? 'Building...' : 'Build'}
                    </Button>
                  </div>
                ) : (
                  <Button type="button" variant="outline" onClick={() => openPremiumBilling('ai_routine')} className="gap-2 font-semibold">
                    <Crown className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                    Build with AI (Premium)
                  </Button>
                )}
                {aiNote && (
                  <p className="mt-3 text-sm text-fuchsia-800 dark:text-fuchsia-200" role="status">{aiNote}</p>
                )}
              </div>
            )}

            {/* Quick Templates Section - Cyan accent */}
            {!editRoutine && (
              <div className="p-4 sm:p-5 rounded-2xl border-2 border-cyan-200 bg-cyan-50/30 dark:border-cyan-800 dark:bg-cyan-900/20 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                  <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                    Quick Start Templates
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {ROUTINE_TEMPLATES.map((template, index) => {
                    // The Premium library shows to everyone; picking one on the
                    // free plan opens Billing.
                    // Not locked while the plan is still loading: a Premium
                    // family tapping early must not land on Billing.
                    const locked = !!template.premium && !planLoading && !familyIsPremium
                    return (
                      <button
                        key={template.name}
                        type="button"
                        onClick={() => {
                          if (template.premium && planLoading) return
                          if (locked) {
                            window.dispatchEvent(new CustomEvent('chorestar:open-settings', { detail: { tab: 'billing', source: 'routine_templates' } }))
                            return
                          }
                          loadTemplate(index)
                        }}
                        className={`p-3 text-left border-2 rounded-lg transition-colors bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-cyan-400 ${locked ? 'opacity-70' : ''}`}
                      >
                        <div className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-1">
                          {template.name}
                          {template.premium && <Crown className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" aria-label="Premium" />}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{template.steps.length} steps</div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Routine Details Section - Blue accent */}
            <div className="p-4 sm:p-5 rounded-2xl border-2 border-blue-200 bg-blue-50/30 dark:border-blue-800 dark:bg-blue-900/20 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  Routine Details
                </h3>
              </div>

              <div className="space-y-4">
                {/* Routine Name */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                    Routine Name
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Morning Routine, Bedtime Routine"
                    required
                    className="h-14 text-base font-semibold border-2 rounded-xl focus:ring-2 focus:ring-blue-200 transition-all input-bg-glass"
                  />
                </div>

                {/* Routine Type */}
                <div className="space-y-2">
                  <Label className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                    Routine Type
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {routineTypes.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            type: type.value,
                            color: type.color,
                          })
                        }
                        className={`p-3 rounded-lg border-2 transition-all ${
                          formData.type === type.value
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-105'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{type.icon}</span>
                          <span className="font-bold">{type.label}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Icon Selection */}
                <div className="space-y-2">
                  <Label className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                    Routine Icon
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowIconPicker(!showIconPicker)}
                    className="w-full h-14"
                  >
                    {ROUTINE_ICONS[formData.icon] && (
                      <>
                        {(() => {
                          const IconComponent = ROUTINE_ICONS[formData.icon].icon;
                          return <IconComponent className="w-6 h-6 mr-2" />;
                        })()}
                        {ROUTINE_ICONS[formData.icon].label}
                      </>
                    )}
                  </Button>
                  {showIconPicker && (
                    <div className="mt-2">
                      <RoutineIconPicker
                        currentIcon={formData.icon}
                        onSelect={(icon) => {
                          setFormData({ ...formData, icon });
                          setShowIconPicker(false);
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Reward Cents */}
                <div className="space-y-2">
                  <Label htmlFor="reward" className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <DollarSign className="w-4 h-4" />
                    Reward (cents)
                  </Label>
                  <Input
                    id="reward"
                    type="number"
                    value={formData.reward_cents}
                    onChange={(e) => {
                      rewardTouched.current = true;
                      setFormData({ ...formData, reward_cents: parseInt(e.target.value) || 0 });
                    }}
                    min="0"
                    className="h-14 text-base font-semibold border-2 rounded-xl focus:ring-2 focus:ring-blue-200 transition-all input-bg-glass"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">Points earned when routine is completed</p>
                </div>
              </div>
            </div>

            {/* Kid-friendly helpers - Amber accent */}
            <div className="p-4 sm:p-5 rounded-2xl border-2 border-amber-200 bg-amber-50/30 dark:border-amber-800 dark:bg-amber-900/20 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  Kid-Friendly Helpers
                </h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Great for pre-readers and kids who need a little extra structure.
              </p>

              <div className="space-y-4">
                {/* Read aloud (free) */}
                <div className="flex items-start gap-3">
                  <Checkbox checked={autoReadAloud} onCheckedChange={setAutoReadAloud} className="mt-0.5 flex-shrink-0" />
                  <button type="button" className="text-left" onClick={() => setAutoReadAloud(!autoReadAloud)}>
                    <span className="flex items-center gap-1.5 font-semibold text-gray-900 dark:text-gray-100">
                      <Volume2 className="w-4 h-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                      Read each step aloud
                    </span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400">
                      The player speaks every step as it appears. Kids can always tap the speaker to hear it again.
                    </span>
                  </button>
                </div>

                {/* Finish-by timer (Premium) */}
                <div>
                  <Label htmlFor="target-minutes" className="flex items-center gap-1.5 font-semibold text-gray-900 dark:text-gray-100">
                    <Timer className="w-4 h-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                    Finish-by timer
                    {showLocks && <Crown className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" aria-label="Premium" />}
                  </Label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    A calm countdown for the whole routine. No fail state; finishing early gets a cheer.
                  </p>
                  {familyIsPremium ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Input
                        id="target-minutes"
                        type="number"
                        min="1"
                        max="120"
                        value={targetMinutes}
                        onChange={(e) => setTargetMinutes(e.target.value)}
                        placeholder="Off"
                        className="w-24"
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">minutes</span>
                      {(() => {
                        const suggested = suggestedTargetSeconds(steps);
                        if (!suggested || targetMinutesToSeconds(targetMinutes) === suggested) return null;
                        return (
                          <Button type="button" size="sm" variant="ghost" onClick={() => setTargetMinutes(String(suggested / 60))} className="text-amber-700 dark:text-amber-300">
                            Use step total ({suggested / 60} min)
                          </Button>
                        );
                      })()}
                      {targetMinutes && (
                        <Button type="button" size="sm" variant="ghost" onClick={() => setTargetMinutes('')} className="text-gray-600 dark:text-gray-400">
                          Turn off
                        </Button>
                      )}
                    </div>
                  ) : showLocks ? (
                    <Button type="button" size="sm" variant="outline" onClick={() => openPremiumBilling('routine_timer')} className="gap-2">
                      <Crown className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                      Add a finish-by timer (Premium)
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Routine Steps Section - Purple accent */}
            <div className="p-4 sm:p-5 rounded-2xl border-2 border-purple-200 bg-purple-50/30 dark:border-purple-800 dark:bg-purple-900/20 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                    Routine Steps ({steps.length})
                  </h3>
                </div>
                <Button type="button" onClick={addStep} size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Step
                </Button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                aria-hidden="true"
                tabIndex={-1}
                onChange={(e) => void handlePhotoChosen(e.target.files?.[0])}
              />
              {steps.length > 0 && (familyIsPremium || showLocks) && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                  Tap the camera on a step to show a photo instead of the icon, like their own toothbrush.
                  {showLocks && <Crown className="w-3.5 h-3.5 flex-shrink-0 text-amber-500 dark:text-amber-400" aria-label="Premium" />}
                </p>
              )}
              {steps.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                  <p className="text-gray-500 dark:text-gray-400">No steps added yet</p>
                  <Button type="button" onClick={addStep} variant="outline" className="mt-4">
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Step
                  </Button>
                </div>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={steps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {steps.map((step, index) => (
                        <SortableStep
                          key={step.id}
                          step={step}
                          index={index}
                          onUpdate={(updates) => updateStep(index, updates)}
                          onDelete={() => deleteStep(index)}
                          photo={{
                            canAddPhoto: familyIsPremium,
                            showLocked: showLocks,
                            uploading: uploadingStep === step.id,
                            onPick: () => pickPhotoFor(step.id),
                          }}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </div>

          <DialogFooter className="gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending || updateMutation.isPending}
              size="lg"
              className="flex-1 font-bold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              variant="gradient"
              size="lg"
              className="flex-1 font-bold hover-glow"
            >
              {createMutation.isPending || updateMutation.isPending
                ? 'Saving...'
                : editRoutine
                ? 'Update Routine'
                : 'Create Routine'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
