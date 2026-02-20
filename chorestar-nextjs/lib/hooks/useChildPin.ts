'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : ({} as T);
  } catch {
    throw new Error('Invalid response from server. Please try again.');
  }
}

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
  kidToken?: string;
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
        const err = await parseJsonResponse<{ error?: string }>(response).catch(() => ({} as { error?: string }));
        throw new Error(err.error || 'Failed to set PIN');
      }

      return parseJsonResponse(response);
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
        const err = await parseJsonResponse<{ error?: string }>(response).catch(() => ({} as { error?: string }));
        throw new Error(err.error || 'Failed to remove PIN');
      }

      return parseJsonResponse(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['child-pins'] });
    },
  });
}

// Verify a child's PIN (familyCode scopes to that family's children only)
export function useVerifyChildPin(familyCode?: string) {
  return useMutation({
    mutationFn: async (pin: string) => {
      const response = await fetch('/api/child-pin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, familyCode: familyCode || '' }),
      });

      if (!response.ok) {
        const err = await parseJsonResponse<{ error?: string }>(response).catch(() => ({} as { error?: string }));
        throw new Error(err.error || 'Invalid PIN');
      }

      return parseJsonResponse<VerifyPinResponse>(response);
    },
  });
}
