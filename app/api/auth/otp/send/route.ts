// app/api/auth/otp/send/route.ts
// Send a fresh OTP to an email address (for resend and forgot-password).

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { checkOtpSendRateLimit, createOtpToken, OtpPurpose } from "@/lib/otp";
import {
  sendOtpEmail,
  maskEmail,
  validateEmailDeliverability,
} from "@/lib/email";
import { handleApiError, apiSuccess } from "@/lib/api-response";

const sendSchema = z.object({
  email: z.string().email("Invalid email address"),
  purpose: z.enum(["REGISTER", "RESET_PASSWORD"]),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = sendSchema.safeParse(body);
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

    const { email, purpose } = parsed.data;
    const normalizedEmail = email.trim().toLowerCase();

    const ipAddress =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "unknown";

    // ── 0. Validate email deliverability (format, disposable, MX) ──
    const deliveryError = await validateEmailDeliverability(normalizedEmail);
    if (deliveryError) {
      return NextResponse.json(
        {
          success: false,
          code: "INVALID_EMAIL",
          message: deliveryError,
        },
        { status: 400 }
      );
    }

    // ── 1. RESET_PASSWORD: Check account existence (generic response) ───
    if (purpose === "RESET_PASSWORD") {
      const user = await db.user.findUnique({
        where: { email: normalizedEmail },
        select: { id: true, emailVerified: true, isBlocked: true, isActive: true },
      });

      if (!user || !user.emailVerified) {
        // Generic response – do not reveal whether account exists
        if (process.env.NODE_ENV !== "production") {
          console.log(`[DEV] No verified account for: ${normalizedEmail}`);
        }
        return NextResponse.json(
          { success: true, message: "If this email exists, a code was sent.", isGeneric: true },
          { status: 200 }
        );
      }

      if (user.isBlocked || !user.isActive) {
        return NextResponse.json(
          { success: false, code: "ACCOUNT_INACTIVE", message: "Your account is not active. Please contact support." },
          { status: 403 }
        );
      }
    }

    // ── 2. REGISTER: Only allow resend for unverified emails ──────────
    if (purpose === "REGISTER") {
      const user = await db.user.findUnique({
        where: { email: normalizedEmail },
        select: { id: true, emailVerified: true },
      });

      if (user?.emailVerified) {
        return NextResponse.json(
          { success: false, code: "ALREADY_VERIFIED", message: "This email is already verified. Please sign in." },
          { status: 409 }
        );
      }
    }

    // ── 3. Check rate limit ───────────────────────────────────────────
    const rateLimit = await checkOtpSendRateLimit(
      normalizedEmail,
      purpose as OtpPurpose,
      ipAddress
    );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          code: "RATE_LIMITED",
          message: rateLimit.reason || "Too many OTP requests.",
          cooldownSecondsLeft: rateLimit.cooldownSecondsLeft || 30,
        },
        { status: 429 }
      );
    }

    // ── 4. Find user ID and name if exists ────────────────────────────
    const existingUser = await db.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, name: true },
    });

    // ── 5. Create and dispatch OTP ────────────────────────────────────
    const { otp, expiresAt } = await createOtpToken(
      normalizedEmail,
      purpose as OtpPurpose,
      existingUser?.id
    );

    let emailResult: { devOtp?: string } = {};
    try {
      emailResult = await sendOtpEmail(
        normalizedEmail,
        otp,
        purpose as OtpPurpose,
        existingUser?.name ?? undefined
      );
    } catch (emailErr) {
      const errMsg = emailErr instanceof Error ? emailErr.message : String(emailErr);

      // Clean up orphan OTP so resend cooldown isn't blocked
      await db.otpToken.updateMany({
        where: {
          email: normalizedEmail,
          purpose,
          consumedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { consumedAt: new Date() },
      });

      if (errMsg === "EMAIL_SERVICE_UNAVAILABLE") {
        return NextResponse.json(
          {
            success: false,
            code: "EMAIL_SERVICE_UNAVAILABLE",
            message: "Email service unavailable. Please try again later.",
          },
          { status: 503 }
        );
      }

      console.error("[OTP_SEND] Email send failed:", emailErr);
      return NextResponse.json(
        {
          success: false,
          code: "EMAIL_SEND_FAILED",
          message: "Email could not be sent, please check the address and try again.",
        },
        { status: 502 }
      );
    }

    return apiSuccess(
      {
        success: true,
        message: "Verification code sent.",
        maskedEmail: maskEmail(normalizedEmail),
        expiresAt,
        cooldownSeconds: 30,
      },
      200,
      emailResult.devOtp
    );
  } catch (error) {
    return handleApiError(error, "OTP_SEND");
  }
}
