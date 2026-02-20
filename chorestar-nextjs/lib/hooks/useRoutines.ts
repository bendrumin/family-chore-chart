'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/database.types';

type Routine = Database['public']['Tables']['routines']['Row'] & {
  routine_steps?: Database['public']['Tables']['routine_steps']['Row'][];
  children?: {
    id: string;
    name: string;
    avatar_color: string | null;
    avatar_url: string | null;
  };
};

type RoutineInsert = Database['public']['Tables']['routines']['Insert'];
type RoutineStepInsert = Omit<Database['public']['Tables']['routine_steps']['Insert'], 'routine_id'>;

interface CreateRoutineData {
  routine: RoutineInsert;
  steps: RoutineStepInsert[];
}

interface UpdateRoutineData {
  routineId: string;
  routine?: Partial<RoutineInsert>;
  steps?: RoutineStepInsert[];
}

// Fetch all routines for a child
export function useRoutines(childId?: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ['routines', childId],
    queryFn: async () => {
      const url = childId
        ? `/api/routines?childId=${childId}`
        : '/api/routines';

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch routines');
      }
      return response.json() as Promise<Routine[]>;
    },
  });
}

// Fetch a specific routine
export function useRoutine(routineId: string) {
  return useQuery({
    queryKey: ['routine', routineId],
    queryFn: async () => {
      const response = await fetch(`/api/routines/${routineId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch routine');
      }
      return response.json() as Promise<Routine>;
    },
    enabled: !!routineId,
  });
}

// Create a new routine
export function useCreateRoutine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateRoutineData) => {
      const response = await fetch('/api/routines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create routine');
      }

      return response.json() as Promise<Routine>;
    },
    onSuccess: (_, variables) => {
      // Invalidate routines list for this child
      queryClient.invalidateQueries({ queryKey: ['routines', variables.routine.child_id] });
      queryClient.invalidateQueries({ queryKey: ['routines'] });
    },
  });
}

// Update a routine
export function useUpdateRoutine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ routineId, routine, steps }: UpdateRoutineData) => {
      const response = await fetch(`/api/routines/${routineId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routine, steps }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update routine');
      }

      return response.json() as Promise<Routine>;
    },
    onSuccess: (data, variables) => {
      // Invalidate specific routine and lists
      queryClient.invalidateQueries({ queryKey: ['routine', variables.routineId] });
      queryClient.invalidateQueries({ queryKey: ['routines'] });
    },
  });
}

// Delete a routine
export function useDeleteRoutine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (routineId: string) => {
      const response = await fetch(`/api/routines/${routineId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete routine');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate all routine queries
      queryClient.invalidateQueries({ queryKey: ['routines'] });
    },
  });
}

// Check if routine is completed today
export function useRoutineCompletionStatus(routineId: string, childId: string) {
  return useQuery({
    queryKey: ['routine-completion-status', routineId, childId],
    queryFn: async () => {
      const response = await fetch(
        `/api/routines/${routineId}/complete?childId=${childId}`
      );
      if (!response.ok) {
        throw new Error('Failed to check completion status');
      }
      return response.json() as Promise<{ completed: boolean; completion: any }>;
    },
    enabled: !!routineId && !!childId,
  });
}

// Complete a routine (kidToken optional - for kid mode when parent not logged in)
export function useCompleteRoutine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      routineId,
      childId,
      stepsCompleted,
      stepsTotal,
      durationSeconds,
      kidToken,
    }: {
      routineId: string;
      childId: string;
      stepsCompleted: number;
      stepsTotal: number;
      durationSeconds?: number;
      kidToken?: string;
    }) => {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (kidToken) {
        headers['Authorization'] = `Bearer ${kidToken}`;
      }

      const response = await fetch(`/api/routines/${routineId}/complete`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          childId,
          stepsCompleted,
          stepsTotal,
          durationSeconds,
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to complete routine');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate completion status
      queryClient.invalidateQueries({
        queryKey: ['routine-completion-status', variables.routineId, variables.childId],
      });
      // Invalidate routine stats
      queryClient.invalidateQueries({ queryKey: ['routine-stats', variables.childId] });
    },
  });
}
