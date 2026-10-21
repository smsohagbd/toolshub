import { NextResponse } from "next/server";
import { getDB } from "@/lib/db";

export const runtime = "edge";

export async function GET(request: Request) {
  try {
    const db = getDB();
    const usersRes = await db.prepare("SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC").all();
    const users = usersRes.results || [];

    // Augment with order count and subscription count
    const augmentedUsers = await Promise.all(
      users.map(async (u: any) => {
        try {
          const [orderRes, subRes] = await Promise.all([
            db.prepare("SELECT COUNT(*) as count FROM orders WHERE customer_email = ?").bind(u.email).first(),
            db.prepare("SELECT COUNT(*) as count FROM subscriptions WHERE user_email = ? AND status = 'active'").bind(u.email).first()
          ]);
          return {
            ...u,
            total_orders: (orderRes as any)?.count || 0,
            active_subscriptions: (subRes as any)?.count || 0
          };
        } catch {
          return { ...u, total_orders: 0, active_subscriptions: 0 };
        }
      })
    );

    return NextResponse.json({
      success: true,
      users: augmentedUsers
    });
  } catch (error: any) {
    console.error("Admin users API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "ইউজার আইডি প্রয়োজন" }, { status: 400 });
    }

    const db = getDB();
    const user = await db.prepare("SELECT * FROM users WHERE id = ?").bind(id).first();
    if (!user) {
      return NextResponse.json({ success: false, error: "ইউজার পাওয়া যায়নি" }, { status: 404 });
    }

    if (user.role === "admin") {
      return NextResponse.json({ success: false, error: "অ্যাডমিন অ্যাকাউন্ট ডিলিট করা যাবে না" }, { status: 403 });
    }

    await db.prepare("DELETE FROM users WHERE id = ?").bind(id).run();
    return NextResponse.json({ success: true, message: "ইউজার সফলভাবে মুছে ফেলা হয়েছে" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
