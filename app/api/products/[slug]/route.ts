import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getActiveSaleCampaign, getEffectivePrice } from "@/lib/pricing/sale";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const product = await db.product.findFirst({
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
            user: {
              select: { name: true, image: true },
            },
          },
        },
        reviews: {
          where: { isApproved: true },
          include: {
            user: {
              select: { id: true, name: true, image: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Also get similar products from same category
    const similarProducts = await db.product.findMany({
      where: {
        categoryId: product.categoryId,
        id: { not: product.id },
        status: "PUBLISHED",
      },
      include: {
        images: { take: 1 },
        category: true,
      },
      take: 6,
    });

    const now = new Date();
    const { campaign, blockSaleBelowCost } = await getActiveSaleCampaign(now);
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

    const mappedSimilar = similarProducts.map((p) => {
      const pEff = getEffectivePrice(p, null, now, campaign, blockSaleBelowCost);
      return {
        ...p,
        price: pEff.price,
        mrp: pEff.mrp,
        discountPct: pEff.discount,
        isSaleActive: pEff.isSaleActive,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        ...product,
        price: eff.price,
        mrp: eff.mrp,
        discountPct: eff.discount,
        isSaleActive: eff.isSaleActive,
        savings: eff.savings,
        campaignName: eff.campaignName,
        variants,
        similarProducts: mappedSimilar,
      },
    });
  } catch (error) {
    console.error("Product detail error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch product details" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    const body = await req.json();

    const product = await db.product.findFirst({
      where: { OR: [{ slug }, { id: slug }] },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const updated = await db.product.update({
      where: { id: product.id },
      data: {
        title: body.title !== undefined ? body.title : undefined,
        description: body.description !== undefined ? body.description : undefined,
        price: body.price !== undefined ? Number(body.price) : undefined,
        mrp: body.mrp !== undefined ? Number(body.mrp) : undefined,
        totalStock: body.totalStock !== undefined ? Number(body.totalStock) : undefined,
        status: body.status !== undefined ? body.status : undefined,
        isFeatured: body.isFeatured !== undefined ? Boolean(body.isFeatured) : undefined,
        isFlashSale: body.isFlashSale !== undefined ? Boolean(body.isFlashSale) : undefined,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    const product = await db.product.findFirst({
      where: { OR: [{ slug }, { id: slug }] },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    await db.product.delete({
      where: { id: product.id },
    });

    return NextResponse.json({ success: true, message: "Product deleted" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
