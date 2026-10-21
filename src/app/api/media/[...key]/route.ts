import { NextRequest, NextResponse } from "next/server";
import { getFromR2 } from "@/lib/r2";

export const runtime = "edge";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  try {
    const { key } = await params;
    const fullKey = Array.isArray(key) ? key.join("/") : key;

    if (!fullKey) {
      return new NextResponse("Invalid media key", { status: 400 });
    }

    const r2Object = await getFromR2(decodeURIComponent(fullKey));
    if (r2Object && r2Object.body) {
      return new Response(r2Object.body, {
        headers: {
          "Content-Type": r2Object.httpMetadata?.contentType || "image/jpeg",
          "Cache-Control": "public, max-age=31536000, immutable"
        }
      });
    }

    return new NextResponse("Media not found", { status: 404 });
  } catch (error) {
    return new NextResponse("Error fetching media", { status: 500 });
  }
}
