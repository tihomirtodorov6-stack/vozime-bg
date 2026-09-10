import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ypfbljjrpppkdxdftjcv.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
export async function POST(req: NextRequest) {
  try {
    if (!SUPABASE_SERVICE_KEY) return NextResponse.json({ error: 'Липсва SERVICE_ROLE_KEY' }, { status: 500 });
    const { email, code, firstName, phone, cleanPhone } = await req.json();
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    await supabaseAdmin.from('email_codes').upsert({ email: email.toLowerCase().trim(), code, clean_phone: cleanPhone||null, expires_at: new Date(Date.now()+10*60*1000).toISOString(), used: false }, { onConflict: 'email' });
    return NextResponse.json({ success: true, mode: 'test_mode', codeForTesting: code });
  } catch (e:any){ return NextResponse.json({ error: e.message }, { status: 500 }); }
}