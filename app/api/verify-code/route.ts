import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ypfbljjrpppkdxdftjcv.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export async function POST(req: NextRequest) {
  try {
    if (!SUPABASE_SERVICE_KEY) {
      return NextResponse.json({ error: 'Липсва SERVICE_ROLE_KEY' }, { status: 500 });
    }
    
    const body = await req.json();
    const email = (body.email || '').toLowerCase().trim();
    const code = (body.code || '').toString().trim();
    const { firstName, lastName, phone, cleanPhone } = body;

    if (!email || !code) {
      return NextResponse.json({ error: 'Липсва имейл или код' }, { status: 400 });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // 1. Намери кода - без филтър used за по-добро debug
    const { data: codeData, error: codeErr } = await supabaseAdmin
      .from('email_codes')
      .select('*')
      .eq('email', email)
      .eq('code', code)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (codeErr) {
      return NextResponse.json({ error: 'DB грешка: ' + codeErr.message }, { status: 500 });
    }

    if (!codeData) {
      // Провери дали има изобщо код за този имейл
      const { data: anyCode } = await supabaseAdmin.from('email_codes').select('code, expires_at, used').eq('email', email).order('created_at',{ascending:false}).limit(1).maybeSingle();
      if (anyCode) {
        return NextResponse.json({ error: `Кодът не съвпада. Последен код за ${email} е ${anyCode.code} (въведен: ${code})` }, { status: 400 });
      }
      return NextResponse.json({ error: 'Няма код за този имейл. Поискай нов код.' }, { status: 400 });
    }

    // Провери дали е използван
    if (codeData.used) {
      return NextResponse.json({ error: 'Кодът вече е използван. Поискай нов.' }, { status: 400 });
    }

    // Провери дали е изтекъл
    if (new Date(codeData.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Кодът е изтекъл (10 мин). Поискай нов.' }, { status: 400 });
    }

    // 2. Маркирай като използван
    await supabaseAdmin.from('email_codes').update({ used: true }).eq('id', codeData.id);

    // 3. Създай или вземи потребител - upsert по clean_phone за да не гърми ако съществува
    const cPhone = (cleanPhone || '').replace(/[^0-9]/g,'').slice(-10);
    
    // Първо провери дали съществува
    const { data: existingUser } = await supabaseAdmin.from('users').select('*').eq('clean_phone', cPhone).maybeSingle();
    
    let userToReturn;
    if (existingUser) {
      // Ако съществува - върни го
      userToReturn = existingUser;
    } else {
      // Ако не - създай нов
      const { data: newUser, error: insertErr } = await supabaseAdmin.from('users').insert({
        first_name: firstName,
        last_name: lastName,
        phone: phone,
        clean_phone: cPhone,
        email: email,
        is_verified: true
      }).select().single();
      
      if (insertErr) {
        return NextResponse.json({ error: 'Грешка при създаване на потребител: ' + insertErr.message }, { status: 500 });
      }
      userToReturn = newUser;
    }

    return NextResponse.json({ user: userToReturn });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}