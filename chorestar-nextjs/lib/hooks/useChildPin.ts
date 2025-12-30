'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

interface SetPinData {
  childId: string;
  pin: string;
}

interface VerifyPinResponse {
  success: boolean;
  child: {
    id: string;
    name: string;
    avatar_color: string | null;
    avatar_url: string | null;
    avatar_file: string | null;
  };
}

// Set or update a child's PIN
export function useSetChildPin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ childId, pin }: SetPinData) => {
      const response = await fetch('/api/child-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId, pin }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to set PIN');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['child-pins'] });
    },
  });
}

// Remove a child's PIN
export function useRemoveChildPin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (childId: string) => {
      const response = await fetch(`/api/child-pin?childId=${childId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove PIN');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['child-pins'] });
    },
  });
}

// Verify a child's PIN
export function useVerifyChildPin() {
  return useMutation({
    mutationFn: async (pin: string) => {
      const response = await fetch('/api/child-pin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Invalid PIN');
      }

      return response.json() as Promise<VerifyPinResponse>;
    },
  });
}
