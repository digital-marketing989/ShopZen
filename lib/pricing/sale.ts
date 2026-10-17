import { db } from "@/lib/db";

export interface SaleCampaignData {
  id: string;
  name: string;
  slug: string;
  startsAt: Date | string;
  endsAt: Date | string;
  minDiscount: number;
  maxDiscount: number;
  isActive: boolean;
  stackWithCoupons: boolean;
  showBanner: boolean;
  bannerText?: string | null;
  blockSaleBelowCost?: boolean;
}

export interface PricingProduct {
  id: string;
  price: number;
  mrp: number;
  costPrice?: number | null;
  saleDiscountOverride?: number | null;
  categoryId?: string | null;
  category?: {
    id?: string;
    saleDiscountOverride?: number | null;
  } | null;
}

export interface PricingVariant {
  id?: string;
  price: number;
  mrp?: number | null;
}

export interface EffectivePriceResult {
  price: number;              // The price customer pays (rounded, >= 1)
  mrp: number;                // Real MRP (never inflated)
  discount: number;           // Discount % integer
  savings: number;            // mrp - price
  isSaleActive: boolean;      // True if Maha Sale is active and applied
  campaignName?: string;
  campaignSlug?: string;
  isBelowCost: boolean;       // True if sale price < costPrice (for admin warning)
  costPrice?: number | null;
  stackWithCoupons: boolean;
}

/**
 * Deterministically computes a stable discount % between minDiscount and maxDiscount
 * derived from a hash of the productId.
 */
