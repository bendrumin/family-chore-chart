'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Loader2 } from 'lucide-react';
import { RoutineCard } from './routine-card';
import { RoutineBuilderModal } from './routine-builder-modal';
import { useRoutines } from '@/lib/hooks/useRoutines';

interface RoutineListProps {
  childId: string;
  childName?: string;
  defaultRewardCents?: number;
  onPlayRoutine?: (routineId: string) => void;
  openRoutineBuilderTrigger?: boolean;
  onRoutineBuilderTriggerConsumed?: () => void;
}

export function RoutineList({
  childId,
  childName,
  defaultRewardCents = 7,
  onPlayRoutine,
  openRoutineBuilderTrigger = false,
  onRoutineBuilderTriggerConsumed,
}: RoutineListProps) {
  const [showBuilder, setShowBuilder] = useState(false);

  // When parent triggers "Add Routine" from tab bar, open the builder
  useEffect(() => {
    if (openRoutineBuilderTrigger) {
      setShowBuilder(true);
      onRoutineBuilderTriggerConsumed?.();
    }
  }, [openRoutineBuilderTrigger, onRoutineBuilderTriggerConsumed]);
  const [editingRoutine, setEditingRoutine] = useState<any | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);

  const { data: routines, isLoading, error, refetch } = useRoutines(childId);

  // Filter routines
  const filteredRoutines = filterType
    ? routines?.filter((r) => r.type === filterType)
    : routines;

  const handleEdit = (routine: any) => {
    setEditingRoutine({
      id: routine.id,
      name: routine.name,
      type: routine.type,
      icon: routine.icon,
      color: routine.color,
      reward_cents: routine.reward_cents,
      steps: routine.routine_steps || [],
    });
    setShowBuilder(true);
  };

  const handleCloseBuilder = () => {
    setShowBuilder(false);
    setEditingRoutine(null);
  };

  const handleSuccess = () => {
    refetch();
    handleCloseBuilder();
  };

  const types = [
    { value: null, label: 'All', count: routines?.length || 0 },
    { value: 'morning', label: 'Morning', count: routines?.filter((r) => r.type === 'morning').length || 0 },
    { value: 'bedtime', label: 'Bedtime', count: routines?.filter((r) => r.type === 'bedtime').length || 0 },
    {
      value: 'afterschool',
      label: 'After School',
      count: routines?.filter((r) => r.type === 'afterschool').length || 0,
    },
    { value: 'custom', label: 'Custom', count: routines?.filter((r) => r.type === 'custom').length || 0 },
  ];

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-4">Failed to load routines</p>
        <Button onClick={() => refetch()} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {childName ? `${childName}'s Routines` : 'Routines'}
          </h2>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mt-1">
            {filteredRoutines?.length || 0} routine{filteredRoutines?.length !== 1 ? 's' : ''} to build great habits
          </p>
        </div>
        <Button
          onClick={() => setShowBuilder(true)}
          className="gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-md hover:shadow-lg transition-all font-semibold px-5 py-2.5 rounded-lg"
        >
          <Plus className="w-4 h-4" />
          New Routine
        </Button>
      </div>

      {/* Type Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {types.map((type) => (
          <button
            key={type.value || 'all'}
            onClick={() => setFilterType(type.value)}
            className={`px-4 py-2.5 rounded-lg font-semibold text-sm transition-all whitespace-nowrap border ${
              filterType === type.value
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white border-transparent shadow-md'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-700'
            }`}
          >
            <span>{type.label}</span>
            {type.count > 0 && (
              <span className={`ml-2 px-2 py-0.5 rounded-md text-xs font-semibold ${
                filterType === type.value
                  ? 'bg-white/20 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}>
                {type.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredRoutines?.length === 0 && (
        <div className="text-center py-12 px-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50/50 dark:bg-gray-800/50">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-gray-100">No routines yet</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            Create your first routine to help {childName || 'your child'} build great habits!
          </p>
          <Button
            onClick={() => setShowBuilder(true)}
            className="gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-md hover:shadow-lg transition-all font-semibold px-5 py-2.5 rounded-lg"
          >
            <Plus className="w-4 h-4" />
            Create First Routine
          </Button>
        </div>
      )}

      {/* Routine Cards */}
      {!isLoading && filteredRoutines && filteredRoutines.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredRoutines.map((routine) => (
            <RoutineCard
              key={routine.id}
              routine={routine}
              onEdit={() => handleEdit(routine)}
              onPlay={onPlayRoutine ? () => onPlayRoutine(routine.id) : undefined}
            />
          ))}
        </div>
      )}

      {/* Builder Modal */}
      <RoutineBuilderModal
        open={showBuilder}
        onOpenChange={handleCloseBuilder}
        childId={childId}
        defaultRewardCents={defaultRewardCents}
        onSuccess={handleSuccess}
        editRoutine={editingRoutine}
      />
    </div>
  );
}
