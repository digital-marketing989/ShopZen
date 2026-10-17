import { db } from "@/lib/db";
import { Header } from "@/components/store/header";
import { Footer } from "@/components/store/footer";
import { ProductListing } from "@/components/store/product-listing";
import { getActiveSaleCampaign, getEffectivePrice } from "@/lib/pricing/sale";

export const revalidate = 0;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; brand?: string }>;
}) {
  const { q, brand } = await searchParams;
  const now = new Date();
  const { campaign, blockSaleBelowCost } = await getActiveSaleCampaign(now);

  const where: any = { status: "PUBLISHED" };

  if (q) {
    where.OR = [
      { title: { contains: q } },
      { description: { contains: q } },
      { tags: { contains: q } },
    ];
  }

  if (brand) {
    const b = await db.brand.findFirst({
      where: {
        OR: [{ slug: brand }, { name: brand }],
      },
    });
    if (b) where.brandId = b.id;
  }

  const [dbProducts, totalCount, brands] = await Promise.all([
    db.product.findMany({
      where,
      include: {
        images: true,
        category: true,
        brand: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    db.product.count({ where }),
    db.brand.findMany({ orderBy: { name: "asc" } }),
  ]);

  const products = dbProducts.map((p) => {
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

  const pageTitle = q
    ? `Results for "${q}"`
    : brand
    ? `Brand: ${brand}`
    : "All Products";

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1">
        <ProductListing
          initialProducts={products}
          title={pageTitle}
          totalCount={totalCount}
          brands={brands}
        />
      </main>
      <Footer />
    </div>
  );
}
