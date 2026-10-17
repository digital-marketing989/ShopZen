// app/api/auth/forgot-password/route.ts
// Step 1: Send password-reset OTP to email (generic response).

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { checkOtpSendRateLimit, createOtpToken } from "@/lib/otp";
import { sendOtpEmail } from "@/lib/email";
import { handleApiError } from "@/lib/api-response";

const schema = z.object({
  email: z.string().email("Invalid email address"),
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
        },
        { status: 400 }
      );
    }

    const { email } = parsed.data;
    const normalizedEmail = email.trim().toLowerCase();

    const ipAddress =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "unknown";

    // Always return a generic success so email existence is not revealed
    const genericOk = NextResponse.json(
      { success: true, message: "If this email exists, a code was sent.", isGeneric: true },
      { status: 200 }
    );

    // Check if user exists and is verified
    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, emailVerified: true, isBlocked: true, isActive: true },
    });

    if (!user || !user.emailVerified || user.isBlocked || !user.isActive) {
      if (process.env.NODE_ENV !== "production") {
        console.log(`[DEV] Forgot password: no valid account for ${normalizedEmail}`);
      }
      return genericOk;
    }

    // Rate limit check
    const rateLimit = await checkOtpSendRateLimit(normalizedEmail, "RESET_PASSWORD", ipAddress);
    if (!rateLimit.allowed) {
      // Still return generic to avoid timing side-channels
      return genericOk;
    }

    // Create OTP and send email
    const { otp } = await createOtpToken(normalizedEmail, "RESET_PASSWORD", user.id);

    try {
      const emailResult = await sendOtpEmail(normalizedEmail, otp, "RESET_PASSWORD");

      // In dev, include OTP in response for the dev banner
      if (process.env.NODE_ENV !== "production" && emailResult.devOtp) {
        return NextResponse.json(
          { success: true, message: "If this email exists, a code was sent.", isGeneric: true, devOtp: emailResult.devOtp },
          { status: 200 }
        );
      }
    } catch (emailErr) {
      console.error("[FORGOT_PASSWORD] Email send failed:", emailErr);
      // Clean up orphan OTP
      await db.otpToken.updateMany({
        where: { email: normalizedEmail, purpose: "RESET_PASSWORD", consumedAt: null, expiresAt: { gt: new Date() } },
        data: { consumedAt: new Date() },
      });
    }

    return genericOk;
  } catch (error) {
    return handleApiError(error, "FORGOT_PASSWORD");
  }
}
