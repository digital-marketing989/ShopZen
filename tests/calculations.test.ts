import { describe, it, expect } from "vitest";
import {
  calculateOrderPricing,
  calculateCouponDiscount,
  calculateSubOrderSplit,
  validateStockAvailability,
} from "../lib/calculations";

describe("Pricing and Calculations", () => {
  it("correctly calculates order subtotal and applies free delivery over 500", () => {
    const items = [
      { productId: "p1", quantity: 2, price: 300, mrp: 500 },
      { productId: "p2", quantity: 1, price: 150, mrp: 200 },
    ];

    const pricing = calculateOrderPricing(items);
    expect(pricing.subtotal).toBe(750);
    expect(pricing.totalMrp).toBe(1200);
    expect(pricing.mrpDiscount).toBe(450);
    expect(pricing.deliveryFee).toBe(0); // >= 500 is free
    expect(pricing.finalTotal).toBe(750);
  });

  it("adds delivery fee for orders under 500", () => {
    const items = [{ productId: "p1", quantity: 1, price: 250, mrp: 300 }];
    const pricing = calculateOrderPricing(items);
    expect(pricing.subtotal).toBe(250);
    expect(pricing.deliveryFee).toBe(40);
    expect(pricing.finalTotal).toBe(290);
  });

  it("applies percentage coupon with max discount cap", () => {
    const coupon = {
      code: "SAVE20",
      type: "PERCENTAGE" as const,
      value: 20,
      minCartValue: 500,
      maxDiscount: 100,
    };

    // 20% of 1000 is 200, but capped at 100
    const discount = calculateCouponDiscount(coupon, 1000);
    expect(discount).toBe(100);

    // Below min cart value -> 0
    const belowMin = calculateCouponDiscount(coupon, 400);
    expect(belowMin).toBe(0);
  });

  it("splits multi-vendor orders into per-seller SubOrders with commission", () => {
    const items = [
      { productId: "p1", sellerId: "seller-alpha", price: 1000, quantity: 1, mrp: 1200 },
      { productId: "p2", sellerId: "seller-alpha", price: 500, quantity: 2, mrp: 600 },
      { productId: "p3", sellerId: "seller-beta", price: 2000, quantity: 1, mrp: 2500 },
    ];

    const sellersMap = new Map([
      ["seller-alpha", { id: "seller-alpha", commissionRate: 10 }], // 10%
      ["seller-beta", { id: "seller-beta", commissionRate: 15 }],  // 15%
    ]);

    const subOrders = calculateSubOrderSplit(items, sellersMap);
    expect(subOrders).toHaveLength(2);

    const alpha = subOrders.find((s) => s.sellerId === "seller-alpha")!;
    expect(alpha.subtotal).toBe(2000); // 1000 + 1000
    expect(alpha.commissionAmount).toBe(200); // 10% of 2000
    expect(alpha.payoutAmount).toBe(1800); // 2000 - 200

    const beta = subOrders.find((s) => s.sellerId === "seller-beta")!;
    expect(beta.subtotal).toBe(2000);
    expect(beta.commissionAmount).toBe(300); // 15% of 2000
    expect(beta.payoutAmount).toBe(1700);
  });

  it("validates stock availability correctly", () => {
    const stockMap = new Map([
      ["p1", 10],
      ["p2", 2],
    ]);

    const validCheck = validateStockAvailability(
      [
        { productId: "p1", quantity: 5 },
        { productId: "p2", quantity: 2 },
      ],
      stockMap
    );
    expect(validCheck.valid).toBe(true);

    const invalidCheck = validateStockAvailability(
      [{ productId: "p2", quantity: 3 }],
      stockMap
    );
    expect(invalidCheck.valid).toBe(false);
  });
});
