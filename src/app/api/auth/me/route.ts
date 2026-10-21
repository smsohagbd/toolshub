import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, USER_COOKIE_NAME } from "@/lib/auth";
import { findUserByEmail } from "@/lib/db";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  try {
    // 1. Try Cookie
    let token = req.cookies.get(USER_COOKIE_NAME)?.value;

    // 2. Try Authorization Header fallback
    if (!token) {
      const authHeader = req.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    const payload = await verifySessionToken(token);
    if (!payload) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    // Optionally retrieve fresh user info
    const user = await findUserByEmail(payload.email);
    if (!user) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role || "customer"
      }
    });
  } catch (error) {
    return NextResponse.json({ authenticated: false, user: null });
  }
}
