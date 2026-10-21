import { NextResponse } from "next/server";
import { getDB } from "@/lib/db";

export const runtime = "edge";

export async function GET() {
  try {
    const db = getDB();
    const res = await db.prepare("SELECT * FROM payment_gateways WHERE is_enabled = 1 ORDER BY sort_order ASC").all();
    return NextResponse.json({
      success: true,
      gateways: res.results || []
    });
  } catch (error: any) {
    console.error("Public payment methods error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
