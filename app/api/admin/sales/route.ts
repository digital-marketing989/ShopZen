import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getEffectivePrice } from "@/lib/pricing/sale";

// Check Admin or Super Admin auth
async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return null;
  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") return null;
  return session;
}

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [campaigns, categories, products, blockSetting] = await Promise.all([
      db.saleCampaign.findMany({
        orderBy: { createdAt: "desc" },
      }),
      db.category.findMany({
        select: { id: true, name: true, slug: true, saleDiscountOverride: true },
        orderBy: { name: "asc" },
      }),
      db.product.findMany({
        select: {
          id: true,
          title: true,
          slug: true,
          mrp: true,
          price: true,
          costPrice: true,
          saleDiscountOverride: true,
          categoryId: true,
          category: { select: { id: true, name: true, saleDiscountOverride: true } },
        },
        orderBy: { title: "asc" },
      }),
      db.setting.findUnique({
        where: { key: "BLOCK_SALE_BELOW_COST" },
      }),
    ]);

    const activeCampaign = campaigns.find((c) => c.isActive) || campaigns[0] || null;
    const isBlockBelowCost = blockSetting?.value === "true";

    // Compute preview price and margin warning for each product
    const now = new Date();
    const analyzedProducts = products.map((p) => {
      const eff = getEffectivePrice(p, null, now, activeCampaign, isBlockBelowCost);
      const belowCost = Boolean(p.costPrice && p.costPrice > 0 && eff.price < p.costPrice);

      return {
        ...p,
        effectiveSalePrice: eff.price,
        effectiveDiscount: eff.discount,
        effectiveSavings: eff.savings,
        isBelowCost: belowCost,
      };
    });

    const productsBelowCostCount = analyzedProducts.filter((p) => p.isBelowCost).length;

    return NextResponse.json({
      success: true,
      campaigns,
      activeCampaign,
      categories,
      products: analyzedProducts,
      blockSaleBelowCost: isBlockBelowCost,
      productsBelowCostCount,
    });
  } catch (error: any) {
    console.error("Admin Sales GET error:", error);
    return NextResponse.json({ error: "Failed to load sales data" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      name,
      slug,
      startsAt,
      endsAt,
      minDiscount = 85,
      maxDiscount = 95,
      isActive = true,
      stackWithCoupons = false,
      showBanner = true,
      bannerText,
      blockSaleBelowCost = false,
    } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: "Campaign name and slug are required" }, { status: 400 });
    }

    const campaign = await db.saleCampaign.create({
      data: {
        name,
        slug: slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, "-"),
        startsAt: new Date(startsAt || Date.now()),
        endsAt: new Date(endsAt),
        minDiscount: Number(minDiscount),
        maxDiscount: Number(maxDiscount),
        isActive: Boolean(isActive),
        stackWithCoupons: Boolean(stackWithCoupons),
        showBanner: Boolean(showBanner),
        bannerText: bannerText || "Durga Puja Maha Sale: Up to 95% OFF on everything",
        blockSaleBelowCost: Boolean(blockSaleBelowCost),
      },
    });

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE_SALE_CAMPAIGN",
        resource: "SaleCampaign",
        recordId: campaign.id,
        details: JSON.stringify(campaign),
      },
    });

    return NextResponse.json({ success: true, campaign }, { status: 201 });
  } catch (error: any) {
    console.error("Admin Sales POST error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create campaign" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Campaign ID is required" }, { status: 400 });
    }

    const dataToUpdate: any = {};
    if (updates.name !== undefined) dataToUpdate.name = updates.name;
    if (updates.slug !== undefined) dataToUpdate.slug = updates.slug;
    if (updates.startsAt !== undefined) dataToUpdate.startsAt = new Date(updates.startsAt);
    if (updates.endsAt !== undefined) dataToUpdate.endsAt = new Date(updates.endsAt);
    if (updates.minDiscount !== undefined) dataToUpdate.minDiscount = Number(updates.minDiscount);
    if (updates.maxDiscount !== undefined) dataToUpdate.maxDiscount = Number(updates.maxDiscount);
    if (updates.isActive !== undefined) dataToUpdate.isActive = Boolean(updates.isActive);
    if (updates.stackWithCoupons !== undefined) dataToUpdate.stackWithCoupons = Boolean(updates.stackWithCoupons);
    if (updates.showBanner !== undefined) dataToUpdate.showBanner = Boolean(updates.showBanner);
    if (updates.bannerText !== undefined) dataToUpdate.bannerText = updates.bannerText;
    if (updates.blockSaleBelowCost !== undefined) dataToUpdate.blockSaleBelowCost = Boolean(updates.blockSaleBelowCost);

    const updated = await db.saleCampaign.update({
      where: { id },
      data: dataToUpdate,
    });

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE_SALE_CAMPAIGN",
        resource: "SaleCampaign",
        recordId: updated.id,
        details: JSON.stringify(dataToUpdate),
      },
    });

    return NextResponse.json({ success: true, campaign: updated });
  } catch (error: any) {
    console.error("Admin Sales PUT error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update campaign" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Campaign ID is required" }, { status: 400 });
    }

    const campaign = await db.saleCampaign.delete({
      where: { id },
    });

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "DELETE_SALE_CAMPAIGN",
        resource: "SaleCampaign",
        recordId: id,
        details: JSON.stringify(campaign),
      },
    });

    return NextResponse.json({ success: true, message: "Campaign deleted" });
  } catch (error: any) {
    console.error("Admin Sales DELETE error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete campaign" },
      { status: 500 }
    );
  }
}
