import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Header } from "@/components/store/header";
import { Footer } from "@/components/store/footer";
import { notFound, redirect } from "next/navigation";
import { getCashfreeLinkConfig } from "@/lib/payments/cashfree-link";
import { PaymentScreenClient } from "./payment-screen-client";

export default async function OrderPayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const order = await db.order.findFirst({
    where: {
      OR: [{ id }, { orderNumber: id }],
    },
    include: {
      payment: true,
      items: {
        include: {
          product: { select: { title: true, images: { take: 1 } } },
        },
      },
    },
  });

  if (!order) {
    notFound();
  }

  // If already paid, redirect to standard order details
  if (order.status === "PAID" || order.status === "CONFIRMED" || order.status === "SHIPPED" || order.status === "DELIVERED") {
    redirect(`/orders/${order.id}`);
  }

  // Fetch the Cashfree payment link ONLY for this screen
  const config = getCashfreeLinkConfig();
  const paymentLink = config.link || "https://cfpe.me/krishnadas";
  const cashfreeEnabled = config.isValid;

  // Calculate if 30-minute stock reservation has passed
  const orderCreatedAt = new Date(order.createdAt).getTime();
  const thirtyMins = 30 * 60 * 1000;
  const isExpired = Date.now() - orderCreatedAt > thirtyMins && order.status === "PENDING_PAYMENT";

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-2xl">
        <PaymentScreenClient
          order={{
            id: order.id,
            orderNumber: order.orderNumber,
            total: order.total,
            status: order.status,
            createdAt: order.createdAt.toISOString(),
            payment: order.payment
              ? {
                  method: order.payment.method,
                  status: order.payment.status,
                  utr: order.payment.utr,
                  amountPaid: order.payment.amountPaid,
                  proofUrl: order.payment.proofUrl,
                  submissionCount: order.payment.submissionCount,
                  rejectionReason: order.payment.rejectionReason,
                }
              : null,
            items: order.items.map((i) => ({
              id: i.id,
              title: i.title,
              quantity: i.quantity,
              price: i.price,
            })),
          }}
          paymentLink={paymentLink}
          cashfreeEnabled={cashfreeEnabled}
          isExpired={isExpired}
        />
      </main>
      <Footer />
    </div>
  );
}
