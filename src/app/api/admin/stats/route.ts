import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";

export const runtime = "edge";

export async function GET() {
  try {
    const db = getDB();

    const ordersRes = await db.prepare("SELECT * FROM orders").all();
    const orders = ordersRes.results || [];

    const productsRes = await db.prepare("SELECT * FROM products").all();
    const products = productsRes.results || [];

    const totalOrders = orders.length;
    const pendingOrders = orders.filter((o: any) => o.payment_status === "pending").length;
    const approvedOrders = orders.filter((o: any) => o.payment_status === "approved").length;

    const totalRevenue = orders
      .filter((o: any) => o.payment_status === "approved")
      .reduce((acc: number, curr: any) => acc + (Number(curr.amount) || 0), 0);

    return NextResponse.json({
      totalOrders,
      pendingOrders,
      approvedOrders,
      totalRevenue,
      totalProducts: products.length,
      recentOrders: orders.slice(0, 5)
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
