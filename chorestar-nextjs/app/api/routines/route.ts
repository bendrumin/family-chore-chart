import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { Database } from '@/lib/supabase/database.types';

type Routine = Database['public']['Tables']['routines']['Row'];
type RoutineInsert = Database['public']['Tables']['routines']['Insert'];

// GET /api/routines - Get all routines for authenticated user's children
export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('childId');

    let query = supabase
      .from('routines')
      .select(`
        *,
        routine_steps (
          id,
          title,
          description,
          icon,
          order_index,
          duration_seconds
        ),
        children!inner (
          id,
          name,
          avatar_color,
          avatar_url
        )
      `)
      .eq('children.user_id', user.id)
      .order('created_at', { ascending: false });

    // Filter by specific child if provided
    if (childId) {
      query = query.eq('child_id', childId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching routines:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Sort routine steps by order_index
    const routinesWithSortedSteps = data.map(routine => ({
      ...routine,
      routine_steps: routine.routine_steps?.sort((a: any, b: any) => a.order_index - b.order_index) || []
    }));

    return NextResponse.json(routinesWithSortedSteps);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/routines - Create a new routine
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { routine, steps } = body;

    // Verify child belongs to user
    const { data: child, error: childError } = await supabase
      .from('children')
      .select('id')
      .eq('id', routine.child_id)
      .eq('user_id', user.id)
      .single();

    if (childError || !child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }

    // Get default reward from family settings
    const { data: settings } = await supabase
      .from('family_settings')
      .select('daily_reward_cents')
      .eq('user_id', user.id)
      .single();

    const defaultRewardCents = settings?.daily_reward_cents || 7;

    // Create routine
    const routineInsert: RoutineInsert = {
      child_id: routine.child_id,
      name: routine.name,
      type: routine.type || 'custom',
      icon: routine.icon || '📋',
      color: routine.color || '#6366f1',
      reward_cents: routine.reward_cents ?? defaultRewardCents,
      is_active: routine.is_active ?? true,
    };

    const { data: newRoutine, error: routineError } = await supabase
      .from('routines')
      .insert(routineInsert)
      .select()
      .single();

    if (routineError || !newRoutine) {
      console.error('Error creating routine:', routineError);
      return NextResponse.json({ error: routineError?.message || 'Failed to create routine' }, { status: 500 });
    }

    // Create routine steps if provided
    if (steps && steps.length > 0) {
      const stepsToInsert = steps.map((step: any, index: number) => ({
        routine_id: newRoutine.id,
        title: step.title,
        description: step.description || null,
        icon: step.icon || 'check',
        order_index: step.order_index ?? index,
        duration_seconds: step.duration_seconds || null,
      }));

      const { error: stepsError } = await supabase
        .from('routine_steps')
        .insert(stepsToInsert);

      if (stepsError) {
        console.error('Error creating routine steps:', stepsError);
        // Rollback routine creation
        await supabase.from('routines').delete().eq('id', newRoutine.id);
        return NextResponse.json({ error: 'Failed to create routine steps' }, { status: 500 });
      }
    }

    // Fetch complete routine with steps
    const { data: completeRoutine } = await supabase
      .from('routines')
      .select(`
        *,
        routine_steps (
          id,
          title,
          description,
          icon,
          order_index,
          duration_seconds
        )
      `)
      .eq('id', newRoutine.id)
      .single();

    return NextResponse.json(completeRoutine, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
