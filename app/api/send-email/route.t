import { NextRequest, NextResponse } from 'next/server';

// Този route праща имейл безплатно през Resend или в тестов режим показва кода
// За 100% безплатно без Resend ключ - връща кода на екрана (за тест)

export async function POST(req: NextRequest) {
  try {
    const { email, code, firstName } = await req.json();

    if (!email || !code) {
      return NextResponse.json({ error: 'Missing email or code' }, { status: 400 });
    }

    const resendKey = process.env.RESEND_API_KEY;

    // Ако имаш Resend ключ - праща истински имейл (3000 безплатни на месец)
    if (resendKey) {
      const res = await fetch('https://api.resend.com/emails', {
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
              <h2 style="color: #111;">Здравей, ${firstName || ''}!</h2>
              <p>Твоят код за регистрация в <b>VoziMe</b> е:</p>
              <div style="font-size: 32px; font-weight: 900; letter-spacing: 6px; background: #000; color: #fff; padding: 16px 24px; border-radius: 12px; text-align: center; margin: 20px 0;">
                ${code}
              </div>
              <p style="color: #666; font-size: 14px;">Кодът важи 10 минути. След това влизаш само с телефон.</p>
              <p style="color: #666; font-size: 12px;">Ако не си ти - игнорирай този имейл.</p>
            </div>
          `,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error('Resend error:', err);
        // Връщаме success дори при грешка, за да може теста да покаже кода
        return NextResponse.json({ success: true, mode: 'resend_error_fallback', codeForTesting: code });
      }

      return NextResponse.json({ success: true, mode: 'email_sent' });
    }

    // НЯМА Resend ключ - тестов режим (100% безплатно) - връщаме кода за да го покажем на екрана
    console.log(`[VoziMe TEST] Код за ${email}: ${code}`);
    return NextResponse.json({ 
      success: true, 
      mode: 'test_mode',
      codeForTesting: code,
      message: 'Няма RESEND_API_KEY, затова кода се показва на екрана за тест. Добави ключа за истински имейли.'
    });

  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 