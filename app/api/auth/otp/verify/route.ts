// app/api/auth/otp/verify/route.ts
// Verify an email OTP and activate the user's emailVerified status (for REGISTER).

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { verifyOtpToken, OtpPurpose } from "@/lib/otp";
import { handleApiError, apiSuccess } from "@/lib/api-response";

const verifySchema = z.object({
  email: z.string().email("Invalid email address"),
  code: z.string().length(6, "OTP must be exactly 6 digits"),
  purpose: z.enum(["REGISTER", "RESET_PASSWORD"]),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = verifySchema.safeParse(body);
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

    const { email, code, purpose } = parsed.data;
    const normalizedEmail = email.trim().toLowerCase();

    // For RESET_PASSWORD we do NOT consume here (consumed in reset-password route)
    const shouldConsume = purpose !== "RESET_PASSWORD";
    const result = await verifyOtpToken(
      normalizedEmail,
      purpose as OtpPurpose,
      code,
      shouldConsume
    );

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

    // REGISTER: mark user emailVerified = true, status = ACTIVE
    if (purpose === "REGISTER") {
      try {
        const user = await db.user.findUnique({
          where: { email: normalizedEmail },
          select: { id: true },
        });

        if (user) {
          await db.user.update({
            where: { id: user.id },
            data: { emailVerified: true, status: "ACTIVE" },
          });
        }
      } catch (dbErr) {
        console.error("[OTP_VERIFY] Failed to update emailVerified:", dbErr);
      }

      return apiSuccess({
        success: true,
        message: "Email verified successfully. You can now sign in.",
        purpose,
      });
    }

    // RESET_PASSWORD: just confirm the OTP is valid
    return apiSuccess({
      success: true,
      message: "OTP verified.",
      purpose,
      email: normalizedEmail,
    });
  } catch (error) {
    return handleApiError(error, "OTP_VERIFY");
  }
}
