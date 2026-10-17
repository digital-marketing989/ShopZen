import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { orderId, itemId, reason, description } = body;

    if (!orderId || !reason) {
      return NextResponse.json({ error: "Order ID and reason are required" }, { status: 400 });
    }

    // Verify order belongs to user
    const order = await db.order.findFirst({
      where: { id: orderId, userId: session.user.id },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const returnRequest = await db.returnRequest.create({
      data: {
        orderId,
        userId: session.user.id,
        itemId: itemId || null,
        reason,
        description: description || null,
        status: "PENDING",
      },
    });

    return NextResponse.json({ success: true, data: returnRequest });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to submit return request" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const returns = await db.returnRequest.findMany({
      where: { userId: session.user.id },
      include: {
        order: {
          select: {
            orderNumber: true,
            total: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: returns });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch returns" }, { status: 500 });
  }
}
