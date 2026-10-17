import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { sendPaymentRejectedEmail } from "@/lib/email";

const rejectSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, "Rejection reason must be at least 3 characters")
    .max(500, "Rejection reason is too long"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as { role?: string }).role;
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { paymentId } = await params;
    const body = await req.json();
    const validation = rejectSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || "Invalid rejection reason" },
        { status: 400 }
      );
    }

    const { reason } = validation.data;

    const payment = await db.payment.findUnique({
      where: { id: paymentId },
      include: {
        order: {
          include: {
            user: { select: { email: true, name: true } },
          },
        },
      },
    });

    if (!payment || !payment.order) {
      return NextResponse.json({ error: "Payment record or order not found" }, { status: 404 });
    }

    const order = payment.order;

    await db.$transaction(async (tx) => {
      // 1. Update Payment
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "REJECTED",
          rejectionReason: reason,
          verifiedById: session.user.id,
          verifiedAt: new Date(),
        },
      });

      // 2. Set Order back to PENDING_PAYMENT so customer can resubmit
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: "PENDING_PAYMENT",
          paymentStatus: "FAILED",
        },
      });

      // 3. Update SubOrders
      await tx.subOrder.updateMany({
        where: { orderId: order.id },
        data: {
          status: "PENDING_PAYMENT",
        },
      });

      // 4. OrderStatusHistory
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: "PENDING_PAYMENT",
          note: `Payment verification rejected: ${reason}`,
          createdBy: session.user.id,
        },
      });

      // 5. AuditLog
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "PAYMENT_REJECT",
          resource: "Payment",
          recordId: payment.id,
          details: JSON.stringify({
            orderNumber: order.orderNumber,
            reason,
            utr: payment.utr,
          }),
        },
      });
    });

    // Send customer notification email with reason
    const customerEmail = order.user?.email;
    if (customerEmail) {
      sendPaymentRejectedEmail(
        customerEmail,
        order.orderNumber,
        payment.amountPaid || payment.amount,
        reason,
        order.user?.name || undefined
      ).catch((err) => console.error("Error sending rejection email:", err));
    }

    return NextResponse.json({
      success: true,
      message: `Payment rejected for Order #${order.orderNumber}`,
    });
  } catch (error: any) {
    console.error("Payment reject error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to reject payment" },
      { status: 500 }
    );
  }
}
