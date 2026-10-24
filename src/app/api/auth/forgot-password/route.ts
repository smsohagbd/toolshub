import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { sendEmail, getPasswordResetOtpEmailHtml } from "@/lib/smtp";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "অনুগ্রহ করে একটি সঠিক ইমেইল অ্যাড্রেস প্রদান করুন।" }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const db = getDB();

    const user = await db.prepare("SELECT id, name, email FROM users WHERE LOWER(TRIM(email)) = ? LIMIT 1")
      .bind(cleanEmail)
      .first();

    if (!user) {
      return NextResponse.json({ error: "এই ইমেইল দিয়ে কোনো অ্যাকাউন্ট পাওয়া যায়নি।" }, { status: 404 });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins

    // Store in DB
    await db.prepare("UPDATE users SET reset_otp_code = ?, reset_otp_expires_at = ? WHERE id = ?")
      .bind(otp, expiresAt, user.id)
      .run();

    // Send email asynchronously
    sendEmail({
      to: cleanEmail,
      subject: `পাসওয়ার্ড রিসেট ভেরিফিকেশন ওটিপি — ${otp} | ToolsHub BD`,
      html: getPasswordResetOtpEmailHtml(otp, user.name),
      event_type: "forgot_password_otp"
    }).catch((err) => console.error("Forgot password email error:", err));

    return NextResponse.json({
      success: true,
      message: "আপনার ইমেইলে একটি ৬-সংখ্যার ভেরিফিকেশন ওটিপি কোড পাঠানো হয়েছে। অনুগ্রহ করে ইনবক্স অথবা স্প্যাম ফোল্ডার চেক করুন।"
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "অনুরোধটি সম্পন্ন করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।" }, { status: 500 });
  }
}
