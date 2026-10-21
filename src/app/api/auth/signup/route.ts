import { NextRequest, NextResponse } from "next/server";
import { createUser, findUserByEmail } from "@/lib/db";
import { hashPassword, createSessionToken, USER_COOKIE_NAME } from "@/lib/auth";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password } = body;

    // Validate minimal fields
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json({ error: "অনুগ্রহ করে আপনার পুরো নাম লিখুন।" }, { status: 400 });
    }

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "অনুগ্রহ করে একটি সঠিক ইমেইল অ্যাড্রেস লিখুন।" }, { status: 400 });
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json({ error: "পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।" }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existing = await findUserByEmail(cleanEmail);
    if (existing) {
      return NextResponse.json(
        { error: "এই ইমেইলটি দিয়ে ইতিমধ্যে অ্যাকাউন্ট খোলা আছে। অনুগ্রহ করে লগইন করুন।" },
        { status: 409 }
      );
    }

    // Hash password securely
    const password_hash = await hashPassword(password);
    const userId = "usr_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

    const newUser = {
      id: userId,
      name: name.trim(),
      email: cleanEmail,
      password_hash,
      role: "customer"
    };

    await createUser(newUser);

    // Send Welcome Email asynchronously
    try {
      const { sendEmail, getWelcomeEmailHtml } = await import("@/lib/smtp");
      sendEmail({
        to: cleanEmail,
        subject: `ToolsHub BD-তে স্বাগতম, ${name.trim()}!`,
        html: getWelcomeEmailHtml(name.trim(), cleanEmail),
        event_type: "user_signup"
      }).catch((e) => console.error("Welcome email async error:", e));
    } catch (mailErr) {
      console.error("Welcome email error:", mailErr);
    }

    // Create session token
    const token = await createSessionToken({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role
    });

    const response = NextResponse.json({
      success: true,
      message: "অ্যাকাউন্ট সফলভাবে তৈরি করা হয়েছে!",
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      },
      token
    });

    // Set secure auth cookie
    response.cookies.set({
      name: USER_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30 // 30 days
    });

    return response;
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "সাইনআপ প্রক্রিয়ায় ত্রুটি হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।" },
      { status: 500 }
    );
  }
}
