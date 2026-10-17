export interface PricingItem {
  productId: string;
  variantId?: string | null;
  sellerId?: string | null;
  title?: string;
  image?: string | null;
  quantity: number;
  price: number; // Server-fetched price
  mrp: number;   // Server-fetched mrp
}

export interface CouponRule {
  code: string;
  type: "PERCENTAGE" | "FIXED";
  value: number;
  minCartValue?: number;
  maxDiscount?: number | null;
  isActive?: boolean;
}

export interface SellerInfo {
  id: string;
  commissionRate: number; // e.g. 10.0 for 10%
}

/**
 * Recomputes order subtotal, discounts, taxes, and shipping on the server.
 * Never trust client prices!
 */
export function calculateOrderPricing(
  items: PricingItem[],
  coupon?: CouponRule | null,
  walletAmountToUse: number = 0
) {
  let subtotal = 0;
  let totalMrp = 0;

  for (const item of items) {
    const qty = Math.max(1, Math.floor(item.quantity));
    subtotal += item.price * qty;
    totalMrp += (item.mrp || item.price) * qty;
  }

  // Calculate Coupon Discount
  const couponDiscount = coupon ? calculateCouponDiscount(coupon, subtotal) : 0;

  // Delivery Fee: Free for orders > 500, else 40
  const deliveryFee = subtotal >= 500 || subtotal === 0 ? 0 : 40;

  // 18% GST (already inclusive or calculated)
  const tax = Math.round(subtotal * 0.18);

  // Amount before wallet
  const netBeforeWallet = Math.max(0, subtotal - couponDiscount + deliveryFee);

  // Apply wallet credit if requested
  const appliedWallet = Math.min(Math.max(0, walletAmountToUse), netBeforeWallet);
  const finalTotal = netBeforeWallet - appliedWallet;

  return {
    subtotal,
    totalMrp,
    mrpDiscount: Math.max(0, totalMrp - subtotal),
    couponDiscount,
    deliveryFee,
    tax,
    appliedWallet,
    finalTotal,
  };
}

/**
 * Validates and calculates coupon discount respecting caps and min order value.
 */
export function calculateCouponDiscount(coupon: CouponRule, subtotal: number): number {
  if (!coupon || coupon.isActive === false) return 0;

  if (coupon.minCartValue && subtotal < coupon.minCartValue) {
    return 0;
  }

  let discount = 0;
  if (coupon.type === "PERCENTAGE") {
    discount = Math.round((subtotal * coupon.value) / 100);
    if (coupon.maxDiscount && discount > coupon.maxDiscount) {
      discount = coupon.maxDiscount;
    }
  } else {
    discount = coupon.value;
  }

  return Math.min(discount, subtotal);
}

/**
 * Splits master order items into per-seller SubOrders with independent commission and payouts.
 */
export function calculateSubOrderSplit(
  items: PricingItem[],
  sellersMap: Map<string, SellerInfo>
) {
  const sellerGroups = new Map<string, PricingItem[]>();

  for (const item of items) {
    const sellerId = item.sellerId || "default-seller";
    if (!sellerGroups.has(sellerId)) {
      sellerGroups.set(sellerId, []);
    }
    sellerGroups.get(sellerId)!.push(item);
  }

  const subOrders = Array.from(sellerGroups.entries()).map(([sellerId, sellerItems]) => {
    const seller = sellersMap.get(sellerId) || { id: sellerId, commissionRate: 10.0 };
    const sellerSubtotal = sellerItems.reduce(
      (sum, item) => sum + item.price * Math.max(1, item.quantity),
      0
    );

    const commissionRate = seller.commissionRate;
    const commissionAmount = Math.round((sellerSubtotal * commissionRate) / 100);
    const payoutAmount = Math.max(0, sellerSubtotal - commissionAmount);

    return {
      sellerId,
      items: sellerItems,
      subtotal: sellerSubtotal,
      commissionRate,
      commissionAmount,
      payoutAmount,
    };
  });

  return subOrders;
}

/**
 * Validates stock quantity against available ledger.
 */
export function validateStockAvailability(
  items: { productId: string; quantity: number }[],
  stockMap: Map<string, number>
) {
  for (const item of items) {
    const available = stockMap.get(item.productId) ?? 0;
    if (item.quantity > available) {
      return {
        valid: false,
        error: `Insufficient stock for product ${item.productId}. Available: ${available}, Requested: ${item.quantity}`,
        productId: item.productId,
      };
    }
  }
  return { valid: true };
}
