'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Sparkles, Plus, Trash2, GripVertical, Clock, DollarSign } from 'lucide-react';
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
    steps: RoutineStep[];
  };
}

// Sortable Step Component
function SortableStep({
  step,
  index,
  onUpdate,
  onDelete,
}: {
  step: RoutineStep;
  index: number;
  onUpdate: (updates: Partial<RoutineStep>) => void;
  onDelete: () => void;
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
      className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg"
    >
      {/* Drag Handle */}
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-5 h-5" />
      </button>

      {/* Step Number */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 font-bold flex items-center justify-center text-sm">
        {index + 1}
      </div>

      {/* Step Icon */}
      <div className="flex-shrink-0">
        {IconComponent && <IconComponent className="w-6 h-6 text-blue-600" />}
      </div>

      {/* Step Title Input */}
      <Input
        value={step.title}
        onChange={(e) => onUpdate({ title: e.target.value })}
        placeholder="Step name..."
        className="flex-1"
      />

      {/* Duration (optional) */}
      <div className="flex items-center gap-1">
        <Clock className="w-4 h-4 text-gray-400" />
        <Input
          type="number"
          value={step.duration_seconds ? Math.floor(step.duration_seconds / 60) : ''}
          onChange={(e) =>
            onUpdate({ duration_seconds: e.target.value ? parseInt(e.target.value) * 60 : undefined })
          }
          placeholder="min"
          className="w-16 text-sm"
          min="0"
        />
      </div>

      {/* Delete Button */}
      <Button type="button" variant="ghost" size="sm" onClick={onDelete} className="text-red-500 hover:text-red-700">
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
  const [formData, setFormData] = useState({
    name: '',
    type: 'custom' as 'morning' | 'bedtime' | 'afterschool' | 'custom',
    icon: 'check' as RoutineIconKey,
    color: '#6366f1',
    reward_cents: defaultRewardCents,
  });

  const [steps, setSteps] = useState<RoutineStep[]>([]);
  const [showIconPicker, setShowIconPicker] = useState(false);

  const createMutation = useCreateRoutine();
  const updateMutation = useUpdateRoutine();

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
    }
  }, [editRoutine, defaultRewardCents, open]);

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
    toast.success(`✨ Loaded ${template.name} template!`);
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
      }));

      if (editRoutine) {
        await updateMutation.mutateAsync({
          routineId: editRoutine.id,
          routine: formData,
          steps: orderedSteps,
        });
        playSound('success');
        toast.success('🎉 Routine updated successfully!');
      } else {
        await createMutation.mutateAsync({
          routine: {
            ...formData,
            child_id: childId,
          },
          steps: orderedSteps,
        });
        playSound('success');
        toast.success('🎉 Routine created successfully!');
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving routine:', error);
      playSound('error');
      toast.error(error.message || 'Failed to save routine');
    }
  };

  const routineTypes = [
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
              style={{
                background: 'var(--gradient-primary)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              <Sparkles className="w-8 h-8" style={{ color: 'var(--primary)' }} />
              {editRoutine ? 'Edit Routine' : 'Create New Routine'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 mt-6 mb-6">
            {/* Quick Templates Section - Cyan accent */}
            {!editRoutine && (
              <div className="p-4 sm:p-5 rounded-2xl border-2 border-cyan-200 bg-cyan-50/30 dark:border-cyan-800 dark:bg-cyan-900/20 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                  <h4 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                    Quick Start Templates
                  </h4>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {ROUTINE_TEMPLATES.map((template, index) => (
                    <button
                      key={template.name}
                      type="button"
                      onClick={() => loadTemplate(index)}
                      className="p-3 text-left border-2 rounded-lg hover:scale-105 transition-all bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-cyan-400"
                    >
                      <div className="font-bold text-sm">{template.name}</div>
                      <div className="text-xs text-gray-500">{template.steps.length} steps</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Routine Details Section - Blue accent */}
            <div className="p-4 sm:p-5 rounded-2xl border-2 border-blue-200 bg-blue-50/30 dark:border-blue-800 dark:bg-blue-900/20 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h4 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  Routine Details
                </h4>
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
                            type: type.value as any,
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
                    onChange={(e) => setFormData({ ...formData, reward_cents: parseInt(e.target.value) || 0 })}
                    min="0"
                    className="h-14 text-base font-semibold border-2 rounded-xl focus:ring-2 focus:ring-blue-200 transition-all input-bg-glass"
                  />
                  <p className="text-xs text-gray-500">Points earned when routine is completed</p>
                </div>
              </div>
            </div>

            {/* Routine Steps Section - Purple accent */}
            <div className="p-4 sm:p-5 rounded-2xl border-2 border-purple-200 bg-purple-50/30 dark:border-purple-800 dark:bg-purple-900/20 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <h4 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                    Routine Steps ({steps.length})
                  </h4>
                </div>
                <Button type="button" onClick={addStep} size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Step
                </Button>
              </div>

              {steps.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                  <p className="text-gray-500">No steps added yet</p>
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
                ? '⏳ Saving...'
                : editRoutine
                ? '✨ Update Routine'
                : '✨ Create Routine'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
