import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return null;
  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") return null;
  return session;
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { fromCategoryId, toCategoryId, productIds } = await req.json();

    if (!toCategoryId) {
      return NextResponse.json({ error: "Destination category is required" }, { status: 400 });
    }

    const targetCategory = await db.category.findUnique({ where: { id: toCategoryId } });
    if (!targetCategory) {
      return NextResponse.json({ error: "Destination category not found" }, { status: 404 });
    }

    let updatedCount = 0;

    if (productIds && Array.isArray(productIds) && productIds.length > 0) {
      const res = await db.product.updateMany({
        where: { id: { in: productIds } },
        data: { categoryId: targetCategory.id },
      });
      updatedCount = res.count;
    } else if (fromCategoryId) {
      const res = await db.product.updateMany({
        where: { categoryId: fromCategoryId },
        data: { categoryId: targetCategory.id },
      });
      updatedCount = res.count;
    } else {
      return NextResponse.json(
        { error: "Provide either fromCategoryId or productIds list" },
        { status: 400 }
      );
    }

    try {
      await db.auditLog.create({
        data: {
          userId: session.user.id,
          action: "REASSIGN_CATEGORY_PRODUCTS",
          resource: "Product",
          recordId: targetCategory.id,
          details: JSON.stringify({ fromCategoryId, toCategoryId, updatedCount }),
        },
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: `Successfully moved ${updatedCount} products to ${targetCategory.name}`,
      count: updatedCount,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to reassign products" }, { status: 500 });
  }
}
