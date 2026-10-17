// app/api/admin/email/test/route.ts
// SUPER_ADMIN only: send a test email to the admin's own address and return result.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendTestEmail } from "@/lib/email";

export async function GET(req: NextRequest) {
  // Auth guard: SUPER_ADMIN only
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if ((session.user as { role?: string }).role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const adminEmail = session.user.email;
  if (!adminEmail) {
    return NextResponse.json({ error: "Admin email not available" }, { status: 400 });
  }

  const result = await sendTestEmail(adminEmail);

  if (result.success) {
    return NextResponse.json(
      {
        success: true,
        message: `Test email sent successfully to ${adminEmail}`,
      },
      { status: 200 }
    );
  } else {
    return NextResponse.json(
      {
        success: false,
        error: result.error || "Unknown error",
        message: "Test email failed. Check server logs for details.",
      },
      { status: 500 }
    );
  }
}
