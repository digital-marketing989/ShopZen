import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const flat = searchParams.get("flat") === "true";
    const slug = searchParams.get("slug");

    if (slug) {
      const category = await db.category.findUnique({
        where: { slug },
        include: {
          parent: {
            include: { parent: true },
          },
          children: {
            where: { isActive: true },
            orderBy: { sortOrder: "asc" },
            include: {
              _count: { select: { products: true } },
            },
          },
          _count: { select: { products: true } },
        },
      });

      if (!category) {
        return NextResponse.json({ success: false, error: "Category not found" }, { status: 404 });
      }

      return NextResponse.json({ success: true, data: category, category });
    }

    if (flat) {
      const categories = await db.category.findMany({
        where: { isActive: true },
        include: {
          parent: { select: { id: true, name: true, slug: true } },
          _count: { select: { products: true, children: true } },
        },
        orderBy: [{ level: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
      });
      return NextResponse.json({ success: true, categories, data: categories });
    }

    const categories = await db.category.findMany({
      where: {
        parentId: null,
        isActive: true,
      },
      include: {
        children: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
          include: {
            children: {
              where: { isActive: true },
              orderBy: { sortOrder: "asc" },
            },
            _count: {
              select: { products: true },
            },
          },
        },
        _count: {
          select: { products: true },
        },
      },
      orderBy: {
        sortOrder: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      categories,
      data: categories,
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch categories", categories: [] },
      { status: 500 }
    );
  }
}
