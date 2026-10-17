// lib/otp.ts
// Email-based OTP generation, hashing, verification and rate-limiting.

import crypto from "crypto";
import { db } from "@/lib/db";

// ──────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────
export const OTP_TTL_SECONDS = 5 * 60; // 5 minutes
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_SECONDS = 30;
export const OTP_MAX_SENDS_PER_EMAIL_PER_HOUR = 5;

// ──────────────────────────────────────────────────────────
// In-Memory Fallback Store (resilient against DB failures)
// ──────────────────────────────────────────────────────────
interface MemoryOtpRecord {
  codeHash: string;
  expiresAt: number;
  attempts: number;
  consumed: boolean;
  purpose: string;
}

interface MemoryRateLimit {
  timestamps: number[];
  lastSent: number;
}

const memoryOtpStore = new Map<string, MemoryOtpRecord>();
const memoryRateLimits = new Map<string, MemoryRateLimit>();

// ──────────────────────────────────────────────────────────
// OTP Generation and Hashing
// ──────────────────────────────────────────────────────────
export function generateOtp(): string {
  const num = crypto.randomInt(100000, 1000000);
  return num.toString().padStart(6, "0");
}

export function hashOtp(otp: string): string {
  const pepper = process.env.NEXTAUTH_SECRET || "shopzen-otp-pepper";
  return crypto.createHmac("sha256", pepper).update(otp).digest("hex");
}

export function verifyOtpHash(otp: string, hash: string): boolean {
  const expected = Buffer.from(hashOtp(otp));
  const actual = Buffer.from(hash);
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}

// ──────────────────────────────────────────────────────────
// Rate Limiting
// ──────────────────────────────────────────────────────────
export type OtpPurpose = "REGISTER" | "RESET_PASSWORD";

export interface OtpRateLimitResult {
  allowed: boolean;
  reason?: string;
  cooldownSecondsLeft?: number;
}

export async function checkOtpSendRateLimit(
  email: string,
  purpose: OtpPurpose,
  _ipAddress?: string
): Promise<OtpRateLimitResult> {
  const now = Date.now();
  const normalizedEmail = email.toLowerCase().trim();
  const key = `${normalizedEmail}:${purpose}`;

  // 1. In-memory cooldown check (fastest path)
  const memRecord = memoryRateLimits.get(key);
  if (memRecord) {
    const elapsed = Math.floor((now - memRecord.lastSent) / 1000);
    if (elapsed < OTP_RESEND_COOLDOWN_SECONDS) {
      return {
        allowed: false,
        reason: "Please wait before requesting a new OTP.",
        cooldownSecondsLeft: OTP_RESEND_COOLDOWN_SECONDS - elapsed,
      };
    }

    const oneHourAgo = now - 60 * 60 * 1000;
    const recentSends = memRecord.timestamps.filter((t) => t > oneHourAgo);
    if (recentSends.length >= OTP_MAX_SENDS_PER_EMAIL_PER_HOUR) {
      return {
        allowed: false,
        reason: "Too many OTP requests for this email. Please try again in an hour.",
      };
    }
  }

  // 2. Database check
  try {
    const hourAgo = new Date(now - 60 * 60 * 1000);
    const emailSendsThisHour = await db.otpToken.count({
      where: {
        email: normalizedEmail,
        purpose,
        createdAt: { gte: hourAgo },
      },
    });

    if (emailSendsThisHour >= OTP_MAX_SENDS_PER_EMAIL_PER_HOUR) {
      return {
        allowed: false,
        reason: "Too many OTP requests for this email. Please try again in an hour.",
      };
    }

    const lastOtp = await db.otpToken.findFirst({
      where: { email: normalizedEmail, purpose },
      orderBy: { createdAt: "desc" },
    });

    if (lastOtp) {
      const secondsSinceLast = Math.floor(
        (now - lastOtp.createdAt.getTime()) / 1000
      );
      if (secondsSinceLast < OTP_RESEND_COOLDOWN_SECONDS) {
        return {
          allowed: false,
          reason: "Please wait before requesting a new OTP.",
          cooldownSecondsLeft: OTP_RESEND_COOLDOWN_SECONDS - secondsSinceLast,
        };
      }
    }
  } catch (err) {
    console.warn("[OTP_RATE_LIMIT] DB unavailable, using in-memory store:", err);
  }

  return { allowed: true };
}

function recordSendInMemory(email: string, purpose: OtpPurpose) {
  const now = Date.now();
  const key = `${email.toLowerCase().trim()}:${purpose}`;
  const record = memoryRateLimits.get(key) || { timestamps: [], lastSent: 0 };
  record.lastSent = now;
  record.timestamps.push(now);
  if (record.timestamps.length > 10) record.timestamps.shift();
  memoryRateLimits.set(key, record);
}

