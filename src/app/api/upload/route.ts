import { NextRequest, NextResponse } from "next/server";
import { uploadToR2 } from "@/lib/r2";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "tools";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const key = `${folder}/${Date.now()}_${originalName}`;
    const arrayBuffer = await file.arrayBuffer();

    await uploadToR2(key, arrayBuffer, file.type || "application/octet-stream");

    return NextResponse.json({
      success: true,
      key,
      file_name: originalName,
      file_size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      url: `/download/${encodeURIComponent(key)}`
    });
  } catch (error) {
    console.error("R2 Upload Error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
