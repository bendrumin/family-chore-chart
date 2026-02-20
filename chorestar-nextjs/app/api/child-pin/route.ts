import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

// Generate a random salt
function generateSalt(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Hash a PIN using SHA-256 with salt
function hashPin(pin: string, salt: string): string {
  return crypto.createHash('sha256').update(`${pin}${salt}`).digest('hex');
}

// POST /api/child-pin - Set or update a child's PIN
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const childId = body.childId;
    const pin = String(body.pin ?? '').replace(/\D/g, '');

    if (!childId || !pin) {
      return NextResponse.json({ error: 'childId and pin are required' }, { status: 400 });
    }

    // Validate PIN (4-6 digits)
    if (!/^\d{4,6}$/.test(pin)) {
      return NextResponse.json({ error: 'PIN must be 4-6 digits' }, { status: 400 });
    }

    // Verify child belongs to user
    const { data: child, error: childError } = await supabase
      .from('children')
      .select('id')
      .eq('id', childId)
      .eq('user_id', user.id)
      .single();

    if (childError || !child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }

    // Generate new salt for this PIN
    const salt = generateSalt();

    // Hash the PIN with salt
    const pinHash = hashPin(pin, salt);

    // Use service role for upsert to avoid RLS/session issues in API route context
    // (We've already verified child belongs to user above)
    let admin;
    try {
      admin = createServiceRoleClient();
    } catch (e) {
      console.error('child-pin: Service role client failed. Ensure SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY is set in .env.local');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase infers 'never' for child_pins upsert; schema is correct
    const { error: upsertError } = await admin.from('child_pins').upsert(
      {
        child_id: childId,
        pin_hash: pinHash,
        pin_salt: salt,
        failed_attempts: 0,
        locked_until: null,
      } as any,
      { onConflict: 'child_id' }
    );

    if (upsertError) {
      console.error('Failed to set PIN:', upsertError);
      return NextResponse.json({ error: 'Failed to set PIN' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('child-pin POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/child-pin - Remove a child's PIN
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('childId');

    if (!childId) {
      return NextResponse.json({ error: 'childId is required' }, { status: 400 });
    }

    // Verify child belongs to user
    const { data: child, error: childError } = await supabase
      .from('children')
      .select('id')
      .eq('id', childId)
      .eq('user_id', user.id)
      .single();

    if (childError || !child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }

    // Use service role for delete (same pattern as upsert)
    const admin = createServiceRoleClient();
    const { error: deleteError } = await admin
      .from('child_pins')
      .delete()
      .eq('child_id', childId);

    if (deleteError) {
      console.error('Error deleting child PIN:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
