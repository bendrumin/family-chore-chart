import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

// Hash a PIN using SHA-256
function hashPin(pin: string): string {
  return crypto.createHash('sha256').update(pin).digest('hex');
}

// POST /api/child-pin/verify - Verify a child's PIN
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const body = await request.json();
    const { pin } = body;

    if (!pin) {
      return NextResponse.json({ error: 'PIN is required' }, { status: 400 });
    }

    // Validate PIN format (4-6 digits)
    if (!/^\d{4,6}$/.test(pin)) {
      return NextResponse.json({ error: 'Invalid PIN format' }, { status: 400 });
    }

    // Hash the PIN
    const pinHash = hashPin(pin);

    // Find child with matching PIN
    const { data, error } = await supabase
      .from('child_pins')
      .select(`
        child_id,
        children (
          id,
          name,
          avatar_color,
          avatar_url,
          avatar_file
        )
      `)
      .eq('pin_hash', pinHash)
      .single();

    if (error || !data || !data.children) {
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      child: data.children,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
