import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [
      totalProducts,
      totalOrders,
      totalUsers,
      totalSellers,
      recentOrders,
      lowStockProducts,
      ordersByStatus,
      paidOrders,
    ] = await Promise.all([
      db.product.count(),
      db.order.count(),
      db.user.count({ where: { role: "CUSTOMER" } }),
      db.seller.count(),
      db.order.findMany({
        take: 6,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { name: true, email: true } },
          items: { take: 1 },
        },
      }),
      db.product.findMany({
        where: { totalStock: { lte: 10 } },
        select: { id: true, title: true, totalStock: true, price: true },
        take: 5,
      }),
      db.order.groupBy({
        by: ["status"],
        _count: { id: true },
      }),
      db.order.findMany({
        where: {
          OR: [{ paymentStatus: "PAID" }, { status: "DELIVERED" }],
        },
        select: { total: true, createdAt: true },
      }),
    ]);

    const totalRevenue = paidOrders.reduce((acc, o) => acc + o.total, 0);

    // Group revenue by last 7 days
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const chartDataMap: { [key: string]: { sales: number; orders: number } } = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = `${days[d.getDay()]} ${d.getDate()}`;
      chartDataMap[label] = { sales: 0, orders: 0 };
    }

    paidOrders.forEach((o) => {
      const d = new Date(o.createdAt);
      const label = `${days[d.getDay()]} ${d.getDate()}`;
      if (chartDataMap[label]) {
        chartDataMap[label].sales += o.total;
        chartDataMap[label].orders += 1;
      }
    });

    const revenueChart = Object.entries(chartDataMap).map(([day, val]) => ({
      day,
      sales: Math.round(val.sales),
      orders: val.orders,
    }));

    return NextResponse.json({
      success: true,
      data: {
        totalProducts,
        totalOrders,
        totalUsers,
        totalSellers,
        totalRevenue: Math.round(totalRevenue),
        recentOrders,
        lowStockProducts,
        ordersByStatus,
        revenueChart,
      },
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
