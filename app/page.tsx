import { db } from "@/lib/db";
import { Header } from "@/components/store/header";
import { Footer } from "@/components/store/footer";
import { HomeView } from "@/components/store/home-view";
import {
  DEMO_CATEGORIES,
  DEMO_FLASH_SALE_PRODUCTS,
  DEMO_FEATURED_PRODUCTS,
  DEMO_ELECTRONICS_PRODUCTS,
  DEMO_FASHION_PRODUCTS,
} from "@/lib/demo-data";
import { getActiveSaleCampaign, getEffectivePrice } from "@/lib/pricing/sale";

export const revalidate = 0;

export default async function HomePage() {
  const now = new Date();
  const { campaign, blockSaleBelowCost } = await getActiveSaleCampaign(now);

  let categories: any[] = [];
  let flashSaleProducts: any[] = [];
  let featuredProducts: any[] = [];
  let electronicsProducts: any[] = [];
  let fashionProducts: any[] = [];
  let mahaSaleProducts: any[] = [];

  const mapWithSalePrice = (prods: any[]) =>
    prods.map((p) => {
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

  try {
    const [
      dbCategories,
      dbFlashSale,
      dbFeatured,
      electronicsCategory,
      fashionCategory,
      allSaleCandidates,
    ] = await Promise.all([
      db.category.findMany({
        where: { parentId: null, isActive: true },
        orderBy: { sortOrder: "asc" },
      }),
      db.product.findMany({
        where: {
          status: "PUBLISHED",
          OR: [{ isFlashSale: true }, { discount: { gte: 25 } }],
        },
        include: {
          images: { take: 1 },
          category: true,
        },
        orderBy: { discount: "desc" },
        take: 8,
      }),
      db.product.findMany({
        where: { status: "PUBLISHED", isFeatured: true },
        include: {
          images: { take: 1 },
          category: true,
        },
        orderBy: { rating: "desc" },
        take: 8,
      }),
      db.category.findFirst({
        where: { slug: { in: ["electronics-computers", "electronics"] } },
      }),
      db.category.findFirst({
        where: { slug: { in: ["fashion-lifestyle", "fashion"] } },
      }),
      db.product.findMany({
        where: { status: "PUBLISHED" },
        include: {
          images: { take: 1 },
          category: true,
        },
        take: 40,
      }),
    ]);

    categories = dbCategories;
    flashSaleProducts = mapWithSalePrice(dbFlashSale);
    featuredProducts = mapWithSalePrice(dbFeatured);

    const [dbElectronics, dbFashion] = await Promise.all([
      electronicsCategory
        ? db.product.findMany({
            where: { categoryId: electronicsCategory.id, status: "PUBLISHED" },
            include: { images: { take: 1 }, category: true },
            take: 6,
          })
        : db.product.findMany({
            where: { status: "PUBLISHED" },
            include: { images: { take: 1 }, category: true },
            take: 6,
          }),
      fashionCategory
        ? db.product.findMany({
            where: { categoryId: fashionCategory.id, status: "PUBLISHED" },
            include: { images: { take: 1 }, category: true },
            take: 6,
          })
        : db.product.findMany({
            where: { status: "PUBLISHED" },
            include: { images: { take: 1 }, category: true },
            skip: 6,
            take: 6,
          }),
    ]);

    electronicsProducts = mapWithSalePrice(dbElectronics);
    fashionProducts = mapWithSalePrice(dbFashion);

    // Maha Sale Top 12 products
    const mappedSale = mapWithSalePrice(allSaleCandidates);
    mappedSale.sort((a, b) => (b.discountPct || 0) - (a.discountPct || 0));
    mahaSaleProducts = mappedSale.slice(0, 12);
  } catch (error) {
    categories = DEMO_CATEGORIES;
    flashSaleProducts = mapWithSalePrice(DEMO_FLASH_SALE_PRODUCTS);
    featuredProducts = mapWithSalePrice(DEMO_FEATURED_PRODUCTS);
    electronicsProducts = mapWithSalePrice(DEMO_ELECTRONICS_PRODUCTS);
    fashionProducts = mapWithSalePrice(DEMO_FASHION_PRODUCTS);
    mahaSaleProducts = mapWithSalePrice([
      ...DEMO_FLASH_SALE_PRODUCTS,
      ...DEMO_FEATURED_PRODUCTS,
    ]).slice(0, 12);
  }

  // Fallbacks if empty
  if (!categories.length) categories = DEMO_CATEGORIES;
  if (!flashSaleProducts.length) flashSaleProducts = mapWithSalePrice(DEMO_FLASH_SALE_PRODUCTS);
  if (!featuredProducts.length) featuredProducts = mapWithSalePrice(DEMO_FEATURED_PRODUCTS);
  if (!electronicsProducts.length) electronicsProducts = mapWithSalePrice(DEMO_ELECTRONICS_PRODUCTS);
  if (!fashionProducts.length) fashionProducts = mapWithSalePrice(DEMO_FASHION_PRODUCTS);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1">
        <HomeView
          categories={categories}
          flashSaleProducts={flashSaleProducts}
          featuredProducts={featuredProducts}
          electronicsProducts={electronicsProducts}
          fashionProducts={fashionProducts}
          saleCampaign={campaign}
          mahaSaleProducts={mahaSaleProducts}
        />
      </main>
      <Footer />
    </div>
  );
}
