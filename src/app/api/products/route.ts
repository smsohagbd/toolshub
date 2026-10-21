import { NextResponse } from "next/server";
import { getDB } from "@/lib/db";

export const runtime = "edge";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const db = getDB();

    let query = "SELECT * FROM products WHERE status = 'published'";
    const params: any[] = [];

    if (category && category !== "all") {
      query += " AND category_id = ?";
      params.push(category);
    }

    query += " ORDER BY created_at DESC";

    const res = await db.prepare(query).bind(...params).all();
    return NextResponse.json({
      success: true,
      products: res.results || []
    });
  } catch (error: any) {
    console.error("Public products API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
