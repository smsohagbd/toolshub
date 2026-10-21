import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";

export const runtime = "edge";

export async function GET() {
  try {
    const db = getDB();
    const res = await db
      .prepare("SELECT * FROM media ORDER BY created_at DESC")
      .all();
    return NextResponse.json({
      success: true,
      media: res.results || []
    });
  } catch (error) {
    console.error("Fetch media error:", error);
    return NextResponse.json({ error: "Failed to fetch media" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "ফাইল প্রদান করুন" }, { status: 400 });
    }

    const db = getDB();
    const id = "med_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const key = `uploads/${Date.now()}_${safeName}`;
    const sizeKB = Math.round(file.size / 1024) + " KB";
    const mimeType = file.type || "image/webp";

    // Direct URL serving via /api/media/
    const url = `/api/media/${encodeURIComponent(key)}`;

    // If Cloudflare R2 is bound in Edge runtime
    const cfEnv = (globalThis as any)?.__CLOUDFLARE_ENV__;
    if (cfEnv?.BUCKET) {
      const buf = await file.arrayBuffer();
      await cfEnv.BUCKET.put(key, buf, {
        httpMetadata: { contentType: mimeType }
      });
    }

    await db
      .prepare(`
        INSERT INTO media (id, file_name, file_key, url, file_size, mime_type)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .bind(id, safeName, key, url, sizeKB, mimeType)
      .run();

    return NextResponse.json({
      success: true,
      media: {
        id,
        file_name: safeName,
        file_key: key,
        url,
        file_size: sizeKB,
        mime_type: mimeType,
        created_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("Upload media error:", error);
    return NextResponse.json({ error: "মিডিয়া আপলোড ব্যর্থ হয়েছে" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

    const db = getDB();
    const item = await db.prepare("SELECT * FROM media WHERE id = ? LIMIT 1").bind(id).first();
    if (item) {
      const cfEnv = (globalThis as any)?.__CLOUDFLARE_ENV__;
      if (cfEnv?.BUCKET && (item as any).file_key) {
        try {
          await cfEnv.BUCKET.delete((item as any).file_key);
        } catch (e) {}
      }
      await db.prepare("DELETE FROM media WHERE id = ?").bind(id).run();
    }

    return NextResponse.json({ success: true, message: "ছবি মুছে ফেলা হয়েছে" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete media" }, { status: 500 });
  }
}
