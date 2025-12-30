'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Play, CheckCircle2, Circle } from 'lucide-react';
import { ROUTINE_ICONS, type RoutineIconKey } from '@/lib/constants/routine-icons';
import { useDeleteRoutine } from '@/lib/hooks/useRoutines';
import { toast } from 'sonner';
import { playSound } from '@/lib/utils/sound';

interface RoutineCardProps {
  routine: {
    id: string;
    name: string;
    type: 'morning' | 'bedtime' | 'afterschool' | 'custom';
    icon: string;
    color: string;
    reward_cents: number;
    is_active: boolean;
    routine_steps?: Array<{
      id: string;
      title: string;
      icon: string;
      order_index: number;
    }>;
  };
  completedToday?: boolean;
  onEdit: () => void;
  onPlay?: () => void;
  showActions?: boolean;
}

export function RoutineCard({
  routine,
  completedToday = false,
  onEdit,
  onPlay,
  showActions = true,
}: RoutineCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteMutation = useDeleteRoutine();

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${routine.name}"? This cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteMutation.mutateAsync(routine.id);
      playSound('success');
      toast.success('Routine deleted successfully');
    } catch (error: any) {
      playSound('error');
      toast.error(error.message || 'Failed to delete routine');
    } finally {
      setIsDeleting(false);
    }
  };

  const IconComponent = ROUTINE_ICONS[routine.icon as RoutineIconKey]?.icon;
  const stepCount = routine.routine_steps?.length || 0;

  const typeLabels = {
    morning: 'Morning',
    bedtime: 'Bedtime',
    afterschool: 'After School',
    custom: 'Custom',
  };

  return (
    <Card
      className="relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02] border border-gray-200 dark:border-gray-700 shadow-md rounded-xl"
      style={{
        background: `linear-gradient(135deg, ${routine.color}15 0%, ${routine.color}08 50%, white 100%)`,
      }}
    >
      {/* Completed Badge */}
      {completedToday && (
        <div className="absolute top-3 right-3 z-10">
          <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white gap-1 px-2.5 py-1 shadow-md font-semibold rounded-lg text-xs">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Done
          </Badge>
        </div>
      )}

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start gap-3.5 mb-4">
          {/* Icon */}
          <div
            className="flex-shrink-0 w-16 h-16 rounded-xl flex items-center justify-center shadow-md"
            style={{
              background: `linear-gradient(135deg, ${routine.color} 0%, ${routine.color}dd 100%)`,
            }}
          >
            {IconComponent && <IconComponent className="w-8 h-8 text-white" />}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold mb-1.5 truncate text-gray-900 dark:text-gray-100">{routine.name}</h3>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="outline"
                className="text-xs font-semibold rounded-lg px-2.5 py-0.5 border-2"
                style={{
                  borderColor: `${routine.color}40`,
                  backgroundColor: `${routine.color}08`,
                  color: routine.color
                }}
              >
                {typeLabels[routine.type]}
              </Badge>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{stepCount} steps</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-md" style={{
                backgroundColor: `${routine.color}15`,
                color: routine.color
              }}>
                +{routine.reward_cents}¢
              </span>
            </div>
          </div>
        </div>

        {/* Steps Preview */}
        {stepCount > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-1.5 flex-wrap">
              {routine.routine_steps?.slice(0, 5).map((step, index) => {
                const StepIcon = ROUTINE_ICONS[step.icon as RoutineIconKey]?.icon;
                return (
                  <div
                    key={step.id}
                    className="w-9 h-9 rounded-lg bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center transition-transform hover:scale-110 border border-gray-200 dark:border-gray-700"
                    style={{ borderLeftWidth: '3px', borderLeftColor: routine.color }}
                    title={step.title}
                  >
                    {StepIcon ? (
                      <StepIcon className="w-4 h-4" style={{ color: routine.color }} />
                    ) : (
                      <Circle className="w-3.5 h-3.5" style={{ color: routine.color }} />
                    )}
                  </div>
                );
              })}
              {stepCount > 5 && (
                <div
                  className="w-9 h-9 rounded-lg bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center text-xs font-bold border border-gray-200 dark:border-gray-700"
                  style={{ color: routine.color }}
                >
                  +{stepCount - 5}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex items-center gap-2">
            {onPlay && (
              <Button
                onClick={onPlay}
                disabled={completedToday}
                className="flex-1 gap-2 font-semibold rounded-lg shadow-md hover:shadow-lg transition-all hover:scale-[1.02]"
                style={{
                  background: completedToday
                    ? undefined
                    : `linear-gradient(135deg, ${routine.color} 0%, ${routine.color}dd 100%)`,
                  color: 'white',
                }}
              >
                <Play className="w-4 h-4" />
                {completedToday ? 'Done' : 'Start'}
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
              className="gap-1 rounded-lg font-medium hover:scale-[1.02] transition-all border-gray-300 dark:border-gray-600"
            >
              <Edit className="w-3.5 h-3.5" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg font-medium hover:scale-[1.02] transition-all border-gray-300 dark:border-gray-600"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Active Indicator */}
      {!routine.is_active && (
        <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center">
          <Badge variant="secondary">Inactive</Badge>
        </div>
      )}
    </Card>
  );
}
