import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/routines/[routineId] - Get a specific routine.
// Kid mode (no session): fetches via service role (read-only, no ownership check).
// Parent mode (authenticated): fetches with user ownership check.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ routineId: string }> }
) {
  try {
    const supabase = await createClient();
    const { routineId } = await params;

    const { data: { user } } = await supabase.auth.getUser();

    // Kid mode: no auth session → service role read-only
    if (!user) {
      const serviceClient = createServiceRoleClient();
      const { data, error } = await serviceClient
        .from('routines')
        .select(`
          *,
          routine_steps (
            id,
            title,
            description,
            icon,
            order_index,
            duration_seconds,
            created_at
          )
        `)
        .eq('id', routineId)
        .single();

      if (error || !data) {
        return NextResponse.json({ error: 'Routine not found' }, { status: 404 });
      }

      return NextResponse.json({
        ...data,
        routine_steps: data.routine_steps?.sort((a: any, b: any) => a.order_index - b.order_index) || []
      });
    }

    // Parent mode: authenticated user with ownership check
    const { data, error } = await supabase
      .from('routines')
      .select(`
        *,
        routine_steps (
          id,
          title,
          description,
          icon,
          order_index,
          duration_seconds,
          created_at
        ),
        children!inner (
          id,
          name,
          avatar_color,
          avatar_url
        )
      `)
      .eq('id', routineId)
      .eq('children.user_id', user.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Routine not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...data,
      routine_steps: data.routine_steps?.sort((a: any, b: any) => a.order_index - b.order_index) || []
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/routines/[routineId] - Update a routine
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ routineId: string }> }
) {
  try {
    const supabase = await createClient();
    const { routineId } = await params;

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { routine, steps } = body;

    // Verify routine belongs to user's child
    const { data: existingRoutine, error: verifyError } = await supabase
      .from('routines')
      .select('id, child_id, children!inner(user_id)')
      .eq('id', routineId)
      .single();

    if (verifyError || !existingRoutine || (existingRoutine.children as any).user_id !== user.id) {
      return NextResponse.json({ error: 'Routine not found' }, { status: 404 });
    }

    // Update routine
    if (routine) {
      const { error: updateError } = await supabase
        .from('routines')
        .update({
          name: routine.name,
          type: routine.type,
          icon: routine.icon,
          color: routine.color,
          reward_cents: routine.reward_cents,
          is_active: routine.is_active,
        })
        .eq('id', routineId);

      if (updateError) {
        console.error('Error updating routine:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    }

    // Update steps if provided
    if (steps) {
      // Delete existing steps
      await supabase
        .from('routine_steps')
        .delete()
        .eq('routine_id', routineId);

      // Insert new steps
      if (steps.length > 0) {
        const stepsToInsert = steps.map((step: any, index: number) => ({
          routine_id: routineId,
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
          console.error('Error updating routine steps:', stepsError);
          return NextResponse.json({ error: 'Failed to update routine steps' }, { status: 500 });
        }
      }
    }

    // Fetch updated routine
    const { data: updatedRoutine } = await supabase
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
      .eq('id', routineId)
      .single();

    return NextResponse.json(updatedRoutine);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/routines/[routineId] - Delete a routine
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ routineId: string }> }
) {
  try {
    const supabase = await createClient();
    const { routineId } = await params;

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify routine belongs to user's child
    const { data: existingRoutine, error: verifyError } = await supabase
      .from('routines')
      .select('id, child_id, children!inner(user_id)')
      .eq('id', routineId)
      .single();

    if (verifyError || !existingRoutine || (existingRoutine.children as any).user_id !== user.id) {
      return NextResponse.json({ error: 'Routine not found' }, { status: 404 });
    }

    // Delete routine (cascade will delete steps and completions)
    const { error: deleteError } = await supabase
      .from('routines')
      .delete()
      .eq('id', routineId);

    if (deleteError) {
      console.error('Error deleting routine:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
