import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as { role?: string }).role;
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "ALL"; // ALL, PENDING_VERIFICATION, PAID, REJECTED
    const search = searchParams.get("search")?.trim() || "";
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const format = searchParams.get("format");

    const where: any = {
      method: "CASHFREE_LINK",
    };

    if (status === "PENDING_VERIFICATION") {
      where.order = { status: "PAYMENT_VERIFICATION_PENDING" };
    } else if (status === "PAID") {
      where.status = "PAID";
    } else if (status === "REJECTED") {
      where.status = "REJECTED";
    }

    if (search) {
      where.OR = [
        { utr: { contains: search } },
        { order: { orderNumber: { contains: search } } },
        { order: { user: { name: { contains: search } } } },
        { order: { user: { email: { contains: search } } } },
      ];
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        where.createdAt.lte = to;
      }
    }

    const payments = await db.payment.findMany({
      where,
      include: {
        order: {
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
            items: {
              include: {
                product: { select: { title: true, images: { take: 1 } } },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // CSV Export
    if (format === "csv") {
      const headers = [
        "Payment ID",
        "Order ID",
        "Customer Name",
        "Customer Email",
        "Expected Amount",
        "Amount Paid",
        "Amount Diff",
        "UTR / Txn ID",
        "Payment Status",
        "Order Status",
        "Submitted At",
        "Verified At",
        "Rejection Reason",
      ];

      const rows = payments.map((p) => {
        const expected = p.amount;
        const paid = p.amountPaid ?? 0;
        const diff = (expected - paid).toFixed(2);
        return [
          p.id,
          p.order?.orderNumber || "",
          `"${(p.order?.user?.name || "").replace(/"/g, '""')}"`,
          p.order?.user?.email || "",
          expected.toFixed(2),
          paid.toFixed(2),
          diff,
          p.utr || "",
          p.status,
          p.order?.status || "",
          new Date(p.updatedAt).toISOString(),
          p.verifiedAt ? new Date(p.verifiedAt).toISOString() : "",
          `"${(p.rejectionReason || "").replace(/"/g, '""')}"`,
        ].join(",");
      });

      const csvContent = [headers.join(","), ...rows].join("\n");
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="cashfree-payments-${Date.now()}.csv"`,
        },
      });
    }

    return NextResponse.json({ success: true, payments });
  } catch (error: any) {
    console.error("Admin payments fetch error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch payments" },
      { status: 500 }
    );
  }
}
