import { createClient } from '@/lib/supabase/server';
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

    // AUTHORIZATION: Get authenticated user
    // For kid mode, they should have a session after PIN verification
    // For parent mode, they should be logged in
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // If no authenticated user, check if this is a valid kid mode request
    // by verifying the childId matches a kid session stored in cookies/headers
    if (authError || !user) {
      // For now, we require authentication for all routine completions
      // TODO: Implement kid-specific session tokens after PIN verification
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get routine with child verification AND verify child belongs to authenticated user
    const { data: routine, error: routineError } = await supabase
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

    // CRITICAL: Verify the child belongs to the authenticated user
    // This prevents users from completing other families' routines
    if ((routine.children as any).user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized - this routine belongs to another family' },
        { status: 403 }
      );
    }

    // Check if routine was already completed today
    const today = new Date().toISOString().split('T')[0];
    const { data: existingCompletion } = await supabase
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
    const pointsEarned = stepsCompleted === stepsTotal ? routine.reward_cents : 0;

    // Record completion
    const { data: completion, error: completionError } = await supabase
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