// ──────────────────────────────────────────────────────────
// Create / Store OTP Token
// ──────────────────────────────────────────────────────────
export interface CreateOtpResult {
  otp: string;
  expiresAt: Date;
}

export async function createOtpToken(
  email: string,
  purpose: OtpPurpose,
  userId?: string
): Promise<CreateOtpResult> {
  const normalizedEmail = email.toLowerCase().trim();
  const otp = generateOtp();
  const codeHash = hashOtp(otp);
  const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000);

  // Update in-memory rate limit
  recordSendInMemory(normalizedEmail, purpose);
  memoryOtpStore.set(`${normalizedEmail}:${purpose}`, {
    codeHash,
    expiresAt: expiresAt.getTime(),
    attempts: 0,
    consumed: false,
    purpose,
  });

  try {
    // Invalidate prior active OTPs for this email+purpose
    await db.otpToken.updateMany({
      where: {
        email: normalizedEmail,
        purpose,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { consumedAt: new Date() },
    });

    await db.otpToken.create({
      data: {
        email: normalizedEmail,
        purpose,
        codeHash,
        expiresAt,
        userId: userId || null,
      },
    });
  } catch (err) {
    console.warn("[CREATE_OTP] DB write failed, stored in memory fallback:", err);
  }

  return { otp, expiresAt };
}

// ──────────────────────────────────────────────────────────
// Verify OTP Token
// ──────────────────────────────────────────────────────────
export type OtpVerifyResult =
  | { success: true; tokenId?: string }
  | { success: false; error: string; attemptsLeft?: number };

export async function verifyOtpToken(
  email: string,
  purpose: OtpPurpose,
  submittedCode: string,
  consume = true
): Promise<OtpVerifyResult> {
  const normalizedEmail = email.toLowerCase().trim();

  // Try finding token in database
  let dbToken = null;
  try {
    dbToken = await db.otpToken.findFirst({
      where: {
        email: normalizedEmail,
        purpose,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });
  } catch (err) {
    console.warn("[VERIFY_OTP] DB lookup failed, checking in-memory store:", err);
  }

  // If DB token exists
  if (dbToken) {
    if (dbToken.attempts >= OTP_MAX_ATTEMPTS) {
      return {
        success: false,
        error: "Too many incorrect attempts. Please request a new OTP.",
        attemptsLeft: 0,
      };
    }

    const isValid = verifyOtpHash(submittedCode, dbToken.codeHash);
    if (!isValid) {
      const nextAttempts = dbToken.attempts + 1;
      const attemptsLeft = Math.max(0, OTP_MAX_ATTEMPTS - nextAttempts);

      try {
        await db.otpToken.update({
          where: { id: dbToken.id },
          data: {
            attempts: nextAttempts,
            ...(attemptsLeft === 0 ? { consumedAt: new Date() } : {}),
          },
        });
      } catch (err) {
        console.warn("[VERIFY_OTP] Failed to update attempts:", err);
      }

      return {
        success: false,
        error: `Incorrect OTP. ${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} remaining.`,
        attemptsLeft,
      };
    }

    // Mark consumed if requested
    if (consume) {
      try {
        await db.otpToken.update({
          where: { id: dbToken.id },
          data: { consumedAt: new Date() },
        });
      } catch (err) {
        console.warn("[VERIFY_OTP] Failed to mark token consumed:", err);
      }
    }

    return { success: true, tokenId: dbToken.id };
  }

  // Fallback to in-memory store
  const mem = memoryOtpStore.get(`${normalizedEmail}:${purpose}`);
  if (!mem || mem.consumed || Date.now() > mem.expiresAt) {
    return {
      success: false,
      error: "OTP has expired or does not exist. Please request a new one.",
    };
  }

  if (mem.attempts >= OTP_MAX_ATTEMPTS) {
    return {
      success: false,
      error: "Too many incorrect attempts. Please request a new OTP.",
      attemptsLeft: 0,
    };
  }

  const isValid = verifyOtpHash(submittedCode, mem.codeHash);
  if (!isValid) {
    mem.attempts += 1;
    const attemptsLeft = Math.max(0, OTP_MAX_ATTEMPTS - mem.attempts);
    if (attemptsLeft === 0) mem.consumed = true;
    return {
      success: false,
      error: `Incorrect OTP. ${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} remaining.`,
      attemptsLeft,
    };
  }

  if (consume) {
    mem.consumed = true;
  }
  return { success: true };
}
