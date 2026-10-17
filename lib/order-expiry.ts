import { db } from "@/lib/db";

/**
 * Checks for Cashfree link orders that have been in PENDING_PAYMENT status
 * for more than 24 hours without proof submission.
 * Automatically cancels them and releases the reserved stock.
 */
export async function checkAndAutoCancelExpiredOrders(): Promise<number> {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const expiredOrders = await db.order.findMany({
      where: {
        paymentMethod: "CASHFREE_LINK",
        status: "PENDING_PAYMENT",
        createdAt: {
          lt: twentyFourHoursAgo,
        },
      },
      include: {
        items: true,
      },
      take: 20, // process in batches
    });

    if (!expiredOrders.length) return 0;

    for (const order of expiredOrders) {
      await db.$transaction(async (tx) => {
        // 1. Cancel master order
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: "CANCELLED",
            cancelledAt: new Date(),
            cancelReason: "Auto-cancelled: Payment not received within 24 hours",
          },
        });

        // 2. Cancel sub-orders
        await tx.subOrder.updateMany({
          where: { orderId: order.id },
          data: {
            status: "CANCELLED",
            cancelledAt: new Date(),
          },
        });

        // 3. Release reserved inventory
        for (const item of order.items) {
          await tx.inventory.updateMany({
            where: { productId: item.productId },
            data: {
              reserved: { decrement: item.quantity },
            },
          });

          await tx.stockLog.create({
            data: {
              productId: item.productId,
              type: "ADJUSTMENT",
              quantity: item.quantity,
              note: `Released reserved stock: auto-cancelled Order #${order.orderNumber}`,
            },
          });
        }

        // 4. Order status history
        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            status: "CANCELLED",
            note: "Auto-cancelled: Payment not received within 24 hours. Reserved stock released.",
          },
        });
      });
    }

    return expiredOrders.length;
  } catch (error) {
    console.error("Auto-cancel expired orders error:", error);
    return 0;
  }
}
