import { NextResponse } from "next/server";
import { USER_COOKIE_NAME } from "@/lib/auth";

export const runtime = "edge";

export async function POST() {
  const response = NextResponse.json({ success: true, message: "লগআউট সফল হয়েছে" });
  response.cookies.delete(USER_COOKIE_NAME);
  return response;
}
