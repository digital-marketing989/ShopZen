import Link from "next/link";
import { CheckCircle2, Package, ArrowRight, Home } from "lucide-react";
import { Header } from "@/components/store/header";
import { Footer } from "@/components/store/footer";
import { db } from "@/lib/db";

export default async function OrderSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string; orderNumber?: string }>;
}) {
  const { orderId, orderNumber } = await searchParams;

  let orderSavings = 0;
  if (orderId) {
    try {
      const order = await db.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });
      if (order) {
        const totalMrp = order.items.reduce(
          (sum, item) => sum + (item.mrp || item.price) * item.quantity,
          0
        );
        orderSavings = Math.max(0, totalMrp - order.subtotal);
      }
    } catch {}
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-16 flex items-center justify-center">
        <div className="max-w-md w-full rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-lg space-y-6">
          <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-12 h-12" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              Order Confirmed!
            </h1>
            <p className="text-xs text-gray-500">
              Thank you for shopping with ShopZen. Your order has been placed and is being processed.
            </p>
          </div>

          {orderSavings > 0 && (
            <div className="rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 p-3 text-center text-xs font-black text-white shadow-md">
              🎉 You saved ₹{orderSavings.toLocaleString("en-IN")} with Durga Puja Maha Sale!
            </div>
          )}

          <div className="rounded-xl bg-gray-50 p-4 border border-gray-100 text-left space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">Order ID:</span>
              <span className="font-mono font-bold text-gray-900">
                {orderNumber || "ORD-2026-X89"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Estimated Delivery:</span>
              <span className="font-semibold text-emerald-700">
                In 3-4 Business Days
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Status:</span>
              <span className="font-semibold text-blue-600">Confirmed (PLACED)</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              href="/orders"
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 text-xs shadow-md transition"
            >
              <Package className="w-4 h-4" />
              <span>Track Orders</span>
            </Link>

            <Link
              href="/"
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 font-bold py-3 px-4 text-xs transition"
            >
              <Home className="w-4 h-4" />
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
