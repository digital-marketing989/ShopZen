// app/api/admin/email/logs/route.ts
// SUPER_ADMIN only: return the last 20 email send logs.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSmtpStatus } from "@/lib/email";

export async function GET(req: NextRequest) {
  void req; // req not used but required by Next.js route signature

  // Auth guard
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if ((session.user as { role?: string }).role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [logs, smtpStatus] = await Promise.all([
    db.emailLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        toEmail: true,
        purpose: true,
        status: true,
        error: true,
        provider: true,
        createdAt: true,
      },
    }),
    Promise.resolve(getSmtpStatus()),
  ]);

  return NextResponse.json({ logs, smtpStatus }, { status: 200 });
}
