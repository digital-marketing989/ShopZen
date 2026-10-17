import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

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
    const { status, trackingId, courierName } = body;

    // Verify seller ownership
    const seller = await db.seller.findUnique({
      where: { userId: session.user.id },
    });

    const isSuperAdmin = (session.user as any).role === "SUPER_ADMIN" || (session.user as any).role === "ADMIN";

    const subOrder = await db.subOrder.findUnique({
      where: { id },
    });

    if (!subOrder) {
      return NextResponse.json({ error: "SubOrder not found" }, { status: 404 });
    }

    if (!isSuperAdmin && (!seller || subOrder.sellerId !== seller.id)) {
      return NextResponse.json({ error: "Forbidden: Not your SubOrder" }, { status: 403 });
    }

    const updated = await db.subOrder.update({
      where: { id },
      data: {
        status: status || undefined,
        trackingId: trackingId !== undefined ? trackingId : undefined,
        courierName: courierName !== undefined ? courierName : undefined,
        shippedAt: status === "SHIPPED" ? new Date() : undefined,
        deliveredAt: status === "DELIVERED" ? new Date() : undefined,
        cancelledAt: status === "CANCELLED" ? new Date() : undefined,
      },
      include: {
        items: true,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update SubOrder" }, { status: 500 });
  }
}
