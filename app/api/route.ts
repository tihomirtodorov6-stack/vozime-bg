import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ypfbljjrpppkdxdftjcv.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "";

export async function POST(req: NextRequest) {
  try {
    if (!SUPABASE_SERVICE_KEY) {
      return NextResponse.json({ error: 'Липсва SUPABASE_SERVICE_ROLE_KEY в env' }, { status: 500 });
    }

    const { email, code, firstName, lastName, phone, cleanPhone } = await req.json();
    if (!email || !code) return NextResponse.json({ error: 'Липсва имейл или код' }, { status: 400 });

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: codeData, error: codeError } = await supabaseAdmin
      .from('email_codes')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .eq('code', code)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (codeError) throw codeError;
    if (!codeData) return NextResponse.json({ error: 'Грешен или изтекъл код' }, { status: 400 });

    await supabaseAdmin.from('email_codes').update({ used: true }).eq('id', codeData.id);

    const { data: newUser, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        first_name: firstName,
        last_name: lastName,
        phone: phone,
        clean_phone: cleanPhone || codeData.clean_phone,
        email: email.toLowerCase().trim(),
        is_verified: true
      })
      .select()
      .single();

    if (userError) {
      if (userError.code === '23505') {
        const { data: existing } = await supabaseAdmin.from('users').select('*').eq('clean_phone', cleanPhone).limit(1).maybeSingle();
        if (existing) return NextResponse.json({ user: existing });
      }
      throw userError;
    }

    return NextResponse.json({ user: newUser });

  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}