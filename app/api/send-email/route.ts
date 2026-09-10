import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ypfbljjrpppkdxdftjcv.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "";

export async function POST(req: NextRequest) {
  try {
    if (!SUPABASE_SERVICE_KEY) {
      return NextResponse.json({ error: 'Липсва SUPABASE_SERVICE_ROLE_KEY в env - добави го в Vercel Environment Variables' }, { status: 500 });
    }

    const { email, code, firstName, phone, cleanPhone } = await req.json();
    if (!email || !code) {
      return NextResponse.json({ error: 'Missing email or code' }, { status: 400 });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { error: insertError } = await supabaseAdmin
      .from('email_codes')
      .upsert({
        email: email.toLowerCase().trim(),
        code: code,
        clean_phone: cleanPhone || null,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        used: false
      }, { onConflict: 'email' });

    if (insertError) {
      console.error('Insert email_codes error:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'VoziMe <no-reply@vozime.bg>',
          to: [email],
          subject: `VoziMe код: ${code}`,
          html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px;background:#f9f9f9;border-radius:16px"><h2>Здравей, ${firstName||''}!</h2><p>Твоят код:</p><div style="font-size:32px;font-weight:900;letter-spacing:6px;background:#000;color:#fff;padding:16px 24px;border-radius:12px;text-align:center;margin:20px 0">${code}</div><p style="color:#666;font-size:14px">Важи 10 мин.</p></div>`,
        }),
      });
      return NextResponse.json({ success: true, mode: 'email_sent' });
    }

    return NextResponse.json({ success: true, mode: 'test_mode', codeForTesting: code });

  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}