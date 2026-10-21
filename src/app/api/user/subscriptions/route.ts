import { NextResponse } from "next/server";
import { getDB } from "@/lib/db";

export const runtime = "edge";

export async function GET(request: Request) {
  try {
    const cookieHeader = request.headers.get("cookie") || "";
    let customerEmail: string | null = null;

    // Extract customer session
    const match = cookieHeader.match(/tools_customer_session=([^;]+)/);
    if (match) {
      try {
        const decoded = JSON.parse(decodeURIComponent(escape(atob(match[1]))));
        customerEmail = decoded.email;
      } catch (e) {
        // invalid token
      }
    }

    if (!customerEmail) {
      return NextResponse.json({ success: false, error: "অননুমোদিত" }, { status: 401 });
    }

    const db = getDB();
    const res = await db.prepare("SELECT * FROM subscriptions WHERE user_email = ? ORDER BY created_at DESC").bind(customerEmail).all();
    const subs = res.results || [];

    const now = Date.now();
    const processedSubs = subs.map((s: any) => {
      const expiry = new Date(s.expiry_date).getTime();
      const diffMs = expiry - now;
      const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      return {
        ...s,
        days_remaining: daysRemaining,
        is_expired: daysRemaining <= 0,
        status: daysRemaining <= 0 && s.status === "active" ? "expired" : s.status
      };
    });

    return NextResponse.json({
      success: true,
      subscriptions: processedSubs
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
