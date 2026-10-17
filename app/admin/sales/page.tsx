import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminSalesView } from "@/components/admin/admin-sales-view";
import { getEffectivePrice } from "@/lib/pricing/sale";

export const revalidate = 0;

export default async function AdminSalesPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/admin/sales");
  }

  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    redirect("/");
  }

  const [campaigns, categories, rawProducts, blockSetting] = await Promise.all([
    db.saleCampaign.findMany({
      orderBy: { createdAt: "desc" },
    }),
    db.category.findMany({
      select: { id: true, name: true, slug: true, saleDiscountOverride: true },
      orderBy: { name: "asc" },
    }),
    db.product.findMany({
      select: {
        id: true,
        title: true,
        slug: true,
        mrp: true,
        price: true,
        costPrice: true,
        saleDiscountOverride: true,
        categoryId: true,
        category: { select: { id: true, name: true, saleDiscountOverride: true } },
      },
      orderBy: { title: "asc" },
    }),
    db.setting.findUnique({
      where: { key: "BLOCK_SALE_BELOW_COST" },
    }),
  ]);

  const activeCampaign = campaigns.find((c) => c.isActive) || campaigns[0] || null;
  const isBlockBelowCost = blockSetting?.value === "true";

  const now = new Date();
  const products = rawProducts.map((p) => {
    const eff = getEffectivePrice(p, null, now, activeCampaign, isBlockBelowCost);
    const isBelowCost = Boolean(p.costPrice && p.costPrice > 0 && eff.price < p.costPrice);
    return {
      ...p,
      effectiveSalePrice: eff.price,
      effectiveDiscount: eff.discount,
      effectiveSavings: eff.savings,
      isBelowCost,
    };
  });

  return (
    <AdminSalesView
      initialCampaigns={campaigns}
      initialActiveCampaign={activeCampaign}
      initialCategories={categories}
      initialProducts={products}
      initialBlockSaleBelowCost={isBlockBelowCost}
    />
  );
}
