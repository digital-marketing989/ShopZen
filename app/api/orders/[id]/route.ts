import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const order = await db.order.findFirst({
      where: {
        OR: [{ id }, { orderNumber: id }],
        ...(session.user.role === "ADMIN" ? {} : { userId: session.user.id }),
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                slug: true,
                images: { take: 1, select: { url: true } },
              },
            },
          },
        },
        address: true,
        coupon: true,
        statusHistory: { orderBy: { createdAt: "asc" } },
        user: { select: { name: true, email: true, phone: true } },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { status, note, trackingId, paymentStatus } = body;

    const order = await db.order.findFirst({
      where: { OR: [{ id }, { orderNumber: id }] },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const userRole = (session.user as any).role;
    if (userRole !== "ADMIN" && userRole !== "SELLER") {
      if (status !== "CANCELLED" || order.status !== "PLACED" || order.userId !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const updated = await db.order.update({
      where: { id: order.id },
      data: {
        status: status || undefined,
        paymentStatus: paymentStatus || undefined,
        trackingId: trackingId || undefined,
        deliveredAt: status === "DELIVERED" ? new Date() : undefined,
        cancelledAt: status === "CANCELLED" ? new Date() : undefined,
        cancelReason: status === "CANCELLED" ? (note || "Cancelled by user") : undefined,
        statusHistory: {
          create: {
            status: status || order.status,
            note: note || `Status updated to ${status || order.status}`,
          },
        },
      },
      include: {
        statusHistory: true,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update order" }, { status: 500 });
  }
}
