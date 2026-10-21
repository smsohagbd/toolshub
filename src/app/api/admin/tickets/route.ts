import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";

export const runtime = "edge";

export async function GET() {
  try {
    const db = getDB();
    const res = await db
      .prepare("SELECT * FROM support_tickets ORDER BY created_at DESC")
      .all();
    return NextResponse.json({ tickets: res.results || [] });
  } catch (error) {
    console.error("Admin fetch tickets error:", error);
    return NextResponse.json({ error: "Failed to fetch tickets" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { ticket_id, status, admin_reply } = body;

    if (!ticket_id) {
      return NextResponse.json({ error: "Ticket ID is required" }, { status: 400 });
    }

    const db = getDB();
    await db
      .prepare(`
        UPDATE support_tickets
        SET status = COALESCE(?, status),
            admin_reply = COALESCE(?, admin_reply),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ? OR ticket_number = ?
      `)
      .bind(
        status || null,
        admin_reply || null,
        ticket_id,
        ticket_id
      )
      .run();

    return NextResponse.json({
      success: true,
      message: "টিকেট সফলভাবে আপডেট করা হয়েছে!"
    });
  } catch (error) {
    console.error("Admin update ticket error:", error);
    return NextResponse.json({ error: "Failed to update ticket" }, { status: 500 });
  }
}
