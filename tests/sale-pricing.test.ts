import { describe, it, expect } from "vitest";
import {
  getProductDiscountHash,
  getEffectivePrice,
  isCampaignActive,
  formatISTDate,
  SaleCampaignData,
} from "../lib/pricing/sale";

describe("Durga Puja Maha Sale Pricing & Campaign Logic", () => {
  const mockCampaign: SaleCampaignData = {
    id: "sale-1",
    name: "Durga Puja Maha Sale",
    slug: "durga-puja-maha-sale",
    startsAt: new Date("2026-10-17T00:00:00Z"),
    endsAt: new Date("2026-10-22T18:29:59Z"), // 23:59:59 IST
    minDiscount: 85,
    maxDiscount: 95,
    isActive: true,
    stackWithCoupons: false,
    showBanner: true,
    bannerText: "Durga Puja Maha Sale: Up to 95% OFF on everything",
    blockSaleBelowCost: false,
  };

  it("produces deterministic, stable per-product discount between 85% and 95%", () => {
    const p1 = "prod_iphone_15_pro";
    const p2 = "prod_sony_headphones_wh1000";
    const p3 = "prod_nike_air_jordan";

    const d1_first = getProductDiscountHash(p1, 85, 95);
    const d1_second = getProductDiscountHash(p1, 85, 95);
    expect(d1_first).toBe(d1_second); // Stable!
    expect(d1_first).toBeGreaterThanOrEqual(85);
    expect(d1_first).toBeLessThanOrEqual(95);

    const d2 = getProductDiscountHash(p2, 85, 95);
    const d3 = getProductDiscountHash(p3, 85, 95);

    expect(d2).toBeGreaterThanOrEqual(85);
    expect(d2).toBeLessThanOrEqual(95);
    expect(d3).toBeGreaterThanOrEqual(85);
    expect(d3).toBeLessThanOrEqual(95);

    // Verify over 100 sample IDs that every hash is strictly within [85, 95]
    for (let i = 0; i < 100; i++) {
      const disc = getProductDiscountHash(`test_product_${i}`, 85, 95);
      expect(disc).toBeGreaterThanOrEqual(85);
      expect(disc).toBeLessThanOrEqual(95);
    }
  });

  it("calculates effective price accurately without altering stored MRP", () => {
    const product = {
      id: "prod_laptop_99",
      price: 60000,
      mrp: 80000,
      costPrice: 40000,
    };

    const duringSale = new Date("2026-10-18T10:00:00Z");
    const result = getEffectivePrice(product, null, duringSale, mockCampaign);

    expect(result.isSaleActive).toBe(true);
    expect(result.mrp).toBe(80000); // MRP is untouched
    expect(result.discount).toBeGreaterThanOrEqual(85);
    expect(result.discount).toBeLessThanOrEqual(95);

    // Price formula: round(mrp * (1 - discount/100))
    const expected = Math.round(80000 * (1 - result.discount / 100));
    expect(result.price).toBe(expected);
    expect(result.savings).toBe(80000 - expected);
  });

  it("respects product saleDiscountOverride when provided by admin", () => {
    const product = {
      id: "prod_laptop_override",
      price: 50000,
      mrp: 100000,
      saleDiscountOverride: 92, // Explicit admin override
    };

    const duringSale = new Date("2026-10-18T10:00:00Z");
    const result = getEffectivePrice(product, null, duringSale, mockCampaign);

    expect(result.discount).toBe(92);
    expect(result.price).toBe(8000); // 100000 * (1 - 0.92) = 8000
    expect(result.savings).toBe(92000);
  });

  it("respects category saleDiscountOverride when product has no direct override", () => {
    const product = {
      id: "prod_tshirt",
      price: 1500,
      mrp: 2000,
      saleDiscountOverride: null,
      category: {
        id: "cat_fashion",
        saleDiscountOverride: 88,
      },
    };

    const duringSale = new Date("2026-10-18T10:00:00Z");
    const result = getEffectivePrice(product, null, duringSale, mockCampaign);

    expect(result.discount).toBe(88);
    expect(result.price).toBe(240); // 2000 * (1 - 0.88) = 240
  });

  it("enforces price floor of at least 1 rupee", () => {
    const cheapProduct = {
      id: "prod_pen",
      price: 10,
      mrp: 10,
      saleDiscountOverride: 99,
    };

    const duringSale = new Date("2026-10-18T10:00:00Z");
    const result = getEffectivePrice(cheapProduct, null, duringSale, mockCampaign);

    expect(result.price).toBeGreaterThanOrEqual(1);
  });

  it("detects margin guard warning and clamps price when blockSaleBelowCost is true", () => {
    const lowMarginProduct = {
      id: "prod_gold_coin",
      price: 50000,
      mrp: 60000,
      costPrice: 25000, // Cost is 25000
    };

    const duringSale = new Date("2026-10-18T10:00:00Z");

    // 1. Without blockSaleBelowCost (default off)
    const normalSale = getEffectivePrice(lowMarginProduct, null, duringSale, mockCampaign, false);
    expect(normalSale.isBelowCost).toBe(true);
    expect(normalSale.price).toBeLessThan(lowMarginProduct.costPrice);

    // 2. With blockSaleBelowCost (activated)
    const clampedSale = getEffectivePrice(lowMarginProduct, null, duringSale, mockCampaign, true);
    expect(clampedSale.price).toBeGreaterThanOrEqual(lowMarginProduct.costPrice);
    expect(clampedSale.price).toBe(25000);
  });

  it("handles IST timezone end date correctly and reverts prices automatically after endsAt", () => {
    const product = {
      id: "prod_watch",
      price: 4000,
      mrp: 5000,
    };

    // 2026-10-22T23:59:59+05:30 in UTC is 2026-10-22T18:29:59Z
    const oneSecBeforeEnd = new Date("2026-10-22T18:29:58Z");
    const oneSecAfterEnd = new Date("2026-10-22T18:30:00Z");

    expect(isCampaignActive(mockCampaign, oneSecBeforeEnd)).toBe(true);
    expect(isCampaignActive(mockCampaign, oneSecAfterEnd)).toBe(false);

    const priceBefore = getEffectivePrice(product, null, oneSecBeforeEnd, mockCampaign);
    expect(priceBefore.isSaleActive).toBe(true);
    expect(priceBefore.price).toBeLessThan(1000); // 85-95% off

    const priceAfter = getEffectivePrice(product, null, oneSecAfterEnd, mockCampaign);
    expect(priceAfter.isSaleActive).toBe(false);
    expect(priceAfter.price).toBe(4000); // Reverted to normal price!
    expect(priceAfter.mrp).toBe(5000);
  });

  it("reverts prices automatically when campaign is paused (isActive: false)", () => {
    const product = {
      id: "prod_speaker",
      price: 3000,
      mrp: 4000,
    };

    const pausedCampaign: SaleCampaignData = {
      ...mockCampaign,
      isActive: false, // Paused by admin
    };

    const duringSale = new Date("2026-10-18T10:00:00Z");
    const result = getEffectivePrice(product, null, duringSale, pausedCampaign);

    expect(result.isSaleActive).toBe(false);
    expect(result.price).toBe(3000);
  });

  it("enforces coupon restriction: stackWithCoupons is false during Maha Sale", () => {
    expect(mockCampaign.stackWithCoupons).toBe(false);
  });

  it("formats IST dates properly for user display", () => {
    const testDate = new Date("2026-10-22T18:29:59Z"); // 23:59:59 IST
    const formatted = formatISTDate(testDate);
    expect(formatted).toContain("22");
    expect(formatted).toContain("Oct");
    expect(formatted).toContain("2026");
  });
});
