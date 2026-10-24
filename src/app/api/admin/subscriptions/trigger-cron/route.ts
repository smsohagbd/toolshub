import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { sendEmail, getSubscriptionReminderEmailHtml } from "@/lib/smtp";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const db = getDB();
    const sRes = await db.prepare("SELECT * FROM subscriptions WHERE status = 'active'").all();
    const subs = sRes.results || [];
    let sent = 0;
    let expired = 0;
    const now = Date.now();
    const todayDateStr = new Date().toISOString().slice(0, 10);

    for (const sub of subs) {
      const expTime = new Date(sub.expiry_date).getTime();
      const diffMs = expTime - now;
      const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (daysLeft === 3 || daysLeft === 1) {
        const milestone = daysLeft === 3 ? "3days" : "1day";
        const eventType = `sub_reminder_${milestone}_${sub.id}_${todayDateStr}`;

        const existing = await db.prepare(
          "SELECT id FROM email_logs WHERE recipient = ? AND event_type = ? LIMIT 1"
        ).bind(sub.user_email, eventType).first();

        if (!existing) {
          const isUrgent = daysLeft === 1;
          const subject = isUrgent
            ? `🚨 জরুরি: আগামীকাল "${sub.product_title}" সাবস্ক্রিপশনের মেয়াদ শেষ হচ্ছে!`
            : `⚠️ সাবস্ক্রিপশন রিমাইন্ডার: ৩ দিন পর "${sub.product_title}" এর মেয়াদ শেষ হবে`;

          await sendEmail({
            to: sub.user_email,
            subject,
            html: getSubscriptionReminderEmailHtml(sub, daysLeft),
            event_type: eventType
          });
          sent++;
        }
      } else if (daysLeft <= 0) {
        await db.prepare("UPDATE subscriptions SET status = 'expired', updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(sub.id).run();
        expired++;

        const eventType = `sub_expired_${sub.id}_${todayDateStr}`;
        const existing = await db.prepare(
          "SELECT id FROM email_logs WHERE recipient = ? AND event_type = ? LIMIT 1"
        ).bind(sub.user_email, eventType).first();

        if (!existing) {
          await sendEmail({
            to: sub.user_email,
            subject: `⌛ আপনার "${sub.product_title}" সাবস্ক্রিপশনের মেয়াদ শেষ হয়েছে`,
            html: getSubscriptionReminderEmailHtml(sub, 0),
            event_type: eventType
          });
          sent++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `সাবস্ক্রিপশন ক্রন সফলভাবে রান হয়েছে! ${sent} টি ইমেইল রিমাইন্ডার পাঠানো হয়েছে।`,
      processed: subs.length,
      notifications_sent: sent,
      expired_count: expired
    });
  } catch (err: any) {
    console.error("Cron trigger error:", err);
    return NextResponse.json({ error: err.message || "Failed to trigger cron" }, { status: 500 });
  }
}
