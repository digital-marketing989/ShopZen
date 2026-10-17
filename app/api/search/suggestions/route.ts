import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";

    if (!q || q.length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    const [products, categories, brands] = await Promise.all([
      db.product.findMany({
        where: {
          title: { contains: q },
          status: "PUBLISHED",
        },
        select: {
          id: true,
          title: true,
          slug: true,
          price: true,
          mrp: true,
          images: { take: 1, select: { url: true } },
        },
        take: 6,
      }),
      db.category.findMany({
        where: {
          name: { contains: q },
        },
        select: {
          id: true,
          name: true,
          slug: true,
        },
        take: 3,
      }),
      db.brand.findMany({
        where: {
          name: { contains: q },
        },
        select: {
          id: true,
          name: true,
          slug: true,
        },
        take: 2,
      }),
    ]);

    const suggestions = [
      ...products.map((p) => ({
        type: "product",
        id: p.id,
        title: p.title,
        slug: p.slug,
        price: p.price,
        image: p.images[0]?.url,
        url: `/product/${p.slug}`,
      })),
      ...categories.map((c) => ({
        type: "category",
        id: c.id,
        title: `in ${c.name}`,
        slug: c.slug,
        url: `/category/${c.slug}`,
      })),
      ...brands.map((b) => ({
        type: "brand",
        id: b.id,
        title: `${b.name} (Brand)`,
        slug: b.slug,
        url: `/search?brand=${encodeURIComponent(b.slug)}`,
      })),
    ];

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Search suggestions error:", error);
    return NextResponse.json({ suggestions: [] });
  }
}
