import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Header } from "@/components/store/header";
import { Footer } from "@/components/store/footer";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Package, Clock, CheckCircle2, ChevronRight, Truck, MapPin } from "lucide-react";

export default async function OrdersPage() {
  const session = await auth();

  let orders: any[] = [];
  try {
    orders = await db.order.findMany({
      where: session?.user?.id ? { userId: session.user.id } : {},
      take: 20,
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
        statusHistory: { orderBy: { createdAt: "desc" } },
      },
      orderBy: { createdAt: "desc" },
    });
  } catch (err) {
    // Demo fallback order for preview
    orders = [
      {
        id: "demo_order_1",
        orderNumber: "SZ-98124-DEL",
        status: "CONFIRMED",
        paymentStatus: "PAID",
        paymentMethod: "CASHFREE_LINK",
        subtotal: 24990,
        deliveryFee: 0,
        tax: 4498,
        total: 24990,
        createdAt: new Date(),
        address: {
          name: session?.user?.name || "Customer",
          city: "Bengaluru",
          pincode: "560001",
        },
        items: [
          {
            id: "it_1",
            title: "Sony WH-1000XM5 Wireless Headphones",
            price: 24990,
            quantity: 1,
            product: {
              slug: "sony-wh-1000xm5-wireless-headphones",
              images: [{ url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=150" }],
            },
          },
        ],
      },
    ];
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight mb-6">
          My Orders ({orders.length})
        </h1>

        {orders.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
            <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">No orders placed yet</h3>
            <p className="text-xs text-gray-500 mb-6">
              When you purchase products, your order status and tracking details will appear here.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const isCashfree = order.paymentMethod === "CASHFREE_LINK";
              const isPendingPayment = order.status === "PENDING_PAYMENT";
              const isVerifying = order.status === "PAYMENT_VERIFICATION_PENDING";
              const thirtyMinutes = 30 * 60 * 1000;
              const isUnpaidAfter30Min =
                isCashfree &&
                isPendingPayment &&
                Date.now() - new Date(order.createdAt).getTime() > thirtyMinutes;

              let statusLabel = order.status;
              let statusColor = "bg-blue-50 text-blue-700 border-blue-200";

              if (isVerifying) {
                statusLabel = "Payment verification pending";
                statusColor = "bg-amber-50 text-amber-800 border-amber-200";
              } else if (isUnpaidAfter30Min) {
                statusLabel = "Payment not received";
                statusColor = "bg-red-50 text-red-700 border-red-200";
              } else if (isPendingPayment) {
                statusLabel = "Awaiting Payment";
                statusColor = "bg-orange-50 text-orange-700 border-orange-200";
              } else if (order.status === "PAID" || order.status === "CONFIRMED") {
                statusLabel = "Paid";
                statusColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
              } else if (order.status === "DELIVERED") {
                statusLabel = "Delivered";
                statusColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
              } else if (order.status === "CANCELLED") {
                statusLabel = "Cancelled";
                statusColor = "bg-red-50 text-red-700 border-red-200";
              }

              return (
                <div
                  key={order.id}
                  className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4"
                >
                  {/* Top Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 gap-2">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                        Order #
                      </span>
                      <Link
                        href={`/orders/${order.id}`}
                        className="block font-mono text-xs font-bold text-blue-600 hover:underline"
                      >
                        {order.orderNumber}
                      </Link>
                      <p className="text-[11px] text-gray-400">
                        Placed on {new Date(order.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {isPendingPayment && (
                        <Link
                          href={`/orders/${order.id}/pay`}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold px-3 py-1 text-xs shadow-xs transition"
                        >
                          <span>{isUnpaidAfter30Min ? "Pay again" : "Complete Payment"}</span>
                        </Link>
                      )}
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full border ${statusColor}`}
                      >
                        {statusLabel}
                      </span>
                      <span className="text-sm font-extrabold text-gray-950">
                        ₹{order.total.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="divide-y divide-gray-100">
                    {order.items.map((item: any) => (
                      <div key={item.id} className="py-3 first:pt-0 last:pb-0 flex gap-3">
                        <div className="w-16 h-16 rounded-lg bg-gray-50 border border-gray-100 p-1 flex-shrink-0 flex items-center justify-center">
                          <img
                            src={
                              item.product.images?.[0]?.url ||
                              "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=150&q=80"
                            }
                            alt=""
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>

                        <div className="flex-1">
                          <Link
                            href={`/product/${item.product.slug}`}
                            className="text-xs font-bold text-gray-900 hover:text-blue-600 line-clamp-1"
                          >
                            {item.title}
                          </Link>
                          <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                            <span>Qty: {item.quantity}</span>
                            <span>•</span>
                            <span>₹{item.price.toLocaleString("en-IN")}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <Link
                            href={`/product/${item.product.slug}`}
                            className="text-xs font-semibold text-blue-600 hover:underline"
                          >
                            Buy Again
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Delivery Info */}
                  <div className="pt-3 border-t border-gray-100 flex flex-col sm:flex-row justify-between text-xs text-gray-500 gap-2">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-blue-600" />
                      <span>
                        Delivering to: <strong>{order.address.name}</strong>, {order.address.city} - {order.address.pincode}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span>Payment: <strong>{order.paymentMethod}</strong> ({order.paymentStatus})</span>
                      <Link
                        href={`/orders/${order.id}`}
                        className="inline-flex items-center gap-1 font-bold text-blue-600 hover:text-blue-700"
                      >
                        <span>Track Package</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
