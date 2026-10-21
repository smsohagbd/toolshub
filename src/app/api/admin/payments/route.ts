import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";

export const runtime = "edge";

export async function GET() {
  try {
    const db = getDB();
    const res = await db.prepare("SELECT * FROM payment_gateways ORDER BY sort_order ASC").all();
    return NextResponse.json({ gateways: res.results || [] });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch payment methods" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, is_enabled, account_number, account_type, instructions, charge_percent, title } = body;

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const db = getDB();

    await db
      .prepare(`
        UPDATE payment_gateways 
        SET is_enabled = ?,
            account_number = ?,
            account_type = ?,
            instructions = ?,
            charge_percent = ?,
            title = COALESCE(?, title),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `)
      .bind(
        is_enabled ? 1 : 0,
        account_number || "",
        account_type || "Personal",
        instructions || "",
        Number(charge_percent) || 0,
        title || null,
        id
      )
      .run();

    return NextResponse.json({ success: true, message: "পেমেন্ট মেথড আপডেট হয়েছে!" });
  } catch (error) {
    console.error("Payment method update error:", error);
    return NextResponse.json({ error: "Failed to update payment method" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, type, account_number, account_type, instructions, charge_percent, badge_color } = body;

    if (!title || !type) {
      return NextResponse.json({ error: "Title and type are required" }, { status: 400 });
    }

    const id = "pm_" + Math.random().toString(36).substring(2, 8);
    const db = getDB();

    await db
      .prepare(`
        INSERT INTO payment_gateways (
          id, title, type, is_enabled, account_number, account_type,
          instructions, charge_percent, icon_name, badge_color, sort_order
        ) VALUES (?, ?, ?, 1, ?, ?, ?, ?, 'Wallet', ?, 10)
      `)
      .bind(
        id,
        title,
        type,
        account_number || "",
        account_type || "Personal",
        instructions || "",
        Number(charge_percent) || 0,
        badge_color || "indigo"
      )
      .run();

    return NextResponse.json({ success: true, id, message: "নতুন পেমেন্ট মেথড সফলভাবে যুক্ত হয়েছে!" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to add payment method" }, { status: 500 });
  }
}
