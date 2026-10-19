import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { DEFAULT_DAILY_REWARD_CENTS } from '@/lib/utils/earnings';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { validateKidToken } from '@/lib/utils/kid-auth';
import type { Database } from '@/lib/supabase/database.types';
import { ownerOfChild, isFamilyPremium, withStepPhotoUrls } from '@/lib/routines/server';
import { allowedStepImagePath } from '@/lib/routines/step-photos';
import { MIN_TARGET_SECONDS, MAX_TARGET_SECONDS } from '@/lib/routines/routine-timer';

type Routine = Database['public']['Tables']['routines']['Row'];
type RoutineInsert = Database['public']['Tables']['routines']['Insert'];

// Input validation schemas
const routineStepSchema = z.object({
  title: z.string().min(1, 'Step title is required').max(200, 'Step title too long'),
  description: z.string().max(500).nullable().optional(),
  icon: z.string().max(50).optional(),
  order_index: z.number().int().min(0).optional(),
  duration_seconds: z.number().int().min(0).max(7200).nullable().optional(),
  // Picture step (Premium, migration 032): a path returned by /api/routines/step-photo.
  image_path: z.string().max(300).nullable().optional(),
});

const createRoutineSchema = z.object({
  routine: z.object({
    child_id: z.string().uuid('Invalid child ID'),
    name: z.string().min(1, 'Routine name is required').max(100, 'Routine name too long'),
    type: z.enum(['morning', 'bedtime', 'afterschool', 'custom']).optional(),
    icon: z.string().max(50).optional(),
    color: z.string().max(20).optional(),
    reward_cents: z.number().int().min(0).max(10000).optional(),
    is_active: z.boolean().optional(),
    // Migration 032. Sent only when set, so an unmigrated database still saves.
    auto_read_aloud: z.boolean().optional(),
    target_duration_seconds: z.number().int().min(MIN_TARGET_SECONDS).max(MAX_TARGET_SECONDS).nullable().optional(),
  }),
  steps: z.array(routineStepSchema).max(50, 'Too many steps (max 50)').optional(),
});

// GET /api/routines - Get routines for a child.
// Supports two modes:
//   • Parent (authenticated): returns all routines for their children, with ownership check.
//   • Kid mode (no session): requires childId param, returns active routines via service role (read-only).
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('childId');

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Kid mode: no auth session but childId provided → validate kid token, then service role read-only
    if (!user) {
      if (!childId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const kidSession = await validateKidToken(request, childId);
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
        .eq('child_id', childId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching routines (kid mode):', error);
        return NextResponse.json({ error: 'Failed to fetch routines' }, { status: 500 });
      }

      // Fetch today's completions for this child so we can mark routines as done
      const today = new Date().toISOString().split('T')[0];
      const { data: completions } = await serviceClient
        .from('routine_completions')
        .select('routine_id')
        .eq('child_id', childId)
        .eq('date', today);

      const completedRoutineIds = new Set(
        (completions || []).map((c: any) => c.routine_id)
      );

      const ownerId = await ownerOfChild(childId, serviceClient);
      const withPhotos = await withStepPhotoUrls((data || []) as any[], ownerId, serviceClient);
      const sorted = withPhotos.map((routine: any) => ({
        ...routine,
        completedToday: completedRoutineIds.has(routine.id),
      }));
      return NextResponse.json(sorted);
    }

    // Parent mode: authenticated user, ownership check via children join
    let query = supabase
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
      .eq('children.user_id', user.id)
      .order('created_at', { ascending: false });

    if (childId) {
      query = query.eq('child_id', childId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching routines:', error);
      return NextResponse.json({ error: 'Failed to fetch routines' }, { status: 500 });
    }

    // Parent mode only lists the caller's own children, so the owner is the caller.
    const routinesWithSortedSteps = await withStepPhotoUrls((data || []) as any[], user.id);

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

    // Validate input
    const parsed = createRoutineSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message || 'Invalid input';
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { routine, steps } = parsed.data;

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

    const defaultRewardCents = settings?.daily_reward_cents ?? DEFAULT_DAILY_REWARD_CENTS;

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

    // Premium extras (migration 032). Keys are only added when set, so a
    // database without 032 keeps saving plain routines.
    const premium = await isFamilyPremium(user.id);
    if (routine.auto_read_aloud) routineInsert.auto_read_aloud = true;
    if (premium && routine.target_duration_seconds) {
      routineInsert.target_duration_seconds = routine.target_duration_seconds;
    }

    const { data: newRoutine, error: routineError } = await supabase
      .from('routines')
      .insert(routineInsert)
      .select()
      .single();

    if (routineError || !newRoutine) {
      console.error('Error creating routine:', routineError);
      return NextResponse.json({ error: 'Failed to create routine' }, { status: 500 });
    }

    // Create routine steps if provided
    if (steps && steps.length > 0) {
      const noExisting = new Set<string>();
      const stepsToInsert = steps.map((step, index) => {
        const imagePath = allowedStepImagePath(step.image_path, {
          ownerId: user.id,
          childId: routine.child_id,
          premium,
          existing: noExisting,
        });
        return {
          routine_id: newRoutine.id,
          title: step.title,
          description: step.description || null,
          icon: step.icon || 'check',
          order_index: step.order_index ?? index,
          duration_seconds: step.duration_seconds || null,
          ...(imagePath ? { image_path: imagePath } : {}),
        };
      });

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
        routine_steps (*)
      `)
      .eq('id', newRoutine.id)
      .single();

    const [decorated] = completeRoutine ? await withStepPhotoUrls([completeRoutine as any], user.id) : [completeRoutine];
    return NextResponse.json(decorated, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
