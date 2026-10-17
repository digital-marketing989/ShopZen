import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const role = (session.user as any).role;
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { type, id, override } = body;
    // type: "PRODUCT" | "CATEGORY" | "BULK_ALL"
    const discountVal =
      override === null || override === "" || override === undefined
        ? null
        : Math.min(99, Math.max(1, Number(override)));

    if (type === "PRODUCT") {
      if (!id) return NextResponse.json({ error: "Product ID is required" }, { status: 400 });

      const updated = await db.product.update({
        where: { id },
        data: { saleDiscountOverride: discountVal },
      });

      await db.auditLog.create({
        data: {
          userId: session.user.id,
          action: "UPDATE_PRODUCT_SALE_OVERRIDE",
          resource: "Product",
          recordId: id,
          details: JSON.stringify({ saleDiscountOverride: discountVal }),
        },
      });

      return NextResponse.json({ success: true, product: updated });
    }

    if (type === "CATEGORY") {
      if (!id) return NextResponse.json({ error: "Category ID is required" }, { status: 400 });

      const updated = await db.category.update({
        where: { id },
        data: { saleDiscountOverride: discountVal },
      });

      await db.auditLog.create({
        data: {
          userId: session.user.id,
          action: "UPDATE_CATEGORY_SALE_OVERRIDE",
          resource: "Category",
          recordId: id,
          details: JSON.stringify({ saleDiscountOverride: discountVal }),
        },
      });

      return NextResponse.json({ success: true, category: updated });
    }

    if (type === "BULK_ALL") {
      // Bulk apply override to all products
      const count = await db.product.updateMany({
        data: { saleDiscountOverride: discountVal },
      });

      await db.auditLog.create({
        data: {
          userId: session.user.id,
          action: "BULK_UPDATE_PRODUCT_SALE_OVERRIDE",
          resource: "Product",
          details: JSON.stringify({ saleDiscountOverride: discountVal, count: count.count }),
        },
      });

      return NextResponse.json({ success: true, count: count.count });
    }

    return NextResponse.json({ error: "Invalid override type" }, { status: 400 });
  } catch (error: any) {
    console.error("Sale override error:", error);
    return NextResponse.json({ error: error.message || "Failed to update override" }, { status: 500 });
  }
}
