import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, USER_COOKIE_NAME } from "@/lib/auth";
import { getUserPurchases, findUserByEmail } from "@/lib/db";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  try {
    let token = req.cookies.get(USER_COOKIE_NAME)?.value;
    if (!token) {
      const authHeader = req.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return NextResponse.json({ error: "অননুমোদিত অ্যাক্সেস। অনুগ্রহ করে লগইন করুন।" }, { status: 401 });
    }

    const payload = await verifySessionToken(token);
    if (!payload || !payload.email) {
      return NextResponse.json({ error: "সেশন মেয়াদোত্তীর্ণ হয়েছে।" }, { status: 401 });
    }

    const purchases = await getUserPurchases(payload.email);

    return NextResponse.json({
      success: true,
      purchases
    });
  } catch (error) {
    console.error("Get user purchases error:", error);
    return NextResponse.json({ error: "ক্রয়কৃত কোর্স ও টুলস লোড করতে সমস্যা হয়েছে।" }, { status: 500 });
  }
}
