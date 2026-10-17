import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Header } from "@/components/store/header";
import { Footer } from "@/components/store/footer";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import {
  Package,
  Clock,
  CheckCircle2,
  Truck,
  MapPin,
  Store,
  ChevronLeft,
  FileText,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { OrderActions } from "./order-actions";

export default async function OrderDetailPage({
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
      subOrders: {
        include: {
          seller: {
            select: {
              id: true,
              businessName: true,
              rating: true,
            },
          },
          items: true,
        },
      },
      address: true,
      coupon: true,
      payment: true,
      statusHistory: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!order) {
    notFound();
  }

  const totalMrp = order.items.reduce((sum, item) => sum + (item.mrp || item.price) * item.quantity, 0);
  const mahaSavings = Math.max(0, totalMrp - order.subtotal);

  const isCashfree = order.paymentMethod === "CASHFREE_LINK";
  const thirtyMinutes = 30 * 60 * 1000;
  const isUnpaidAfter30Min =
    isCashfree &&
    order.status === "PENDING_PAYMENT" &&
    Date.now() - new Date(order.createdAt).getTime() > thirtyMinutes;

  const steps = isCashfree
    ? [
        { key: "PLACED", label: "Placed" },
        { key: "PAYMENT_VERIFICATION_PENDING", label: "Payment verification pending" },
        { key: "PAID", label: "Paid" },
        { key: "SHIPPED", label: "Shipped" },
        { key: "DELIVERED", label: "Delivered" },
      ]
    : [
        { key: "PLACED", label: "Order Placed" },
        { key: "CONFIRMED", label: "Confirmed" },
        { key: "SHIPPED", label: "Shipped" },
        { key: "OUT_FOR_DELIVERY", label: "Out for Delivery" },
        { key: "DELIVERED", label: "Delivered" },
      ];

  let activeStep = 0;
  if (isCashfree) {
    if (order.status === "DELIVERED") activeStep = 4;
    else if (order.status === "SHIPPED" || order.status === "OUT_FOR_DELIVERY") activeStep = 3;
    else if (order.status === "PAID" || order.status === "CONFIRMED") activeStep = 2;
    else if (order.status === "PAYMENT_VERIFICATION_PENDING") activeStep = 1;
    else activeStep = 0;
  } else {
    const currentStepIndex = steps.findIndex((s) => s.key === order.status);
    activeStep = currentStepIndex >= 0 ? currentStepIndex : 0;
  }

  const isCancelled = order.status === "CANCELLED";

  let statusBadgeLabel = order.status;
  let statusBadgeClass = "bg-blue-50 text-blue-700 border-blue-200";

  if (order.status === "PAYMENT_VERIFICATION_PENDING") {
    statusBadgeLabel = "Payment verification pending";
    statusBadgeClass = "bg-amber-50 text-amber-800 border-amber-200";
  } else if (isUnpaidAfter30Min) {
    statusBadgeLabel = "Payment not received";
    statusBadgeClass = "bg-red-50 text-red-700 border-red-200";
  } else if (order.status === "PENDING_PAYMENT") {
    statusBadgeLabel = "Awaiting Payment";
    statusBadgeClass = "bg-orange-50 text-orange-700 border-orange-200";
  } else if (order.status === "PAID" || order.status === "CONFIRMED") {
    statusBadgeLabel = "Paid";
    statusBadgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
  } else if (order.status === "DELIVERED") {
    statusBadgeLabel = "Delivered";
    statusBadgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
  } else if (isCancelled) {
    statusBadgeLabel = "Cancelled";
    statusBadgeClass = "bg-red-50 text-red-700 border-red-200";
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Link href="/orders" className="hover:text-blue-600 flex items-center gap-1">
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Back to All Orders</span>
          </Link>
          <span>/</span>
          <span className="font-mono text-gray-900 font-bold">{order.orderNumber}</span>
        </div>

        {/* Master Order Header */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-black text-gray-900 tracking-tight">
                Order #{order.orderNumber}
              </h1>
              <span
                className={`text-xs font-bold px-3 py-0.5 rounded-full border ${statusBadgeClass}`}
              >
                {statusBadgeLabel}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Placed on{" "}
              {new Date(order.createdAt).toLocaleDateString("en-IN", {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {order.status === "PENDING_PAYMENT" && (
              <Link
                href={`/orders/${order.id}/pay`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 text-xs shadow transition"
              >
                <span>{isUnpaidAfter30Min ? "Pay again" : "Complete Payment"}</span>
              </Link>
            )}
            <OrderActions order={order} />
          </div>
        </div>

        {/* Cashfree Status Banners */}
        {isCashfree && order.status === "PENDING_PAYMENT" && (
          <div className={`rounded-2xl border p-4 text-xs flex items-start justify-between gap-4 ${
            isUnpaidAfter30Min
              ? "border-red-200 bg-red-50 text-red-900"
              : "border-blue-200 bg-blue-50 text-blue-900"
          }`}>
            <div className="flex items-start gap-3">
              <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isUnpaidAfter30Min ? "text-red-600" : "text-blue-600"}`} />
              <div>
                <p className="font-bold text-sm">
                  {isUnpaidAfter30Min ? "Payment not received" : "Payment Awaiting Completion"}
                </p>
                <p className="mt-0.5">
                  {isUnpaidAfter30Min
                    ? "Your 30-minute stock reservation has passed. Please complete your payment now using the button to secure your items before the order is automatically cancelled."
                    : "Your items are reserved for 30 minutes. Please complete payment using Cashfree and submit your transaction ID (UTR)."}
                </p>
              </div>
            </div>
            <Link
              href={`/orders/${order.id}/pay`}
              className="flex-shrink-0 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 text-xs shadow-sm transition"
            >
              {isUnpaidAfter30Min ? "Pay again" : "Pay Now"}
            </Link>
          </div>
        )}

        {isCashfree && order.status === "PAYMENT_VERIFICATION_PENDING" && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-xs text-amber-900 flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-sm text-amber-950">We are verifying your payment</p>
              <p className="text-amber-800">
                You will get an email once it is confirmed. Our accounts team is reviewing your transaction reference.
              </p>
              {order.payment?.utr && (
                <p className="text-amber-900 font-mono font-bold pt-1">
                  Submitted UTR: {order.payment.utr} {order.payment.amountPaid ? `(Amount: ₹${order.payment.amountPaid})` : ""}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Tracking Timeline Stepper */}
        {!isCancelled && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6">
              Delivery Progress
            </h2>
            <div className="relative flex items-center justify-between">
              <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-100 -translate-y-1/2 z-0" />
              <div
                className="absolute top-1/2 left-0 h-1 bg-blue-600 -translate-y-1/2 z-0 transition-all duration-500"
                style={{
                  width: `${(activeStep / (steps.length - 1)) * 100}%`,
                }}
              />

              {steps.map((step, idx) => {
                const isPassed = idx <= activeStep;
                const isCurrent = idx === activeStep;

                return (
                  <div key={step.key} className="relative z-10 flex flex-col items-center">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                        isPassed
                          ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                          : "bg-white border-2 border-gray-200 text-gray-400"
                      }`}
                    >
                      {isPassed ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                    </div>
                    <span
                      className={`text-[11px] mt-2 font-semibold text-center whitespace-nowrap ${
                        isCurrent
                          ? "text-blue-600 font-bold"
                          : isPassed
                          ? "text-gray-900"
                          : "text-gray-400"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Multi-Vendor SubOrders Breakdown */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-gray-900 tracking-tight">
              Package Breakdown by Vendor ({order.subOrders.length || 1})
            </h2>
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Verified ShopZen Multi-Vendor Fulfillment
            </span>
          </div>

          {order.subOrders.length > 0 ? (
            order.subOrders.map((subOrder, sIdx) => (
              <div
                key={subOrder.id}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs space-y-4"
              >
                {/* SubOrder Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <Store className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900">
                        {subOrder.seller.businessName}
                      </p>
                      <p className="text-[10px] text-gray-400 font-mono">
                        Sub-Order: {subOrder.subOrderNumber}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                      Package {sIdx + 1} of {order.subOrders.length}: {subOrder.status}
                    </span>
                    {subOrder.trackingId && (
                      <span className="text-[10px] font-mono text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                        Tracking: {subOrder.trackingId}
                      </span>
                    )}
                  </div>
                </div>

                {/* SubOrder Items */}
                <div className="divide-y divide-gray-100">
                  {subOrder.items.map((item) => (
                    <div key={item.id} className="py-3 first:pt-0 last:pb-0 flex items-center gap-3">
                      <div className="w-14 h-14 rounded-lg bg-gray-50 border border-gray-100 p-1 flex-shrink-0 flex items-center justify-center">
                        <img
                          src={item.image || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=150&q=80"}
                          alt=""
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-gray-900 line-clamp-1">{item.title}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          Quantity: {item.quantity} × ₹{item.price.toLocaleString("en-IN")}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-extrabold text-gray-900">
                          ₹{item.total.toLocaleString("en-IN")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Vendor Subtotal */}
                <div className="pt-2 border-t border-gray-100 flex justify-between text-xs text-gray-500">
                  <span>Vendor Package Subtotal:</span>
                  <span className="font-bold text-gray-900">
                    ₹{subOrder.subtotal.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            ))
          ) : (
            // Fallback for direct items if subOrders not split
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs divide-y divide-gray-100">
              {order.items.map((item) => (
                <div key={item.id} className="py-3 first:pt-0 last:pb-0 flex items-center gap-3">
                  <div className="w-14 h-14 rounded-lg bg-gray-50 border border-gray-100 p-1 flex-shrink-0 flex items-center justify-center">
                    <img
                      src={item.product?.images?.[0]?.url || item.image || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=150&q=80"}
                      alt=""
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-gray-900 line-clamp-1">{item.title}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Qty: {item.quantity} × ₹{item.price.toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-extrabold text-gray-900">
                      ₹{item.total.toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Address & Payment Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-900">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span>Delivery Address</span>
            </div>
            <div className="text-xs text-gray-600 space-y-1">
              <p className="font-bold text-gray-900">{order.address.name}</p>
              <p>{order.address.line1}</p>
              {order.address.line2 && <p>{order.address.line2}</p>}
              <p>
                {order.address.city}, {order.address.state} - {order.address.pincode}
              </p>
              <p className="text-gray-400">Phone: {order.address.phone}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs space-y-2">
            <h3 className="text-xs font-bold text-gray-900">Payment Summary</h3>
            <div className="divide-y divide-gray-100 text-xs">
              <div className="flex justify-between py-1.5 text-gray-600">
                <span>Items Subtotal:</span>
                <span>₹{order.subtotal.toLocaleString("en-IN")}</span>
              </div>
              {mahaSavings > 0 && (
                <div className="flex justify-between py-1.5 text-red-600 font-bold">
                  <span>Maha Sale Discount:</span>
                  <span>-₹{mahaSavings.toLocaleString("en-IN")}</span>
                </div>
              )}
              {order.couponDiscount > 0 && (
                <div className="flex justify-between py-1.5 text-emerald-600 font-semibold">
                  <span>Coupon Discount:</span>
                  <span>-₹{order.couponDiscount.toLocaleString("en-IN")}</span>
                </div>
              )}
              <div className="flex justify-between py-1.5 text-gray-600">
                <span>Delivery Fee:</span>
                <span>{order.deliveryFee === 0 ? "FREE" : `₹${order.deliveryFee}`}</span>
              </div>
              <div className="flex justify-between py-1.5 text-gray-600">
                <span>Taxes (GST):</span>
                <span>₹{order.tax.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between py-2 text-sm font-extrabold text-gray-900">
                <span>Grand Total:</span>
                <span className="text-blue-600">₹{order.total.toLocaleString("en-IN")}</span>
              </div>
            </div>

            {mahaSavings > 0 && (
              <div className="rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 p-2.5 text-center text-xs font-black text-white shadow-sm mt-2">
                🎉 You saved ₹{mahaSavings.toLocaleString("en-IN")} with Durga Puja Maha Sale!
              </div>
            )}
            <p className="text-[11px] text-gray-400 pt-1">
              Method: <strong>{order.paymentMethod}</strong> • Status: <strong>{order.paymentStatus}</strong>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
