/**
 * Kid Session Authentication
 *
 * Kid mode works without a parent Supabase session: after PIN verification
 * (/api/child-pin/verify), the kid's device holds a short-lived token from
 * the kid_sessions table and sends it as `Authorization: Bearer <token>`.
 *
 * This module is the single place that validates those tokens.
 */

import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * Extract the kid session token from a request's Authorization header.
 */
export function getKidTokenFromRequest(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  return token || null;
}

/**
 * Validate a kid session token (issued by /api/child-pin/verify).
 *
 * @param request - Incoming request (token read from Authorization header)
 * @param expectedChildId - If provided, the session must belong to this child
 * @returns The session's childId, or null if the token is missing, invalid,
 *          expired, or belongs to a different child.
 */
export async function validateKidToken(
  request: Request,
  expectedChildId?: string
): Promise<{ childId: string } | null> {
  const kidToken = getKidTokenFromRequest(request);
  if (!kidToken) return null;

  try {
    const serviceClient = createServiceRoleClient();

    const { data: session, error } = await serviceClient
      .from('kid_sessions')
      .select('child_id')
      .eq('token', kidToken)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (error || !session?.child_id) return null;
    if (expectedChildId && session.child_id !== expectedChildId) return null;

    return { childId: session.child_id };
  } catch {
    return null;
  }
}
