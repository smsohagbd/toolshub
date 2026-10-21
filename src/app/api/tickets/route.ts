import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { verifySessionToken, USER_COOKIE_NAME } from "@/lib/auth";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  try {
    let token = req.cookies.get(USER_COOKIE_NAME)?.value;
    if (!token) {
      const authHeader = req.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return NextResponse.json({ error: "লগইন করা আবশ্যক" }, { status: 401 });
    }

    const payload = await verifySessionToken(token);
    if (!payload || !payload.email) {
      return NextResponse.json({ error: "সেশন মেয়াদোত্তীর্ণ হয়েছে" }, { status: 401 });
    }

    const db = getDB();
    const res = await db
      .prepare("SELECT * FROM support_tickets WHERE user_email = ? ORDER BY created_at DESC")
      .bind(payload.email.toLowerCase().trim())
      .all();

    return NextResponse.json({
      success: true,
      tickets: res.results || []
    });
  } catch (error) {
    console.error("Fetch tickets error:", error);
    return NextResponse.json({ error: "টিকিট লোড করতে সমস্যা হয়েছে" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    let token = req.cookies.get(USER_COOKIE_NAME)?.value;
    if (!token) {
      const authHeader = req.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return NextResponse.json({ error: "টিকিট খুলতে অনুগ্রহ করে লগইন করুন" }, { status: 401 });
    }

    const payload = await verifySessionToken(token);
    if (!payload || !payload.email) {
      return NextResponse.json({ error: "সেশন মেয়াদোত্তীর্ণ হয়েছে" }, { status: 401 });
    }

    const body = await req.json();
    const { subject, message, order_number } = body;

    if (!subject || !message) {
      return NextResponse.json({ error: "বিষয় এবং বার্তা উভয়ই আবশ্যক" }, { status: 400 });
    }

    const db = getDB();
    const ticketId = "tkt_" + Math.random().toString(36).substring(2, 9);
    const ticketNumber = "TKT-" + Math.floor(10000 + Math.random() * 90000);

    await db
      .prepare(`
        INSERT INTO support_tickets (
          id, ticket_number, user_id, user_name, user_email, subject, order_number, message, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open')
      `)
      .bind(
        ticketId,
        ticketNumber,
        payload.id,
        payload.name || "Customer",
        payload.email.toLowerCase().trim(),
        subject.trim(),
        order_number?.trim() || "",
        message.trim()
      )
      .run();

    return NextResponse.json({
      success: true,
      ticket_number: ticketNumber,
      message: "আপনার সাপোর্ট টিকিট সফলভাবে গ্রহণ করা হয়েছে!"
    });
  } catch (error) {
    console.error("Create ticket error:", error);
    return NextResponse.json({ error: "টিকিট সাবমিট করতে ব্যর্থ হয়েছে" }, { status: 500 });
  }
}
