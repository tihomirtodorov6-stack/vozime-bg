import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ypfbljjrpppkdxdftjcv.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
export async function POST(req: NextRequest) {
  try {
    if (!SUPABASE_SERVICE_KEY) return NextResponse.json({ error: 'Липсва SERVICE_ROLE_KEY' }, { status: 500 });
    const { email, code, firstName, lastName, phone, cleanPhone } = await req.json();
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: codeData } = await supabaseAdmin.from('email_codes').select('*').eq('email', email.toLowerCase().trim()).eq('code', code).eq('used', false).gt('expires_at', new Date().toISOString()).order('created_at',{ascending:false}).limit(1).maybeSingle();
    if (!codeData) return NextResponse.json({ error: 'Грешен или изтекъл код' }, { status: 400 });
    await supabaseAdmin.from('email_codes').update({ used: true }).eq('id', codeData.id);
    const { data: newUser } = await supabaseAdmin.from('users').insert({ first_name: firstName, last_name: lastName, phone, clean_phone: cleanPhone||codeData.clean_phone, email: email.toLowerCase().trim(), is_verified: true }).select().single();
    return NextResponse.json({ user: newUser });
  } catch (e:any){ return NextResponse.json({ error: e.message }, { status: 500 }); }
}