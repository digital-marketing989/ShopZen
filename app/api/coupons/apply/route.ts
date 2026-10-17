import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getActiveSaleCampaign } from "@/lib/pricing/sale";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, cartTotal } = body;

    if (!code) {
      return NextResponse.json({ error: "Coupon code is required" }, { status: 400 });
    }

    const now = new Date();
    const { campaign } = await getActiveSaleCampaign(now);
    if (campaign && campaign.isActive && campaign.stackWithCoupons === false) {
      return NextResponse.json(
        { error: "Coupons cannot be combined with Maha Sale prices" },
        { status: 400 }
      );
    }

    const coupon = await db.coupon.findUnique({
      where: { code: code.toUpperCase().trim() },
    });

    if (!coupon || !coupon.isActive) {
      return NextResponse.json({ error: "Invalid or inactive coupon code" }, { status: 400 });
    }

    if (coupon.startsAt && coupon.startsAt > now) {
      return NextResponse.json({ error: "Coupon offer has not started yet" }, { status: 400 });
    }

    if (coupon.expiresAt && coupon.expiresAt < now) {
      return NextResponse.json({ error: "Coupon code has expired" }, { status: 400 });
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return NextResponse.json({ error: "Coupon usage limit reached" }, { status: 400 });
    }

    if (coupon.minCartValue && cartTotal < coupon.minCartValue) {
      return NextResponse.json(
        { error: `Minimum order value of ₹${coupon.minCartValue} required for this coupon` },
        { status: 400 }
      );
    }

    let discount = 0;
    if (coupon.type === "PERCENTAGE") {
      discount = Math.round((cartTotal * coupon.value) / 100);
      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    } else {
      discount = coupon.value;
    }

    discount = Math.min(discount, cartTotal);

    return NextResponse.json({
      success: true,
      data: {
        code: coupon.code,
        discount,
        description: coupon.description,
        type: coupon.type,
      },
    });
  } catch (error) {
    console.error("Coupon apply error:", error);
    return NextResponse.json({ error: "Failed to apply coupon" }, { status: 500 });
  }
}
