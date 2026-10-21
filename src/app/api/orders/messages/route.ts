import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderNumber = searchParams.get("order_number") || searchParams.get("order_id");

    if (!orderNumber) {
      return NextResponse.json({ error: "order_number is required" }, { status: 400 });
    }

    const db = getDB();
    const res = await db
      .prepare(
        "SELECT * FROM order_messages WHERE order_number = ? OR order_id = ? ORDER BY created_at ASC"
      )
      .bind(orderNumber, orderNumber)
      .all();

    return NextResponse.json({
      success: true,
      messages: res.results || []
    });
  } catch (error) {
    console.error("Order messages GET error:", error);
    return NextResponse.json({ success: true, messages: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { order_id, order_number, sender_role, sender_name, message } = body;

    if (!order_number || !message) {
      return NextResponse.json({ error: "অর্ডার নম্বর ও মেসেজ আবশ্যক" }, { status: 400 });
    }

    const db = getDB();
    const msgId = "msg_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    const role = sender_role === "admin" ? "admin" : "customer";
    const name = sender_name || (role === "admin" ? "অ্যাডমিন সাপোর্ট" : "গ্রাহক");
    const cleanMsg = message.trim();

    await db
      .prepare(
        "INSERT INTO order_messages (id, order_id, order_number, sender_role, sender_name, message) VALUES (?, ?, ?, ?, ?, ?)"
      )
      .bind(msgId, order_id || order_number, order_number, role, name, cleanMsg)
      .run();

    // If sent by admin, also update admin_notes on order
    if (role === "admin") {
      try {
        await db
          .prepare("UPDATE orders SET admin_notes = ? WHERE order_number = ? OR id = ?")
          .bind(cleanMsg, order_number, order_number)
          .run();
      } catch (e) {}
    }

    return NextResponse.json({
      success: true,
      message: {
        id: msgId,
        order_id: order_id || order_number,
        order_number,
        sender_role: role,
        sender_name: name,
        message: cleanMsg,
        created_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("Order messages POST error:", error);
    return NextResponse.json({ error: "মেসেজ পাঠানো ব্যর্থ হয়েছে" }, { status: 500 });
  }
}
