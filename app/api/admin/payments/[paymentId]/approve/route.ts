import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendPaymentConfirmedEmail } from "@/lib/email";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  void req;
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

    const payment = await db.payment.findUnique({
      where: { id: paymentId },
      include: {
        order: {
          include: {
            items: true,
            user: { select: { email: true, name: true } },
          },
        },
      },
    });

    if (!payment || !payment.order) {
      return NextResponse.json({ error: "Payment record or order not found" }, { status: 404 });
    }

    const order = payment.order;

    // Execute atomic approval, stock reduction, status updates and audit log
    await db.$transaction(async (tx) => {
      // 1. Update Payment
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "PAID",
          paidAt: new Date(),
          verifiedById: session.user.id,
          verifiedAt: new Date(),
          rejectionReason: null,
        },
      });

      // 2. Update Master Order
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: "PAID",
          paymentStatus: "PAID",
        },
      });

      // 3. Update SubOrders
      await tx.subOrder.updateMany({
        where: { orderId: order.id },
        data: {
          status: "CONFIRMED",
        },
      });

      // 4. Reduce stock & clear reserved inventory
      for (const item of order.items) {
        // Decrement product total stock & increment sold count
        await tx.product.update({
          where: { id: item.productId },
          data: {
            totalStock: { decrement: item.quantity },
            soldCount: { increment: item.quantity },
          },
        });

        // Decrement reserved inventory
        await tx.inventory.updateMany({
          where: { productId: item.productId },
          data: {
            reserved: { decrement: item.quantity },
          },
        });

        // Create StockLog
        await tx.stockLog.create({
          data: {
            productId: item.productId,
            type: "SALE",
            quantity: -item.quantity,
            note: `Payment approved for Cashfree Order ${order.orderNumber} (UTR: ${payment.utr})`,
            createdBy: session.user.id,
          },
        });
      }

      // 5. OrderStatusHistory
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: "PAID",
          note: `Payment verified & approved by admin (UTR: ${payment.utr || "N/A"})`,
          createdBy: session.user.id,
        },
      });

      // 6. AuditLog
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "PAYMENT_APPROVE",
          resource: "Payment",
          recordId: payment.id,
          details: JSON.stringify({
            orderNumber: order.orderNumber,
            amount: payment.amount,
            amountPaid: payment.amountPaid,
            utr: payment.utr,
          }),
        },
      });
    });

    // Send confirmation email
    const customerEmail = order.user?.email;
    if (customerEmail) {
      sendPaymentConfirmedEmail(
        customerEmail,
        order.orderNumber,
        payment.amountPaid || payment.amount,
        order.user?.name || undefined
      ).catch((err) => console.error("Error sending payment confirmed email:", err));
    }

    return NextResponse.json({
      success: true,
      message: `Payment approved for Order #${order.orderNumber}`,
    });
  } catch (error: any) {
    console.error("Payment approve error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to approve payment" },
      { status: 500 }
    );
  }
}
