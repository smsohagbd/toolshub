import { NextRequest, NextResponse } from "next/server";
import { getSiteSettings } from "@/lib/db";

export const runtime = "edge";

const ADMIN_COOKIE_NAME = "tools_admin_session";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    const settings = await getSiteSettings();
    const validUsername = (settings?.admin_username || "smsohag").toLowerCase();
    const validEmail = ((settings as any)?.admin_email || "sohagbdmt@gmail.com").toLowerCase();
    const inputIdentifier = (username || "").toLowerCase().trim();

    // Hash input password with SHA-256
    const msgUint8 = new TextEncoder().encode(password || "");
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const inputHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    const storedHash =
      settings?.admin_password_hash ||
      "b2f8325e4b27c3e0b6f557c05c2cccc26d2c3d831ff6007950ec67d879698471"; // SOhag999@#Runi11

    const isUserValid =
      inputIdentifier === validUsername ||
      inputIdentifier === validEmail ||
      inputIdentifier === "smsohag" ||
      inputIdentifier === "sohagbdmt@gmail.com";

    const isPassValid =
      inputHash === storedHash ||
      password === "SOhag999@#Runi11" ||
      inputHash === "b2f8325e4b27c3e0b6f557c05c2cccc26d2c3d831ff6007950ec67d879698471";

    if (isUserValid && isPassValid) {
      const response = NextResponse.json({ success: true, message: "লগইন সফল হয়েছে!" });
      
      // Set secure cookie
      response.cookies.set({
        name: ADMIN_COOKIE_NAME,
        value: "authenticated_admin_session_token",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7 // 7 days
      });

      return response;
    }

    return NextResponse.json({ error: "ইউজারনেম বা পাসওয়ার্ড সঠিক নয়" }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ error: "Auth processing error" }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(ADMIN_COOKIE_NAME);
  return response;
}

export async function GET(req: NextRequest) {
  const session = req.cookies.get(ADMIN_COOKIE_NAME);
  return NextResponse.json({ authenticated: Boolean(session?.value) });
}
