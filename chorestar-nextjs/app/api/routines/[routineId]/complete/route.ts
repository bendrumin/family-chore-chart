import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { NextResponse, after } from 'next/server'
import { notifyRoutineCompleted } from '@/lib/push/notify';
import { z } from 'zod';
import { validateKidToken } from '@/lib/utils/kid-auth';

const completeRoutineSchema = z.object({
  childId: z.string().uuid(),
  stepsCompleted: z.number().int().min(0).max(200),
  stepsTotal: z.number().int().min(1).max(200),
  durationSeconds: z.number().int().min(0).max(86400).optional(),
}).refine(data => data.stepsCompleted <= data.stepsTotal, {
  message: 'stepsCompleted cannot exceed stepsTotal',
  path: ['stepsCompleted'],
});

// POST /api/routines/[routineId]/complete - Mark a routine as completed
export async function POST(
  request: Request,
  { params }: { params: Promise<{ routineId: string }> }
) {
  try {
    const supabase = await createClient();
    const { routineId } = await params;

    const raw = await request.json();
    const parsed = completeRoutineSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { childId, stepsCompleted, stepsTotal, durationSeconds } = parsed.data;

    // AUTHORIZATION: Parent session OR kid token from PIN verification
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    let authorizedChildId: string | null = null;

    if (user) {
      authorizedChildId = childId; // Will verify via routine ownership below
    } else {
      // No parent session - check for kid token (Authorization: Bearer <token>)
      const kidSession = await validateKidToken(request, childId);
      if (kidSession) {
        authorizedChildId = kidSession.childId;
      }
    }

    if (!authorizedChildId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Kid mode uses service role to bypass RLS; parent mode uses authenticated client.
    const dbClient = user ? supabase : createServiceRoleClient();

    // Get routine with child verification
    const { data: routine, error: routineError } = await dbClient
      .from('routines')
      .select(`
        *,
        children!inner (
          id,
          name,
          user_id
        )
      `)
      .eq('id', routineId)
      .eq('child_id', childId)
      .single();

    if (routineError || !routine) {
      return NextResponse.json({ error: 'Routine not found' }, { status: 404 });
    }

    // If parent session: verify child belongs to them. If kid token: already validated child_id.
    if (user && (routine.children as any).user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized - this routine belongs to another family' },
        { status: 403 }
      );
    }

    // Check if routine was already completed today
    const today = new Date().toISOString().split('T')[0];
    const { data: existingCompletion } = await dbClient
      .from('routine_completions')
      .select('id')
      .eq('routine_id', routineId)
      .eq('child_id', childId)
      .eq('date', today)
      .maybeSingle();

    // If already completed today, return the existing completion
    if (existingCompletion) {
      return NextResponse.json({
        alreadyCompleted: true,
        message: 'Routine already completed today!',
      });
    }

    // Calculate points earned (only if all steps completed)
    const pointsEarned = stepsCompleted === stepsTotal ? (routine as any).reward_cents : 0;

    // Record completion
    const { data: completion, error: completionError } = await dbClient
      .from('routine_completions')
      .insert({
        routine_id: routineId,
        child_id: childId,
        steps_completed: stepsCompleted,
        steps_total: stepsTotal,
        duration_seconds: durationSeconds || null,
        points_earned: pointsEarned,
        date: today,
      })
      .select()
      .single();

    if (completionError) {
      // Unique-constraint violation (migration 006) = a concurrent request already
      // recorded today's completion. Treat as idempotent success so we never
      // double-award points on a double-submit.
      if ((completionError as { code?: string }).code === '23505') {
        return NextResponse.json({
          alreadyCompleted: true,
          message: 'Routine already completed today!',
        });
      }
      // Don't expose database error details to client
      return NextResponse.json({ error: 'Failed to record completion' }, { status: 500 });
    }

    // Screen-time minutes (Premium, migration 030): captured on the completion
    // so changing the routine's reward later doesn't rewrite history. A
    // separate write so a database without the column still records the run.
    const rewardMinutes = Number((routine as { reward_minutes?: number }).reward_minutes ?? 0)
    let minutesEarned = 0
    if (stepsCompleted === stepsTotal && rewardMinutes > 0 && completion) {
      // Service role: the caller is already authorized above, and parents have
      // no update policy on routine_completions. Column isn't in the generated types.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: minutesError } = await (createServiceRoleClient() as any)
        .from('routine_completions')
        .update({ minutes_earned: rewardMinutes })
        .eq('id', (completion as { id: string }).id)
      if (!minutesError) minutesEarned = rewardMinutes
    }

    // after(), not a bare void promise: Vercel freezes the invocation once the
    // response goes out, killing an in-flight APNs send. A send failure still
    // can't fail the completion the kid just earned — this runs post-response.
    after(() => notifyRoutineCompleted(childId, (routine as { name?: string }).name || 'their routine'))

    return NextResponse.json({
      success: true,
      completion,
      pointsEarned,
      minutesEarned,
      message: pointsEarned > 0 ? `Great job! You earned ${pointsEarned}¢!` : 'Keep trying!',
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

