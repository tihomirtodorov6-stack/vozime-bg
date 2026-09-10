import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ypfbljjrpppkdxdftjcv.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export async function POST(req: NextRequest) {
  try {
    if (!SUPABASE_SERVICE_KEY) {
      return NextResponse.json({ error: 'Липсва SERVICE_ROLE_KEY в Vercel' }, { status: 500 });
    }
    const { email, code, firstName, phone, cleanPhone } = await req.json();
    const emailLow = (email || '').toLowerCase().trim();
    
    if (!emailLow || !code) {
      return NextResponse.json({ error: 'Липсва имейл или код' }, { status: 400 });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    // Изтрий стари кодове за този имейл и после вкарай нов - не ползваме upsert за да няма нужда от UNIQUE constraint
    await supabaseAdmin.from('email_codes').delete().eq('email', emailLow);
    
    const { error } = await supabaseAdmin.from('email_codes').insert({
      email: emailLow,
      code: code.toString().trim(),
      clean_phone: cleanPhone || null,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      used: false
    });

    if (error) {
      return NextResponse.json({ error: 'DB грешка при запис: ' + error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, mode: 'test_mode', codeForTesting: code });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}