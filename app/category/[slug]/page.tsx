import { Metadata } from "next";
import { db } from "@/lib/db";
import { Header } from "@/components/store/header";
import { Footer } from "@/components/store/footer";
import { ProductListing, BreadcrumbItem, SubcategoryChip } from "@/components/store/product-listing";
import { DEMO_CATEGORIES, DEMO_FLASH_SALE_PRODUCTS, DEMO_FEATURED_PRODUCTS } from "@/lib/demo-data";
import { getActiveSaleCampaign, getEffectivePrice } from "@/lib/pricing/sale";

export const revalidate = 0;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const category = await db.category.findUnique({
      where: { slug },
      include: { parent: true },
    });

    if (category) {
      const parentName = category.parent ? `${category.parent.name} - ` : "";
      return {
        title: `${category.name} | ${parentName}ShopZen India`,
        description:
          category.description ||
          `Shop top quality ${category.name} online at best prices on ShopZen with authentic discounts and fast delivery.`,
        openGraph: {
          title: `${category.name} - Best Deals on ShopZen`,
          description: category.description || `Browse verified ${category.name} catalog on ShopZen.`,
          images: category.banner || category.image ? [{ url: (category.banner || category.image)! }] : [],
        },
      };
    }
  } catch {}

  const formatted = slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " ");
  return {
    title: `${formatted} | ShopZen`,
    description: `Explore ${formatted} on ShopZen India with fast shipping and authentic prices.`,
  };
}

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params;
  const now = new Date();
  const { campaign, blockSaleBelowCost } = await getActiveSaleCampaign(now);

  let category: any = null;
  let products: any[] = [];
  let totalCount = 0;
  let brands: any[] = [];
  const breadcrumbs: BreadcrumbItem[] = [];
  let subcategoryChips: SubcategoryChip[] = [];

  try {
    category = await db.category.findUnique({
      where: { slug },
      include: {
        parent: {
          include: {
            parent: true,
            children: {
              where: { isActive: true },
              orderBy: { sortOrder: "asc" },
              include: { _count: { select: { products: true } } },
            },
          },
        },
        children: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
          include: { _count: { select: { products: true } } },
        },
      },
    });

    if (category) {
      // Build breadcrumbs
      if (category.parent) {
        if (category.parent.parent) {
          breadcrumbs.push({
            name: category.parent.parent.name,
            url: `/category/${category.parent.parent.slug}`,
          });
        }
        breadcrumbs.push({
          name: category.parent.name,
          url: `/category/${category.parent.slug}`,
        });
        breadcrumbs.push({
          name: category.name,
        });

        // Sibling chips if at subcategory level
        if (category.parent.children) {
          subcategoryChips = category.parent.children.map((c: any) => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
            productCount: c._count?.products || 0,
          }));
        }
      } else {
        breadcrumbs.push({
          name: category.name,
        });

        // Child chips if at top level
        subcategoryChips = category.children.map((c: any) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          productCount: c._count?.products || 0,
        }));
      }

      // Collect this category ID and all children IDs
      const categoryIds = [category.id, ...category.children.map((c: any) => c.id)];

      const [dbProducts, dbTotalCount, dbBrands] = await Promise.all([
        db.product.findMany({
          where: {
            categoryId: { in: categoryIds },
            status: "PUBLISHED",
          },
          include: {
            images: true,
            category: true,
            brand: true,
          },
          orderBy: { createdAt: "desc" },
        }),
        db.product.count({
          where: {
            categoryId: { in: categoryIds },
            status: "PUBLISHED",
          },
        }),
        db.brand.findMany({
          where: {
            products: {
              some: { categoryId: { in: categoryIds } },
            },
          },
          orderBy: { name: "asc" },
        }),
      ]);

      products = dbProducts;
      totalCount = dbTotalCount;
      brands = dbBrands;
    }
  } catch (err) {
    console.error("Category page DB error:", err);
  }

  // Fallback category & products if DB was unreachable or empty
  if (!category) {
    const demoCat = DEMO_CATEGORIES.find((c) => c.slug === slug);
    category = demoCat || {
      id: `cat_${slug}`,
      name: slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " "),
      slug,
      children: [],
    };
  }

  if (!products.length) {
    const allDemo = [...DEMO_FLASH_SALE_PRODUCTS, ...DEMO_FEATURED_PRODUCTS];
    products = allDemo.filter((p) => p.category.slug === slug || p.category.name.toLowerCase().includes(slug.replace(/-/g, " ")));
    totalCount = products.length;
  }

  if (brands.length === 0) {
    brands = [
      { id: "b1", name: "Apple", slug: "apple" },
      { id: "b2", name: "Samsung", slug: "samsung" },
      { id: "b3", name: "Sony", slug: "sony" },
      { id: "b4", name: "boAt", slug: "boat" },
      { id: "b5", name: "Nike", slug: "nike" },
      { id: "b6", name: "Adidas", slug: "adidas" },
    ];
  }

  // Apply single source of truth sale pricing
  products = products.map((p) => {
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

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1">
        <ProductListing
          initialProducts={products}
          title={category.name}
          totalCount={totalCount}
          brands={brands}
          categorySlug={slug}
          breadcrumbs={breadcrumbs}
          subcategories={subcategoryChips}
          categoryBanner={category.banner || undefined}
          categoryDescription={category.description || undefined}
        />
      </main>
      <Footer />
    </div>
  );
}
