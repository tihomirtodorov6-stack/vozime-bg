import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { email, code, firstName } = await req.json();

    if (!email || !code) {
      return NextResponse.json({ error: 'Missing email or code' }, { status: 400 });
    }

    // Админ клиент - има право да пише в email_codes въпреки че е заключена
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Записваме кода в базата - сигурно, през сървъра
    const { error: insertError } = await supabaseAdmin
      .from('email_codes')
      .upsert({ 
        email: email.toLowerCase().trim(),
        code: code,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 мин
      }, { onConflict: 'email' });

    if (insertError) {
      console.error('Insert email_codes error:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // 2. Пращаме имейла (същия ти код)
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
          html: `
            <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; background: #f9f9f9; border-radius: 16px;">
              <h2>Здравей, ${firstName || ''}!</h2>
              <p>Твоят код за VoziMe е:</p>
              <div style="font-size: 32px; font-weight: 900; letter-spacing: 6px; background: #000; color: #fff; padding: 16px 24px; border-radius: 12px; text-align: center; margin: 20px 0;">
                ${code}
              </div>
              <p style="color: #666; font-size: 14px;">Кодът важи 10 минути.</p>
            </div>
          `,
        }),
      });
      return NextResponse.json({ success: true, mode: 'email_sent' });
    }

    // Тестов режим без Resend
    return NextResponse.json({ success: true, mode: 'test_mode', codeForTesting: code });

  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}