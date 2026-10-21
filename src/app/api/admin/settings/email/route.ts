import { NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { sendEmail } from "@/lib/smtp";

export const runtime = "edge";

export async function GET() {
  try {
    const db = getDB();
    const [settingsRes, logsRes] = await Promise.all([
      db.prepare(`
        SELECT smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass,
               email_from_name, email_from_address, email_notifications_enabled
        FROM settings WHERE id = 'general'
      `).first(),
      db.prepare("SELECT * FROM email_logs ORDER BY created_at DESC LIMIT 20").all()
    ]);

    return NextResponse.json({
      success: true,
      settings: settingsRes || {},
      logs: logsRes.results || []
    });
  } catch (error: any) {
    console.error("Email settings GET error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      smtp_host,
      smtp_port,
      smtp_secure,
      smtp_user,
      smtp_pass,
      email_from_name,
      email_from_address,
      email_notifications_enabled,
      is_test,
      test_recipient
    } = body;

    const db = getDB();

    // If it's a test email trigger
    if (is_test) {
      if (!test_recipient) {
        return NextResponse.json({ success: false, error: "টেস্ট ইমেইল এড্রেস প্রদান করুন।" }, { status: 400 });
      }

      const testResult = await sendEmail(
        {
          to: test_recipient,
          subject: "ToolsHub BD — SMTP টেস্ট সফল!",
          html: `
            <div style="font-family:sans-serif; padding:20px; border:1px solid #4f46e5; border-radius:12px;">
              <h2 style="color:#4f46e5;">কনগ্রাচুলেশন! SMTP সঠিকভাবে কাজ করছে।</h2>
              <p>আপনার ToolsHub BD অ্যাডমিন প্যানেল থেকে পাঠানো টেস্ট ইমেইলটি সফলভাবে রিসিভ হয়েছে।</p>
              <p>তারিখ ও সময়: ${new Date().toLocaleString("bn-BD")}</p>
            </div>
          `,
          event_type: "smtp_test"
        },
        {
          smtp_host,
          smtp_port: Number(smtp_port || 587),
          smtp_secure: smtp_secure ? 1 : 0,
          smtp_user,
          smtp_pass,
          email_from_name,
          email_from_address
        }
      );

      return NextResponse.json(testResult);
    }

    // Save settings
    await db.prepare(`
      UPDATE settings
      SET smtp_host = ?,
          smtp_port = ?,
          smtp_secure = ?,
          smtp_user = ?,
          smtp_pass = ?,
          email_from_name = ?,
          email_from_address = ?,
          email_notifications_enabled = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = 'general'
    `).bind(
      smtp_host || "",
      Number(smtp_port || 587),
      smtp_secure ? 1 : 0,
      smtp_user || "",
      smtp_pass || "",
      email_from_name || "ToolsHub BD",
      email_from_address || "",
      email_notifications_enabled ? 1 : 0
    ).run();

    return NextResponse.json({
      success: true,
      message: "ইমেইল ও SMTP সেটিংস সফলভাবে সংরক্ষিত হয়েছে!"
    });
  } catch (error: any) {
    console.error("Email settings POST error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
