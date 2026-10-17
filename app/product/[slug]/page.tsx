import { db } from "@/lib/db";
import { Header } from "@/components/store/header";
import { Footer } from "@/components/store/footer";
import { ProductDetailView } from "@/components/store/product-detail-view";
import { DEMO_FLASH_SALE_PRODUCTS, DEMO_FEATURED_PRODUCTS } from "@/lib/demo-data";
import { getActiveSaleCampaign, getEffectivePrice } from "@/lib/pricing/sale";

export const revalidate = 0;

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const now = new Date();
  const { campaign, blockSaleBelowCost } = await getActiveSaleCampaign(now);

  let product: any = null;
  let similarProducts: any[] = [];

  try {
    product = await db.product.findFirst({
      where: {
        OR: [{ slug }, { id: slug }],
      },
      include: {
        category: true,
        brand: true,
        images: { orderBy: { sortOrder: "asc" } },
        variants: true,
        attributes: true,
        seller: {
          include: {
            user: { select: { name: true, image: true } },
          },
        },
        reviews: {
          where: { isApproved: true },
          include: {
            user: { select: { id: true, name: true, image: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (product) {
      const rawSimilar = await db.product.findMany({
        where: {
          categoryId: product.categoryId,
          id: { not: product.id },
          status: "PUBLISHED",
        },
        include: {
          images: { take: 1 },
          category: true,
        },
        take: 5,
      });

      similarProducts = rawSimilar.map((p) => {
        const eff = getEffectivePrice(p, null, now, campaign, blockSaleBelowCost);
        return {
          ...p,
          price: eff.price,
          mrp: eff.mrp,
          discountPct: eff.discount,
          isSaleActive: eff.isSaleActive,
          savings: eff.savings,
        };
      });
    }
  } catch (err) {
    // DB offline fallback
  }

  // Fallback demo product if DB was offline or product not found in DB
  if (!product) {
    const allDemo = [...DEMO_FLASH_SALE_PRODUCTS, ...DEMO_FEATURED_PRODUCTS];
    const matched = allDemo.find((p) => p.slug === slug || p.id === slug) || allDemo[0];

    product = {
      ...matched,
      description: `Experience the pinnacle of innovation with the ${matched.title}. Engineered with top-grade materials, precision craftsmanship, and industry-leading performance.`,
      brand: { name: "Premium Brand", slug: "brand" },
      variants: [],
      attributes: [
        { name: "Warranty", value: "1 Year Manufacturer Warranty" },
        { name: "Authenticity", value: "100% Genuine Guaranteed" },
        { name: "Delivery", value: "Free 3-4 Day Shipping" },
      ],
      seller: {
        businessName: "TechWorld Official Store",
        rating: 4.8,
        user: { name: "TechWorld Store" },
      },
      reviews: [
        {
          id: "r1",
          rating: 5,
          title: "Outstanding performance!",
          body: "Exceeded all expectations. Pristine condition and fast delivery.",
          user: { name: "Rahul S." },
          createdAt: new Date(),
        },
      ],
    };

    similarProducts = allDemo.filter((p) => p.id !== product.id).slice(0, 4);
  }

  // Apply effective pricing to the main product & its variants
  if (product) {
    const eff = getEffectivePrice(product, null, now, campaign, blockSaleBelowCost);
    const variants = (product.variants || []).map((v: any) => {
      const vEff = getEffectivePrice(product, v, now, campaign, blockSaleBelowCost);
      return {
        ...v,
        price: vEff.price,
        mrp: vEff.mrp,
        discountPct: vEff.discount,
        isSaleActive: vEff.isSaleActive,
      };
    });

    product = {
      ...product,
      price: eff.price,
      mrp: eff.mrp,
      discountPct: eff.discount,
      isSaleActive: eff.isSaleActive,
      savings: eff.savings,
      campaignName: eff.campaignName,
      variants,
    };
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1">
        <ProductDetailView
          product={product}
          similarProducts={similarProducts}
        />
      </main>
      <Footer />
    </div>
  );
}
