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

    // For kid mode, we might not have an authenticated user session
    // Instead, we'll verify the child via request body
    const body = await request.json();
    const { childId, stepsCompleted, stepsTotal, durationSeconds } = body;

    if (!childId || stepsCompleted === undefined || stepsTotal === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: childId, stepsCompleted, stepsTotal' },
        { status: 400 }
      );
    }

    // Get routine with child verification
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
      console.error('Error creating routine completion:', completionError);
      return NextResponse.json({ error: completionError.message }, { status: 500 });
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

    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('routine_completions')
      .select('*')
      .eq('routine_id', routineId)
      .eq('child_id', childId)
      .eq('date', today)
      .maybeSingle();

    if (error) {
      console.error('Error checking routine completion:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      completed: !!data,
      completion: data || null,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
