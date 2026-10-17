import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const addresses = await db.address.findMany({
      where: { userId: session.user.id },
      orderBy: { isDefault: "desc" },
    });

    return NextResponse.json({ success: true, data: addresses });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch addresses" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    if (body.isDefault) {
      await db.address.updateMany({
        where: { userId: session.user.id },
        data: { isDefault: false },
      });
    }

    const address = await db.address.create({
      data: {
        userId: session.user.id!,
        name: body.name || session.user.name || "Customer",
        phone: body.phone,
        line1: body.line1,
        line2: body.line2 || "",
        city: body.city,
        state: body.state,
        pincode: body.pincode,
        country: body.country || "India",
        type: body.type || "HOME",
        isDefault: Boolean(body.isDefault),
      },
    });

    return NextResponse.json({ success: true, data: address }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save address" }, { status: 500 });
  }
}
