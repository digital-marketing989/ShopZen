import { Header } from "@/components/store/header";
import { Footer } from "@/components/store/footer";
import Link from "next/link";
import { ShieldCheck, Calendar, Percent, AlertCircle, ArrowLeft, Info } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Durga Puja Maha Sale Terms & Conditions | ShopZen",
  description:
    "Official terms and conditions for the Durga Puja Maha Sale on ShopZen. Transparent discount rules, pricing compliance, stock limits and cancellation policies.",
};

export default function SaleTermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-6">
          <Link
            href="/sale"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-red-700 hover:text-red-800 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Durga Puja Maha Sale</span>
          </Link>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 sm:p-10 shadow-sm space-y-8">
          {/* Header */}
          <div className="border-b border-gray-100 pb-6 space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-red-100 text-red-800 px-3 py-1 text-xs font-black uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-red-600" />
              <span>Official Promotion Policy</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-950 tracking-tight">
              Durga Puja Maha Sale — Terms & Conditions
            </h1>
            <p className="text-xs sm:text-sm text-gray-500">
              Last updated: October 2026 · Applicable across all ShopZen platforms
            </p>
          </div>

          {/* Quick Notice Banner */}
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-900 flex items-start gap-3">
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Transparent Pricing Guarantee</p>
              <p className="mt-0.5 text-amber-800">
                All discounts during the Durga Puja Maha Sale are applied directly against the genuine, verified Maximum Retail Price (MRP) of the products. ShopZen strictly prohibits artificial inflation of MRPs before or during promotional events.
              </p>
            </div>
          </div>

          {/* Terms Articles */}
          <div className="space-y-6 text-xs sm:text-sm text-gray-700 leading-relaxed">
            <section className="space-y-2">
              <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-red-600" />
                1. Campaign Dates & Duration
              </h2>
              <p>
                The <strong>Durga Puja Maha Sale</strong> commences on <strong>17 October 2026</strong> and concludes promptly on <strong>22 October 2026 at 23:59:59 IST (Asia/Kolkata)</strong>. All promotional pricing and header offers are synchronized to server time. Once the offer countdown reaches zero, regular non-sale pricing automatically resumes without requiring any manual deployment.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                <Percent className="w-4 h-4 text-red-600" />
                2. Discount Range & Pricing Computation
              </h2>
              <p>
                Products participating in the Maha Sale carry discounts ranging between <strong>85% and 95% OFF</strong> on their listed MRP. Discounts are calculated using deterministic algorithmic allocations or authorized merchant overrides. The effective sale price is calculated as:
              </p>
              <div className="bg-gray-50 rounded-xl p-3 font-mono text-xs text-gray-900 border border-gray-200">
                Sale Price = Round( MRP × ( 1 - Discount% / 100 ) )
              </div>
              <p>
                In compliance with retail pricing regulations, the minimum effective sale price is strictly capped at no less than <strong>₹1 (One Rupee)</strong>.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                3. Coupon Codes & Non-Stacking Rule
              </h2>
              <p>
                Due to the extraordinary magnitude of the festive markdowns (up to 95% off), coupon codes and promotional voucher codes <strong>cannot be combined or stacked</strong> with Durga Puja Maha Sale prices. Attempting to enter coupon codes for cart containing sale items will yield the notification: <em>"Coupons cannot be combined with Maha Sale prices."</em>
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-red-600" />
                4. Stock Limits & Fair Usage
              </h2>
              <p>
                Sale items are subject to live inventory ledger limits. To ensure fair distribution among all customers during the festival, ShopZen reserves the right to restrict purchase quantities per individual user account or delivery address. Items in customer carts are not reserved until checkout completion or payment proof submission.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                5. Right to Cancel Orders with Pricing Errors
              </h2>
              <p>
                While ShopZen and our verified merchants take every precaution to ensure technical accuracy, ShopZen expressly reserves the right to cancel any orders resulting from inadvertent typographical errors, technical glitches, or pricing discrepancies that misstate a product's price. In any such rare event, the customer will be promptly notified and any payment tendered will be refunded in full.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                <Info className="w-4 h-4 text-red-600" />
                6. Checkout Recalculation Upon Sale Expiry
              </h2>
              <p>
                If a customer initiates checkout prior to campaign conclusion, but the sale ends before final order submission, the system automatically recomputes the cart total to regular non-sale pricing with the notice: <em>"Sale ended, prices updated."</em> Orders are always bound to server-side calculated amounts at the instant of order creation.
              </p>
            </section>
          </div>

          <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs text-gray-500">
              Questions regarding sale terms? Contact support@shopzen.com
            </span>
            <Link
              href="/sale"
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2.5 text-xs shadow-md transition"
            >
              <span>Explore Maha Sale</span>
              <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
