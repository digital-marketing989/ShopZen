import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getActiveSaleCampaign, getEffectivePrice } from "@/lib/pricing/sale";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const category = searchParams.get("category");
    const brand = searchParams.get("brand");
    const minPrice = searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : undefined;
    const maxPrice = searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : undefined;
    const rating = searchParams.get("rating") ? Number(searchParams.get("rating")) : undefined;
    const inStock = searchParams.get("inStock") === "true";
    const isFeatured = searchParams.get("featured") === "true";
    const isFlashSale = searchParams.get("flashSale") === "true";
    const sort = searchParams.get("sort") || "newest";
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || 16)));
    const skip = (page - 1) * limit;

    const where: any = {
      status: "PUBLISHED",
    };

    if (q) {
      where.OR = [
        { title: { contains: q } },
        { description: { contains: q } },
        { tags: { contains: q } },
      ];
    }

    if (category) {
      // Find category by slug or id, including child categories
      const cat = await db.category.findFirst({
        where: {
          OR: [{ slug: category }, { id: category }],
        },
        include: { children: true },
      });

      if (cat) {
        const catIds = [cat.id, ...cat.children.map((c) => c.id)];
        where.categoryId = { in: catIds };
      }
    }

    if (brand) {
      const b = await db.brand.findFirst({
        where: {
          OR: [{ slug: brand }, { id: brand }, { name: brand }],
        },
      });
      if (b) {
        where.brandId = b.id;
      }
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = minPrice;
      if (maxPrice !== undefined) where.price.lte = maxPrice;
    }

    if (rating !== undefined) {
      where.avgRating = { gte: rating };
    }

    if (inStock) {
      where.totalStock = { gt: 0 };
    }

    if (isFeatured) {
      where.isFeatured = true;
    }

    if (isFlashSale) {
      where.isFlashSale = true;
    }

    let orderBy: any = { createdAt: "desc" };
    if (sort === "price_asc") orderBy = { price: "asc" };
    else if (sort === "price_desc") orderBy = { price: "desc" };
    else if (sort === "rating") orderBy = { avgRating: "desc" };
    else if (sort === "discount") orderBy = { discountPct: "desc" };
    else if (sort === "popular") orderBy = { salesCount: "desc" };

    const [products, total] = await Promise.all([
      db.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          brand: { select: { id: true, name: true, slug: true, logo: true } },
          images: { orderBy: { sortOrder: "asc" }, take: 2 },
          seller: { select: { id: true, businessName: true, rating: true } },
        },
        orderBy,
        skip,
        take: limit,
      }),
      db.product.count({ where }),
    ]);

    const now = new Date();
    const { campaign, blockSaleBelowCost } = await getActiveSaleCampaign(now);

    const mappedProducts = products.map((p) => {
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

    return NextResponse.json({
      success: true,
      data: {
        products: mappedProducts,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Products API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (userRole !== "ADMIN" && userRole !== "SELLER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();

    // Determine sellerId
    let sellerId = body.sellerId;
    if (userRole === "SELLER") {
      const seller = await db.seller.findUnique({
        where: { userId: session.user.id },
      });
      if (!seller) {
        return NextResponse.json({ error: "Seller profile not found" }, { status: 400 });
      }
      sellerId = seller.id;
    } else if (!sellerId) {
      // For Admin, fallback to first seller
      const seller = await db.seller.findFirst();
      sellerId = seller?.id;
    }

    const slug =
      body.slug ||
      body.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "") +
        "-" +
        Date.now().toString().slice(-4);

    const discountPct =
      body.mrp && body.price && body.mrp > body.price
        ? Math.round(((body.mrp - body.price) / body.mrp) * 100)
        : 0;

    const product = await db.product.create({
      data: {
        title: body.title,
        slug,
        description: body.description || "",
        shortDescription: body.shortDescription || "",
        highlights: JSON.stringify(body.highlights || []),
        mrp: Number(body.mrp),
        price: Number(body.price),
        discount: discountPct,
        totalStock: Number(body.totalStock || 0),
        status: body.status || "PUBLISHED",
        isFeatured: Boolean(body.isFeatured),
        isFlashSale: Boolean(body.isFlashSale),
        flashSalePrice: body.flashSalePrice ? Number(body.flashSalePrice) : null,
        categoryId: body.categoryId,
        brandId: body.brandId || null,
        sellerId,
        tags: Array.isArray(body.tags) ? body.tags.join(",") : (body.tags || ""),
        images: {
          create: (body.images || []).map((img: any, idx: number) => ({
            url: typeof img === "string" ? img : img.url,
            alt: body.title,
            sortOrder: idx,
            isVideo: false,
          })),
        },
      },
      include: {
        images: true,
        category: true,
        brand: true,
      },
    });

    return NextResponse.json({ success: true, data: product }, { status: 201 });
  } catch (error: any) {
    console.error("Create product error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create product" },
      { status: 500 }
    );
  }
}
