import { NextRequest, NextResponse } from "next/server";
import { sendMetaCAPIEvent } from "@/lib/meta-capi";
import { TrackingEvent } from "@/lib/types";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const body: TrackingEvent = await req.json();

    if (!body.event_name || !body.event_id) {
      return NextResponse.json({ error: "Invalid event data" }, { status: 400 });
    }

    // Extract client IP and user-agent from Cloudflare request headers
    const clientIp = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "";

    const eventPayload: TrackingEvent = {
      ...body,
      user_ip: clientIp,
      user_agent: userAgent
    };

    const res = await sendMetaCAPIEvent(eventPayload);
    return NextResponse.json({ success: true, metaResponse: res });
  } catch (error) {
    console.error("Tracking API Error:", error);
    return NextResponse.json({ error: "Failed to dispatch event" }, { status: 500 });
  }
}
