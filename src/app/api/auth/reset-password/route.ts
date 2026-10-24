import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { sendEmail, getPasswordChangedSuccessEmailHtml } from "@/lib/smtp";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, otp_code, new_password } = body;

    if (!email || !otp_code || !new_password) {
      return NextResponse.json({ error: "ইমেইল, ওটিপি কোড এবং নতুন পাসওয়ার্ড সবকটি আবশ্যক।" }, { status: 400 });
    }

    if (typeof new_password !== "string" || new_password.length < 6) {
      return NextResponse.json({ error: "পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।" }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanOtp = String(otp_code).trim();
    const db = getDB();

    const user = await db.prepare("SELECT * FROM users WHERE LOWER(TRIM(email)) = ? LIMIT 1")
      .bind(cleanEmail)
      .first();

    if (!user) {
      return NextResponse.json({ error: "ইউজার খুঁজে পাওয়া যায়নি।" }, { status: 404 });
    }

    if (!user.reset_otp_code || user.reset_otp_code.trim() !== cleanOtp) {
      return NextResponse.json({ error: "ভেরিফিকেশন ওটিপি কোডটি সঠিক নয়।" }, { status: 400 });
    }

    if (user.reset_otp_expires_at) {
      const expTime = new Date(user.reset_otp_expires_at).getTime();
      if (Date.now() > expTime) {
        return NextResponse.json({ error: "ওটিপি কোডটির মেয়াদ শেষ হয়ে গেছে। অনুগ্রহ করে নতুন কোড রিকোয়েস্ট করুন।" }, { status: 400 });
      }
    }

    // Hash new password
    const newHash = await hashPassword(new_password);

    // Update in database and invalidate OTP
    await db.prepare("UPDATE users SET password_hash = ?, reset_otp_code = NULL, reset_otp_expires_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .bind(newHash, user.id)
      .run();

    // Send confirmation email
    sendEmail({
      to: cleanEmail,
      subject: `আপনার পাসওয়ার্ড সফলভাবে পরিবর্তিত হয়েছে | ToolsHub BD`,
      html: getPasswordChangedSuccessEmailHtml(user.name),
      event_type: "password_reset_success"
    }).catch((err) => console.error("Password reset success email error:", err));

    return NextResponse.json({
      success: true,
      message: "আপনার অ্যাকাউন্টের পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে! এখন লগইন করুন।"
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।" }, { status: 500 });
  }
}
