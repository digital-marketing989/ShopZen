import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  getCashfreeSettings,
  cashfreeSettingsSchema,
} from "@/lib/payment-settings";

export async function GET(req: NextRequest) {
  void req;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as { role?: string }).role;
  if (role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden: SUPER_ADMIN only" }, { status: 403 });
  }

  const settings = await getCashfreeSettings();
  return NextResponse.json({ success: true, settings });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as { role?: string }).role;
  if (role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden: SUPER_ADMIN only" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = cashfreeSettingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.issues.map((i) => i.message).join(", "),
        },
        { status: 400 }
      );
    }

    const { link, enabled } = parsed.data;

    await db.$transaction([
      db.setting.upsert({
        where: { key: "cashfree_payment_link" },
        update: { value: link, category: "PAYMENTS" },
        create: { key: "cashfree_payment_link", value: link, category: "PAYMENTS" },
      }),
      db.setting.upsert({
        where: { key: "cashfree_enabled" },
        update: { value: enabled ? "true" : "false", category: "PAYMENTS" },
        create: { key: "cashfree_enabled", value: enabled ? "true" : "false", category: "PAYMENTS" },
      }),
      db.auditLog.create({
        data: {
          userId: session.user.id,
          action: "UPDATE_PAYMENT_SETTINGS",
          resource: "Setting",
          details: JSON.stringify({ link, enabled }),
        },
      }),
    ]);

    const updated = await getCashfreeSettings();
    return NextResponse.json({ success: true, settings: updated });
  } catch (error: any) {
    console.error("Error updating payment settings:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update payment settings" },
      { status: 500 }
    );
  }
}