export function getProductDiscountHash(
  productId: string,
  minDiscount: number = 85,
  maxDiscount: number = 95
): number {
  if (minDiscount >= maxDiscount) return minDiscount;
  let hash = 0;
  for (let i = 0; i < productId.length; i++) {
    const char = productId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  const positiveHash = Math.abs(hash);
  const range = maxDiscount - minDiscount + 1;
  return minDiscount + (positiveHash % range);
}

/**
 * Check if a campaign is currently active at a given date/time.
 */
export function isCampaignActive(
  campaign: SaleCampaignData | null | undefined,
  now: Date = new Date()
): boolean {
  if (!campaign || !campaign.isActive) return false;
  const startsAt = new Date(campaign.startsAt).getTime();
  const endsAt = new Date(campaign.endsAt).getTime();
  const current = now.getTime();
  return current >= startsAt && current <= endsAt;
}

/**
 * Core pricing function (server side single source of truth).
 * Never inflates or alters stored MRP. Real MRP struck through.
 * Minimum price is 1 rupee.
 */
export function getEffectivePrice(
  product: PricingProduct,
  variant?: PricingVariant | null,
  now: Date = new Date(),
  campaign?: SaleCampaignData | null,
  blockSaleBelowCostOption?: boolean
): EffectivePriceResult {
  // 1. Determine MRP: Variants use their own MRP if provided, else fallback
  const realMrp = variant
    ? variant.mrp && variant.mrp > 0
      ? variant.mrp
      : product.mrp > 0
      ? product.mrp
      : variant.price
    : product.mrp > 0
    ? product.mrp
    : product.price;

  const normalPrice = variant ? variant.price : product.price;
  const cost = product.costPrice ?? null;
  const blockBelowCost =
    blockSaleBelowCostOption ?? campaign?.blockSaleBelowCost ?? false;

  const active = isCampaignActive(campaign, now);

  if (!active || !campaign) {
    // Normal pricing outside sale
    const discount =
      realMrp > normalPrice
        ? Math.max(0, Math.round(((realMrp - normalPrice) / realMrp) * 100))
        : 0;
    return {
      price: Math.max(1, Math.round(normalPrice)),
      mrp: realMrp,
      discount,
      savings: Math.max(0, realMrp - Math.max(1, Math.round(normalPrice))),
      isSaleActive: false,
      isBelowCost: cost !== null && cost > 0 && normalPrice < cost,
      costPrice: cost,
      stackWithCoupons: true,
    };
  }

  // 2. Determine Sale Discount %
  let discount: number;

  if (
    product.saleDiscountOverride !== undefined &&
    product.saleDiscountOverride !== null &&
    product.saleDiscountOverride > 0
  ) {
    discount = product.saleDiscountOverride;
  } else if (
    product.category?.saleDiscountOverride !== undefined &&
    product.category?.saleDiscountOverride !== null &&
    product.category.saleDiscountOverride > 0
  ) {
    discount = product.category.saleDiscountOverride;
  } else {
    discount = getProductDiscountHash(
      product.id,
      campaign.minDiscount ?? 85,
      campaign.maxDiscount ?? 95
    );
  }

  // Clamp discount between 1% and 99%
  discount = Math.min(99, Math.max(1, Math.round(discount)));

  // 3. Compute Sale Price: round(MRP x (1 - discount/100)), never below 1 rupee
  let salePrice = Math.max(1, Math.round(realMrp * (1 - discount / 100)));

  // 4. Margin guard check
  const wouldBeBelowCost = cost !== null && cost > 0 && salePrice < cost;

  if (blockBelowCost && wouldBeBelowCost && cost !== null) {
    // Clamp to keep price at or above cost
    salePrice = Math.min(realMrp, Math.max(1, Math.round(cost)));
    discount =
      realMrp > salePrice
        ? Math.max(0, Math.round(((realMrp - salePrice) / realMrp) * 100))
        : 0;
  }

  return {
    price: salePrice,
    mrp: realMrp,
    discount,
    savings: Math.max(0, realMrp - salePrice),
    isSaleActive: true,
    campaignName: campaign.name,
    campaignSlug: campaign.slug,
    isBelowCost: wouldBeBelowCost,
    costPrice: cost,
    stackWithCoupons: campaign.stackWithCoupons ?? false,
  };
}

/**
 * Server-side helper to fetch the active sale campaign and setting from DB.
 */
let cachedCampaign: {
  campaign: SaleCampaignData | null;
  blockBelowCost: boolean;
  fetchedAt: number;
} | null = null;

export async function getActiveSaleCampaign(
  now: Date = new Date(),
  forceFresh = false
): Promise<{ campaign: SaleCampaignData | null; blockSaleBelowCost: boolean }> {
  const CACHE_TTL_MS = 10000; // 10 seconds for agility, auto-expires near endsAt
  const current = now.getTime();

  if (
    !forceFresh &&
    cachedCampaign &&
    current - cachedCampaign.fetchedAt < CACHE_TTL_MS
  ) {
    // If endsAt was in the cached window, ensure we don't return expired
    if (
      cachedCampaign.campaign &&
      new Date(cachedCampaign.campaign.endsAt).getTime() < current
    ) {
      // Expired, invalidate cache
      cachedCampaign = null;
    } else {
      return {
        campaign: cachedCampaign.campaign,
        blockSaleBelowCost: cachedCampaign.blockBelowCost,
      };
    }
  }

  try {
    const campaign = await db.saleCampaign.findFirst({
      where: {
        isActive: true,
        startsAt: { lte: now },
        endsAt: { gte: now },
      },
      orderBy: { createdAt: "desc" },
    });

    // Check setting for block sale below cost
    const setting = await db.setting.findUnique({
      where: { key: "BLOCK_SALE_BELOW_COST" },
    });
    const blockSetting =
      setting?.value === "true" || campaign?.blockSaleBelowCost === true;

    cachedCampaign = {
      campaign: campaign as any,
      blockBelowCost: blockSetting,
      fetchedAt: current,
    };

    return {
      campaign: campaign as any,
      blockSaleBelowCost: blockSetting,
    };
  } catch (error) {
    console.error("Failed to fetch active sale campaign:", error);
    return { campaign: null, blockSaleBelowCost: false };
  }
}

/**
 * Format IST Date for display (Asia/Kolkata).
 */
export function formatISTDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
