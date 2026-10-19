import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { validateKidToken } from '@/lib/utils/kid-auth';
import { ownerOfChild, isFamilyPremium, familyLanguage, withStepPhotoUrls, removeStepPhotos } from '@/lib/routines/server';
import { allowedStepImagePath, orphanedStepPhotos } from '@/lib/routines/step-photos';
import { MIN_TARGET_SECONDS, MAX_TARGET_SECONDS } from '@/lib/routines/routine-timer';

const updateRoutineSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: z.enum(['morning', 'bedtime', 'afterschool', 'custom']).optional(),
  icon: z.string().max(50).optional(),
  color: z.string().max(20).optional(),
  reward_cents: z.number().int().min(0).max(100000).optional(),
  is_active: z.boolean().optional(),
  // Migration 032. Omitted = unchanged, so an unmigrated database still saves.
  auto_read_aloud: z.boolean().optional(),
  target_duration_seconds: z.number().int().min(MIN_TARGET_SECONDS).max(MAX_TARGET_SECONDS).nullable().optional(),
}).strict();

const updateStepSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(500).nullable().optional(),
  icon: z.string().max(50).optional(),
  order_index: z.number().int().min(0).optional(),
  duration_seconds: z.number().int().min(0).max(3600).nullable().optional(),
  image_path: z.string().max(300).nullable().optional(),
});

const updateBodySchema = z.object({
  routine: updateRoutineSchema.optional(),
  steps: z.array(updateStepSchema).max(50).optional(),
});

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

    // Kid mode: no auth session → validate kid token, then service role read-only
    if (!user) {
      const kidSession = await validateKidToken(request);
      if (!kidSession) {
        return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
      }

      const serviceClient = createServiceRoleClient();

      const { data, error } = await serviceClient
        .from('routines')
        .select(`
          *,
          routine_steps (*)
        `)
        .eq('id', routineId)
        .eq('child_id', kidSession.childId)
        .single();

      if (error || !data) {
        return NextResponse.json({ error: 'Routine not found' }, { status: 404 });
      }

      // The player also needs the family's plan (finish-by timer, live view)
      // and language (read-aloud).
      const ownerId = await ownerOfChild(kidSession.childId, serviceClient);
      const [[row], premium, language] = await Promise.all([
        withStepPhotoUrls([data as any], ownerId, serviceClient),
        ownerId ? isFamilyPremium(ownerId, serviceClient) : Promise.resolve(false),
        ownerId ? familyLanguage(ownerId, serviceClient) : Promise.resolve(null),
      ]);
      return NextResponse.json({ ...row, family_premium: premium, family_language: language });
    }

    // Parent mode: authenticated user with ownership check
    const { data, error } = await supabase
      .from('routines')
      .select(`
        *,
        routine_steps (*),
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

    const [[row], premium, language] = await Promise.all([
      withStepPhotoUrls([data as any], user.id),
      isFamilyPremium(user.id),
      familyLanguage(user.id),
    ]);
    return NextResponse.json({ ...row, family_premium: premium, family_language: language });
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

    const raw = await request.json();
    const parsed = updateBodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { routine, steps } = parsed.data;

    // Verify routine belongs to user's child
    const { data: existingRoutine, error: verifyError } = await supabase
      .from('routines')
      .select('id, child_id, children!inner(user_id)')
      .eq('id', routineId)
      .single();

    if (verifyError || !existingRoutine || (existingRoutine.children as any).user_id !== user.id) {
      return NextResponse.json({ error: 'Routine not found' }, { status: 404 });
    }

    const childId = (existingRoutine as { child_id: string }).child_id;
    const premium = await isFamilyPremium(user.id);

    // Update routine
    if (routine) {
      const update: Record<string, unknown> = {
        name: routine.name,
        type: routine.type,
        icon: routine.icon,
        color: routine.color,
        reward_cents: routine.reward_cents,
        is_active: routine.is_active,
      };
      if (routine.auto_read_aloud !== undefined) update.auto_read_aloud = routine.auto_read_aloud;
      // Finish-by is Premium to set; anyone may clear it.
      if (routine.target_duration_seconds === null) update.target_duration_seconds = null;
      else if (routine.target_duration_seconds !== undefined && premium) {
        update.target_duration_seconds = routine.target_duration_seconds;
      }
      const { error: updateError } = await supabase
        .from('routines')
        .update(update)
        .eq('id', routineId);

      if (updateError) {
        console.error('Error updating routine:', updateError);
        return NextResponse.json({ error: 'Failed to update routine' }, { status: 500 });
      }
    }

    let oldStepPaths: string[] = [];
    let newStepPaths: Array<string | null | undefined> = [];

    // Update steps if provided (atomic: rollback on failure)
    if (steps) {
      // Save existing steps before deleting so we can rollback
      const { data: oldSteps } = await supabase
        .from('routine_steps')
        .select('*')
        .eq('routine_id', routineId);

      await supabase
        .from('routine_steps')
        .delete()
        .eq('routine_id', routineId);

      // Pictures already on this routine survive a save even off Premium; new
      // ones need Premium and must sit in this child's folder.
      const existingPaths = new Set<string>(
        ((oldSteps ?? []) as Array<{ image_path?: string | null }>).map(s => s.image_path).filter((p): p is string => !!p)
      );
      const stepsToInsert = steps.map((step, index) => {
        const imagePath = allowedStepImagePath(step.image_path, {
          ownerId: user.id,
          childId,
          premium,
          existing: existingPaths,
        });
        return {
          routine_id: routineId,
          title: step.title,
          description: step.description || null,
          icon: step.icon || 'check',
          order_index: step.order_index ?? index,
          duration_seconds: step.duration_seconds || null,
          ...(imagePath ? { image_path: imagePath } : {}),
        };
      });
      newStepPaths = stepsToInsert.map(s => ('image_path' in s ? s.image_path : null));
      oldStepPaths = [...existingPaths];

      if (steps.length > 0) {

        const { error: stepsError } = await supabase
          .from('routine_steps')
          .insert(stepsToInsert);

        if (stepsError) {
          console.error('Error inserting new routine steps:', stepsError);
          // Rollback: re-insert old steps
          if (oldSteps && oldSteps.length > 0) {
            await supabase.from('routine_steps').insert(oldSteps);
          }
          return NextResponse.json({ error: 'Failed to update routine steps' }, { status: 500 });
        }
      }
    }

    // Pictures the new steps dropped.
    if (steps) await removeStepPhotos(orphanedStepPhotos(oldStepPaths, newStepPaths));

    // Fetch updated routine
    const { data: updatedRoutine } = await supabase
      .from('routines')
      .select(`
        *,
        routine_steps (*)
      `)
      .eq('id', routineId)
      .single();

    const [decorated] = updatedRoutine ? await withStepPhotoUrls([updatedRoutine as any], user.id) : [updatedRoutine];
    return NextResponse.json(decorated);
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

    // Remember its pictures; the cascade drops the rows, not the objects.
    const { data: photoRows } = await supabase
      .from('routine_steps')
      .select('*')
      .eq('routine_id', routineId);

    // Delete routine (cascade will delete steps and completions)
    const { error: deleteError } = await supabase
      .from('routines')
      .delete()
      .eq('id', routineId);

    if (deleteError) {
      console.error('Error deleting routine:', deleteError);
      return NextResponse.json({ error: 'Failed to delete routine' }, { status: 500 });
    }

    await removeStepPhotos(
      ((photoRows ?? []) as Array<{ image_path?: string | null }>).map(r => r.image_path).filter((p): p is string => !!p)
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
