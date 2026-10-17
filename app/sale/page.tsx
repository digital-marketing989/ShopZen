import { db } from "@/lib/db";
import { Header } from "@/components/store/header";
import { Footer } from "@/components/store/footer";
import { SaleLandingView } from "@/components/sale/sale-landing-view";
import { getActiveSaleCampaign, getEffectivePrice } from "@/lib/pricing/sale";
import type { Metadata } from "next";

export const revalidate = 0; // Dynamic compute at request time

export const metadata: Metadata = {
  title: "Durga Puja Maha Sale — 85% to 95% OFF | ShopZen",
  description:
    "Shop the grand Durga Puja Maha Sale with 85% to 95% discount across all categories. Limited time festive offer with struck-through MRP and genuine prices.",
};

export default async function SalePage() {
  const now = new Date();
  const { campaign, blockSaleBelowCost } = await getActiveSaleCampaign(now);

  let categories: any[] = [];
  let products: any[] = [];

  try {
    const [dbCategories, dbProducts] = await Promise.all([
      db.category.findMany({
        where: { parentId: null },
        orderBy: { sortOrder: "asc" },
      }),
      db.product.findMany({
        where: { status: "PUBLISHED" },
        include: {
          category: true,
          brand: true,
          images: { take: 1, orderBy: { sortOrder: "asc" } },
        },
      }),
    ]);

    categories = dbCategories;

    // Apply effective sale pricing to every product
    products = dbProducts.map((p) => {
      const eff = getEffectivePrice(p, null, now, campaign, blockSaleBelowCost);
      return {
        ...p,
        price: eff.price,
        mrp: eff.mrp,
        discountPct: eff.discount,
        isSaleActive: eff.isSaleActive,
        savings: eff.savings,
        campaignName: eff.campaignName,
      };
    });
  } catch (err) {
    console.error("Sale page error:", err);
  }

  // Format endsAt for display
  let campaignData = null;
  if (campaign) {
    const endsAtDate = new Date(campaign.endsAt);
    const endsAtFormatted = `Ends ${new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "short",
    }).format(endsAtDate)}`;

    campaignData = {
      ...campaign,
      startsAt: new Date(campaign.startsAt).toISOString(),
      endsAt: new Date(campaign.endsAt).toISOString(),
      endsAtFormatted,
    };
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1">
        <SaleLandingView
          campaign={campaignData}
          serverTimeMs={now.getTime()}
          initialProducts={products}
          categories={categories}
        />
      </main>
      <Footer />
    </div>
  );
}
