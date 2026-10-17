import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sellers = await db.seller.findMany({
      include: {
        user: { select: { name: true, email: true, createdAt: true } },
        _count: { select: { products: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: sellers });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch sellers" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, status, commissionRate } = body;

    const seller = await db.seller.update({
      where: { id },
      data: {
        status: status || undefined,
        commissionRate: commissionRate !== undefined ? Number(commissionRate) : undefined,
      },
    });

    return NextResponse.json({ success: true, data: seller });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update seller" }, { status: 500 });
  }
}
