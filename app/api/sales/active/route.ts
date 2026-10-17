import { NextResponse } from "next/server";
import { getActiveSaleCampaign } from "@/lib/pricing/sale";

export const dynamic = "force-dynamic";

export async function GET() {
  const now = new Date();
  const { campaign, blockSaleBelowCost } = await getActiveSaleCampaign(now);

  if (!campaign || !campaign.isActive) {
    return NextResponse.json({
      active: false,
      campaign: null,
      serverTime: now.toISOString(),
      serverTimeMs: now.getTime(),
    });
  }

  // Format endsAt for IST display e.g. "Ends 22 Oct"
  const endsAtDate = new Date(campaign.endsAt);
  const istFormatter = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
  });
  const endsAtText = `Ends ${istFormatter.format(endsAtDate)}`;

  return NextResponse.json({
    active: true,
    campaign: {
      id: campaign.id,
      name: campaign.name,
      slug: campaign.slug,
      startsAt: campaign.startsAt,
      endsAt: campaign.endsAt,
      minDiscount: campaign.minDiscount,
      maxDiscount: campaign.maxDiscount,
      showBanner: campaign.showBanner,
      bannerText: campaign.bannerText || "Durga Puja Maha Sale: Up to 95% OFF on everything",
      stackWithCoupons: campaign.stackWithCoupons,
      blockSaleBelowCost,
      endsAtFormatted: endsAtText,
    },
    serverTime: now.toISOString(),
    serverTimeMs: now.getTime(),
  });
}
