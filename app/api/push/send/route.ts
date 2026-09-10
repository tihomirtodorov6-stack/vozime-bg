import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ypfbljjrpppkdxdftjcv.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_NZrVv1hI7aTWVdeyZT27-Q_rWp_olMG";
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "BOiQJuMcrymGhCPSa_nJ_DEy59MVXeAMKnaYg0ZzOXSeq_JAP1etzRwMWQ9yeJl6uixhpYsfQ7bDsKpokrh0dk4";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "iPvr5llODpsFKjFIhxgd4RRF6g8AHpPYHvbZIDOeLBk";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:vozime@example.com";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { targetPhone, title, body: messageBody, orderId } = body;

    if (!targetPhone || !title) {
      return NextResponse.json({ error: 'Missing targetPhone or title' }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const cleanTarget = targetPhone.replace(/[^0-9]/g, '').slice(-10);
    
    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .or(`clean_phone.eq.${cleanTarget},clean_phone.eq.${targetPhone}`);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!subs || subs.length === 0) return NextResponse.json({ error: 'No subscriptions', phone: cleanTarget }, { status: 404 });

    let webpush: any;
    try {
      webpush = await import('web-push');
      webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    } catch (e) {
      return NextResponse.json({ success: true, fallback: true, subscriptions: subs.length });
    }

    const payload = JSON.stringify({
      title: title,
      body: messageBody || 'Нова нотификация от VoziMe',
      orderId: orderId || null,
      icon: '/icon-512.png'
    });

    const results = [];
    for (const subRow of subs) {
      try {
        await webpush.sendNotification(subRow.subscription, payload);
        results.push({ phone: subRow.clean_phone, success: true });
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase.from('push_subscriptions').delete().eq('id', subRow.id);
        }
        results.push({ phone: subRow.clean_phone, success: false, error: err.message });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}