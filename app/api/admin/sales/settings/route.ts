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
    const { blockSaleBelowCost } = body;
    const valueStr = blockSaleBelowCost ? "true" : "false";

    await db.$transaction([
      db.setting.upsert({
        where: { key: "BLOCK_SALE_BELOW_COST" },
        update: { value: valueStr, category: "SALES" },
        create: { key: "BLOCK_SALE_BELOW_COST", value: valueStr, category: "SALES" },
      }),
      db.saleCampaign.updateMany({
        data: { blockSaleBelowCost: Boolean(blockSaleBelowCost) },
      }),
      db.auditLog.create({
        data: {
          userId: session.user.id,
          action: "TOGGLE_BLOCK_SALE_BELOW_COST",
          resource: "Setting",
          details: JSON.stringify({ blockSaleBelowCost: Boolean(blockSaleBelowCost) }),
        },
      }),
    ]);

    return NextResponse.json({ success: true, blockSaleBelowCost: Boolean(blockSaleBelowCost) });
  } catch (error: any) {
    console.error("Sale setting update error:", error);
    return NextResponse.json({ error: error.message || "Failed to update sale setting" }, { status: 500 });
  }
}
