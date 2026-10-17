// app/api/auth/reset-password/route.ts
// Step 3 of forgot-password: verify OTP and set new password.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { verifyOtpToken } from "@/lib/otp";
import { handleApiError, apiSuccess } from "@/lib/api-response";

const schema = z.object({
  email: z.string().email("Invalid email address"),
  code: z.string().length(6, "OTP must be 6 digits"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[0-9]/, "Must contain at least one number"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          code: "VALIDATION_ERROR",
          message: parsed.error.issues[0]?.message || "Invalid input",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { email, code, newPassword } = parsed.data;
    const normalizedEmail = email.trim().toLowerCase();

    // Verify and consume OTP
    const result = await verifyOtpToken(normalizedEmail, "RESET_PASSWORD", code, true);
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          code: "INVALID_OTP",
          message: result.error,
          attemptsLeft: result.attemptsLeft,
        },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, emailVerified: true },
    });

    if (!user || !user.emailVerified) {
      return NextResponse.json(
        {
          success: false,
          code: "ACCOUNT_NOT_FOUND",
          message: "No verified account found with this email.",
        },
        { status: 404 }
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await db.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    return apiSuccess({
      success: true,
      message: "Password reset successfully. Please sign in.",
    });
  } catch (error) {
    return handleApiError(error, "RESET_PASSWORD");
  }
}
