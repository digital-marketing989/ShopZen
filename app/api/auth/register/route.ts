// app/api/auth/register/route.ts
// Step 1 of registration: validate, create user (emailVerified=false), and send email OTP.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { checkOtpSendRateLimit, createOtpToken } from "@/lib/otp";
import { sendOtpEmail, maskEmail, validateEmailDeliverability } from "@/lib/email";
import { handleApiError, apiSuccess } from "@/lib/api-response";

const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    phone: z
      .string()
      .regex(
        /^[6-9]\d{9}$/,
        "Enter a valid 10-digit Indian number starting with 6–9"
      )
      .optional()
      .or(z.literal("")),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          code: "VALIDATION_ERROR",
          message: parsed.error.issues[0]?.message || "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { name, email, phone, password } = parsed.data;
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

    // ── 1. Check if email already registered ──────────────────────
    const existingUser = await db.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, emailVerified: true },
    });

    if (existingUser?.emailVerified) {
      return NextResponse.json(
        {
          success: false,
          code: "EMAIL_ALREADY_REGISTERED",
          message: "This email is already registered, please sign in.",
        },
        { status: 409 }
      );
    }

    // ── 2. Check OTP rate limits ───────────────────────────────────
    const rateLimit = await checkOtpSendRateLimit(
      normalizedEmail,
      "REGISTER",
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

    const hashedPassword = await bcrypt.hash(password, 12);

    // ── 3. Create or update user as unverified ─────────────────────
    let userId: string;
    if (existingUser && !existingUser.emailVerified) {
      // Existing unverified – update details and resend OTP
      userId = existingUser.id;
      await db.user.update({
        where: { id: userId },
        data: {
          name,
          password: hashedPassword,
          phone: phone && phone.trim() !== "" ? phone.trim() : undefined,
        },
      });
    } else {
      const newUser = await db.user.create({
        data: {
          name,
          email: normalizedEmail,
          password: hashedPassword,
          phone: phone && phone.trim() !== "" ? phone.trim() : null,
          emailVerified: false,
          status: "PENDING_VERIFICATION",
          role: "CUSTOMER",
        },
        select: { id: true },
      });
      userId = newUser.id;
    }

    // ── 4. Create OTP & dispatch email ────────────────────────────
    const { otp, expiresAt } = await createOtpToken(
      normalizedEmail,
      "REGISTER",
      userId
    );

    let emailResult: { devOtp?: string } = {};
    try {
      emailResult = await sendOtpEmail(normalizedEmail, otp, "REGISTER", name);
    } catch (emailErr) {
      const errMsg = emailErr instanceof Error ? emailErr.message : String(emailErr);

      // If email service is unavailable (production, no SMTP) → 503
      if (errMsg === "EMAIL_SERVICE_UNAVAILABLE") {
        // Clean up orphan OTP
        await db.otpToken.updateMany({
          where: {
            email: normalizedEmail,
            purpose: "REGISTER",
            consumedAt: null,
            expiresAt: { gt: new Date() },
          },
          data: { consumedAt: new Date() },
        });
        return NextResponse.json(
          {
            success: false,
            code: "EMAIL_SERVICE_UNAVAILABLE",
            message: "Email service unavailable. Please try again later.",
          },
          { status: 503 }
        );
      }

      // Email send failed (SMTP configured but delivery failed) → 502
      console.error("[REGISTER] Email send failed:", emailErr);
      await db.otpToken.updateMany({
        where: {
          email: normalizedEmail,
          purpose: "REGISTER",
          consumedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { consumedAt: new Date() },
      });
      return NextResponse.json(
        {
          success: false,
          code: "EMAIL_SEND_FAILED",
          message:
            "Email could not be sent, please check the address and try again.",
        },
        { status: 502 }
      );
    }

    return apiSuccess(
      {
        success: true,
        message: "Verification code sent to your email.",
        maskedEmail: maskEmail(normalizedEmail),
        email: normalizedEmail,
        expiresAt,
      },
      201,
      emailResult.devOtp
    );
  } catch (error) {
    return handleApiError(error, "REGISTER");
  }
}
