"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Trash2,
  Plus,
  Minus,
  ShieldCheck,
  Tag,
  ArrowRight,
  ShoppingBag,
  MapPin,
  Lock,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Header } from "@/components/store/header";
import { Footer } from "@/components/store/footer";
import { useCartStore } from "@/store/cart";
import { toast } from "sonner";

export default function CartPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { items, updateQuantity, removeItem, clearCart, coupon, setCoupon } =
    useCartStore();

  const [couponCode, setCouponCode] = useState("");
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [cashfreeEnabled, setCashfreeEnabled] = useState(true);
  const [payeeName, setPayeeName] = useState("DIGITAL MARKETING");
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [saleCampaign, setSaleCampaign] = useState<any>(null);

  // Delivery Address form state
  const [address, setAddress] = useState({
    name: "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    pincode: "",
  });

  // Fetch payment options & active campaign
  useEffect(() => {
    async function loadOptions() {
      try {
        const res = await fetch("/api/payments/options");
        if (res.ok) {
          const data = await res.json();
          if (data.options?.cashfreeEnabled !== undefined) {
            setCashfreeEnabled(Boolean(data.options.cashfreeEnabled));
          }
          if (data.options?.payeeName) {
            setPayeeName(data.options.payeeName);
          }
        }

        const saleRes = await fetch("/api/sales/active");
        if (saleRes.ok) {
          const saleData = await saleRes.json();
          if (saleData.active && saleData.campaign) {
            setSaleCampaign(saleData.campaign);
          }
        }
      } catch (e) {
        console.error("Failed to load options:", e);
      }
    }
    loadOptions();
  }, []);

  // Autofill user info if available
  useEffect(() => {
    if (session?.user) {
      setAddress((prev) => ({
        ...prev,
        name: prev.name || session.user.name || "",
      }));
    }
  }, [session]);

  const totalMrp = items.reduce((sum, item) => sum + (item.mrp || item.price) * item.quantity, 0);
  const totalItemPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const mrpDiscount = Math.max(0, totalMrp - totalItemPrice);
  const deliveryFee = totalItemPrice > 499 || totalItemPrice === 0 ? 0 : 40;
  const couponDiscount = coupon?.discount || 0;
  const totalAmount = Math.max(0, totalItemPrice - couponDiscount + deliveryFee);
  const totalSavings = mrpDiscount + couponDiscount;

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;

    if (saleCampaign?.isActive && saleCampaign.stackWithCoupons === false) {
      toast.error("Coupons cannot be combined with Maha Sale prices");
      return;
    }

    setApplyingCoupon(true);
    try {
      const res = await fetch("/api/coupons/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode, total: totalItemPrice }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Invalid coupon code");
        return;
      }

      setCoupon({ code: data.code, discount: data.discount });
      toast.success(`Coupon ${data.code} applied! Saved ₹${data.discount}`);
      setCouponCode("");
    } catch {
      toast.error("Failed to apply coupon");
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCoupon(null);
    toast.info("Coupon removed");
  };

  const handlePlaceOrder = async () => {
    if (!items.length) {
      toast.error("Your cart is empty");
      return;
    }

    if (!session?.user) {
      toast.error("Please sign in to place your order");
      router.push("/auth/login?callbackUrl=/cart");
      return;
    }

    if (!cashfreeEnabled) {
      toast.error("Payment is temporarily unavailable. Please try again shortly.");
      return;
    }

    if (!address.line1 || !address.city || !address.pincode) {
      toast.error("Please provide complete delivery address");
      return;
    }

    setIsSubmittingOrder(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          address,
          paymentMethod: "CASHFREE_LINK",
          couponCode: coupon?.code,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Handle session expiry
        if (res.status === 401 || data.code === "SESSION_EXPIRED" || data.code === "UNAUTHORIZED" || data.code === "FOREIGN_KEY_VIOLATION") {
          toast.error(data.message || "Your session expired, please sign in again");
          router.push("/auth/login?callbackUrl=/cart&message=" + encodeURIComponent("Your session expired, please sign in again"));
          return;
        }

        // Handle missing/unavailable products
        if (data.code === "ITEMS_UNAVAILABLE" || data.missingProductIds) {
          if (Array.isArray(data.missingProductIds)) {
            data.missingProductIds.forEach((id: string) => removeItem(id));
          }
          toast.error("Some items in your cart are no longer available", {
            description: "We've removed the unavailable items from your cart.",
          });
          return;
        }

        // Handle sale price updates
        if (res.status === 409 || data.code === "SALE_ENDED" || data.error?.includes("Sale ended")) {
          toast.error("Sale ended, prices updated", {
            description: data.newTotal ? `Updated order total: ₹${data.newTotal}` : "Prices have returned to regular rates.",
            duration: 6000,
          });
          return;
        }

        throw new Error(data.message || data.error || "Failed to place order");
      }

      clearCart();
      toast.success("Order placed! Complete your payment to proceed.");
      router.push(`/orders/${data.data.id}/pay`);
    } catch (err: any) {
      toast.error(err.message || "Failed to place order");
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight mb-6">
          Shopping Cart ({items.reduce((sum, i) => sum + i.quantity, 0)} Items)
        </h1>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm max-w-lg mx-auto">
            <div className="w-20 h-20 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-10 h-10" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Your cart is empty
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              Looks like you haven't added anything to your cart yet. Explore our top categories and Maha Sale deals!
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 text-sm shadow-md transition"
            >
              <span>Start Shopping</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Items & Shipping (8 cols) */}
            <div className="lg:col-span-8 space-y-6">
              {/* Cart Items List */}
              <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                  <span className="font-bold text-gray-700 text-sm">Cart Items</span>
                  <button
                    onClick={clearCart}
                    className="text-xs text-red-600 hover:text-red-700 font-semibold"
                  >
                    Clear All
                  </button>
                </div>

                <div className="divide-y divide-gray-100">
                  {items.map((item) => {
                    const hasDiscount = (item.mrp || 0) > item.price;
                    const discountPercent = hasDiscount
                      ? Math.round((((item.mrp || 0) - item.price) / (item.mrp || 1)) * 100)
                      : 0;

                    return (
                      <div key={item.id} className="p-4 sm:p-6 flex gap-4 items-start">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-gray-50 border border-gray-100 p-2 flex-shrink-0 flex items-center justify-center">
                          <img
                            src={
                              item.image ||
                              "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&q=80"
                            }
                            alt={item.title}
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-900 text-sm sm:text-base line-clamp-2">
                            {item.title}
                          </h3>
                          {item.variant && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              Variant: {item.variant}
                            </p>
                          )}

                          <div className="flex items-baseline gap-2 mt-2">
                            <span className="text-lg font-black text-gray-900">
                              ₹{item.price.toLocaleString("en-IN")}
                            </span>
                            {hasDiscount && (
                              <>
                                <span className="text-xs text-gray-400 line-through">
                                  ₹{item.mrp?.toLocaleString("en-IN")}
                                </span>
                                <span className="text-xs font-black text-emerald-600">
                                  {discountPercent}% OFF
                                </span>
                              </>
                            )}
                          </div>

                          <div className="flex items-center gap-4 mt-4">
                            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                className="px-2.5 py-1 text-gray-600 hover:bg-gray-200 transition"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="px-3 py-1 font-bold text-xs text-gray-800">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                className="px-2.5 py-1 text-gray-600 hover:bg-gray-200 transition"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            <button
                              onClick={() => removeItem(item.id)}
                              className="text-xs text-gray-400 hover:text-red-600 flex items-center gap-1 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Remove</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Delivery Address Form */}
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    Delivery Address
                  </h3>
                  {session?.user && (
                    <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Verified Account
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      value={address.name}
                      onChange={(e) => setAddress({ ...address, name: e.target.value })}
                      placeholder="Receiver name"
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Phone Number *</label>
                    <input
                      type="tel"
                      value={address.phone}
                      onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                      placeholder="10-digit mobile number"
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-gray-700 mb-1">Street Address *</label>
                    <input
                      type="text"
                      value={address.line1}
                      onChange={(e) => setAddress({ ...address, line1: e.target.value })}
                      placeholder="House No., Building, Street Name"
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">City *</label>
                    <input
                      type="text"
                      value={address.city}
                      onChange={(e) => setAddress({ ...address, city: e.target.value })}
                      placeholder="City"
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">State / Province</label>
                    <input
                      type="text"
                      value={address.state}
                      onChange={(e) => setAddress({ ...address, state: e.target.value })}
                      placeholder="State"
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">PIN Code *</label>
                    <input
                      type="text"
                      value={address.pincode}
                      onChange={(e) => setAddress({ ...address, pincode: e.target.value })}
                      placeholder="6-digit PIN code"
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Method - Single Option: Cashfree Link Only */}
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <h3 className="font-bold text-gray-900 text-sm">Payment Method</h3>
                  <span className="text-[11px] text-gray-400 font-medium">Single Secure Option</span>
                </div>

                {cashfreeEnabled ? (
                  <div className="flex items-start justify-between p-4 rounded-xl border-2 border-blue-600 bg-blue-50/40 relative">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-orange-100 border border-orange-200 flex items-center justify-center text-orange-600 font-black text-xs shrink-0 mt-0.5">
                        CF
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                          <span>Pay online (UPI / Card / Net Banking) via Cashfree</span>
                        </p>
                        <p className="text-[11px] text-gray-600 mt-1 leading-relaxed">
                          Secure payment gateway. You will receive an official payment link to complete payment via UPI, Google Pay, PhonePe, Paytm, Debit/Credit Card or Net Banking.
                        </p>
                        <p className="text-[11px] text-blue-700 font-semibold mt-1 flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          <span>Receiver Name: {payeeName}</span>
                        </p>
                      </div>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 ml-2" />
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-800 flex items-center gap-2 text-xs font-medium">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Payment is temporarily unavailable</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Price Details & Place Order (4 cols) */}
            <div className="lg:col-span-4 space-y-4">
              {/* Coupons Box */}
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
                <h3 className="font-bold text-gray-900 text-xs uppercase tracking-wider flex items-center gap-2">
                  <Tag className="w-4 h-4 text-blue-600" />
                  Coupons & Offers
                </h3>

                {coupon ? (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
                    <div>
                      <p className="font-bold text-emerald-800">{coupon.code} Applied</p>
                      <p className="text-[11px] text-emerald-600">You saved ₹{coupon.discount}!</p>
                    </div>
                    <button
                      onClick={handleRemoveCoupon}
                      className="text-xs text-red-600 hover:text-red-700 font-bold"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyCoupon} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter coupon (e.g. SAVE500)"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="submit"
                      disabled={applyingCoupon}
                      className="rounded-lg bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 text-xs font-bold transition disabled:opacity-50"
                    >
                      {applyingCoupon ? "..." : "Apply"}
                    </button>
                  </form>
                )}
                <p className="text-[11px] text-gray-400">Available: SAVE500, FESTIVE10</p>
              </div>

              {/* Price Breakdown */}
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
                <h3 className="font-bold text-gray-900 text-xs uppercase tracking-wider pb-3 border-b border-gray-100">
                  Price Details
                </h3>

                <div className="space-y-2.5 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span>Price ({items.length} items)</span>
                    <span className="font-medium text-gray-900">
                      ₹{totalMrp.toLocaleString("en-IN")}
                    </span>
                  </div>

                  {mrpDiscount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Discount on MRP</span>
                      <span className="font-semibold">-₹{mrpDiscount.toLocaleString("en-IN")}</span>
                    </div>
                  )}

                  {couponDiscount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Coupon Discount ({coupon?.code})</span>
                      <span className="font-semibold">-₹{couponDiscount.toLocaleString("en-IN")}</span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span>Delivery Charges</span>
                    <span className="font-semibold text-emerald-600">
                      {deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}
                    </span>
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex justify-between text-sm font-extrabold text-gray-950">
                    <span>Total Amount</span>
                    <span>₹{totalAmount.toLocaleString("en-IN")}</span>
                  </div>
                </div>

                {saleCampaign?.isActive && mrpDiscount > 0 ? (
                  <div className="rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 p-3 text-center text-xs font-black text-white shadow-md">
                    🎉 You saved ₹{mrpDiscount.toLocaleString("en-IN")} with Maha Sale!
                  </div>
                ) : totalSavings > 0 ? (
                  <div className="rounded-lg bg-emerald-50 p-2.5 text-center text-xs font-bold text-emerald-700">
                    You will save ₹{totalSavings.toLocaleString("en-IN")} on this order
                  </div>
                ) : null}

                <button
                  onClick={handlePlaceOrder}
                  disabled={isSubmittingOrder || !cashfreeEnabled}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold py-3.5 px-4 shadow-lg transition transform active:scale-98 disabled:opacity-50 text-sm"
                >
                  <span>
                    {!cashfreeEnabled
                      ? "Payment Unavailable"
                      : isSubmittingOrder
                      ? "Processing Order..."
                      : "Place Order"}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="pt-2 flex items-center justify-center gap-2 text-[11px] text-gray-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Safe and Secure Payments · 100% Authentic</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
