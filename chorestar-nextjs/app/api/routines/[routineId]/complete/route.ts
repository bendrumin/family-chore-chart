import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// POST /api/routines/[routineId]/complete - Mark a routine as completed
export async function POST(
  request: Request,
  { params }: { params: Promise<{ routineId: string }> }
) {
  try {
    const supabase = await createClient();
    const { routineId } = await params;

    const body = await request.json();
    const { childId, stepsCompleted, stepsTotal, durationSeconds } = body;

    if (!childId || stepsCompleted === undefined || stepsTotal === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: childId, stepsCompleted, stepsTotal' },
        { status: 400 }
      );
    }

    // AUTHORIZATION: Parent session OR kid token from PIN verification
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    let authorizedChildId: string | null = null;

    if (user) {
      authorizedChildId = childId; // Will verify via routine ownership below
    } else {
      // No parent session - check for kid token (Authorization: Bearer <token>)
      const authHeader = request.headers.get('Authorization');
      const kidToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

      if (kidToken) {
        try {
          const adminSupabase = createServiceRoleClient();
          const { data: session, error: sessionError } = await (adminSupabase as any)
            .from('kid_sessions')
            .select('child_id')
            .eq('token', kidToken)
            .gt('expires_at', new Date().toISOString())
            .maybeSingle();

          const sess = session as { child_id?: string } | null;
          if (!sessionError && sess && sess.child_id === childId) {
            authorizedChildId = childId;
          }
        } catch {
          // Invalid or expired token
        }
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
      // Don't expose database error details to client
      return NextResponse.json({ error: 'Failed to record completion' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      completion,
      pointsEarned,
      message: pointsEarned > 0 ? `Great job! You earned ${pointsEarned}¢!` : 'Keep trying!',
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/routines/[routineId]/complete - Check if routine is completed today
export async function GET(
  request: Request,
  { params }: { params: Promise<{ routineId: string }> }
) {
  try {
    const supabase = await createClient();
    const { routineId } = await params;
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('childId');

    if (!childId) {
      return NextResponse.json({ error: 'childId is required' }, { status: 400 });
    }

    // AUTHORIZATION: Verify user has access to this child
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Verify child belongs to authenticated user
    const { data: child, error: childError } = await supabase
      .from('children')
      .select('id, user_id')
      .eq('id', childId)
      .single();

    if (childError || !child || child.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('routine_completions')
      .select('*')
      .eq('routine_id', routineId)
      .eq('child_id', childId)
      .eq('date', today)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: 'Failed to check completion status' }, { status: 500 });
    }

    return NextResponse.json({
      completed: !!data,
      completion: data || null,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
