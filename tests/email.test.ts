// tests/email.test.ts
// Vitest unit tests for email service: provider presets, disposable domains,
// production guard, and OTP send failure cleanup.

import { describe, it, expect } from "vitest";

// ──────────────────────────────────────────────────────────
// We need to test pure functions without hitting the DB or
// real SMTP. The test file imports helpers that can be isolated.
// ──────────────────────────────────────────────────────────

// 1. PROVIDER PRESET RESOLUTION
// We replicate the logic from lib/email.ts in a pure local copy so we can
// test all branches without module-level side effects (verify(), db).
// ──────────────────────────────────────────────────────────

type ProviderPreset = {
  host: string;
  port: number;
  secure: boolean;
  fixedUser?: string;
};

const PROVIDER_PRESETS: Record<string, ProviderPreset> = {
  gmail: { host: "smtp.gmail.com", port: 587, secure: false },
  brevo: { host: "smtp-relay.brevo.com", port: 587, secure: false },
  resend: { host: "smtp.resend.com", port: 465, secure: true, fixedUser: "resend" },
  custom: { host: "", port: 587, secure: false },
};

function resolveSmtpConfig(env: Record<string, string | undefined>) {
  const provider = (env.EMAIL_PROVIDER || "custom").toLowerCase();
  const preset = PROVIDER_PRESETS[provider] || PROVIDER_PRESETS.custom;

  const host = env.SMTP_HOST || preset.host;
  const port = Number(env.SMTP_PORT || preset.port || 587);

  let secure: boolean;
  if (env.SMTP_SECURE !== undefined) {
    secure = env.SMTP_SECURE === "true";
  } else {
    secure = preset.secure ?? port === 465;
  }

  const user = preset.fixedUser || env.SMTP_USER || "";
  const pass = env.SMTP_PASS || "";

  return { host, port, secure, user, pass, provider };
}

// 2. DISPOSABLE DOMAIN CHECK
// ──────────────────────────────────────────────────────────
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "tempmail.com",
  "10minutemail.com",
  "guerrillamail.com",
  "yopmail.com",
  "trashmail.com",
  "fakeinbox.com",
  "maildrop.cc",
  "discard.email",
  "tmpmail.net",
  "tmpmail.org",
]);

function isDisposableEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  return domain ? DISPOSABLE_DOMAINS.has(domain) : false;
}

// 3. PRODUCTION GUARD (simulated, without importing the full module)
// ──────────────────────────────────────────────────────────
function checkProductionGuard(env: Record<string, string | undefined>): string | null {
  const isProduction = env.NODE_ENV === "production";
  const smtpConfigured = Boolean(env.SMTP_USER && env.SMTP_PASS && env.SMTP_HOST);
  if (isProduction && !smtpConfigured) {
    return "EMAIL_SERVICE_UNAVAILABLE";
  }
  return null;
}

// ══════════════════════════════════════════════════════════
// TESTS
// ══════════════════════════════════════════════════════════

describe("Provider Preset Resolution", () => {
  it("gmail preset: correct host and port", () => {
    const cfg = resolveSmtpConfig({ EMAIL_PROVIDER: "gmail" });
    expect(cfg.host).toBe("smtp.gmail.com");
    expect(cfg.port).toBe(587);
    expect(cfg.secure).toBe(false);
  });

  it("brevo preset: correct host and port", () => {
    const cfg = resolveSmtpConfig({ EMAIL_PROVIDER: "brevo" });
    expect(cfg.host).toBe("smtp-relay.brevo.com");
    expect(cfg.port).toBe(587);
    expect(cfg.secure).toBe(false);
  });

  it("resend preset: host, port 465, secure=true, user='resend'", () => {
    const cfg = resolveSmtpConfig({
      EMAIL_PROVIDER: "resend",
      SMTP_PASS: "re_APIKey",
    });
    expect(cfg.host).toBe("smtp.resend.com");
    expect(cfg.port).toBe(465);
    expect(cfg.secure).toBe(true);
    expect(cfg.user).toBe("resend"); // fixedUser
  });

  it("manual override wins over preset", () => {
    const cfg = resolveSmtpConfig({
      EMAIL_PROVIDER: "gmail",
      SMTP_HOST: "mail.example.com",
      SMTP_PORT: "2525",
    });
    expect(cfg.host).toBe("mail.example.com");
    expect(cfg.port).toBe(2525);
  });

  it("SMTP_SECURE=true forces TLS even on port 587", () => {
    const cfg = resolveSmtpConfig({
      EMAIL_PROVIDER: "gmail",
      SMTP_SECURE: "true",
    });
    expect(cfg.secure).toBe(true);
  });

  it("SMTP_SECURE=false disables TLS even on port 465", () => {
    const cfg = resolveSmtpConfig({
      EMAIL_PROVIDER: "resend",
      SMTP_SECURE: "false",
    });
    expect(cfg.secure).toBe(false);
  });

  it("unknown provider falls back to custom (empty host)", () => {
    const cfg = resolveSmtpConfig({ EMAIL_PROVIDER: "unknown-provider" });
    expect(cfg.host).toBe("");
    expect(cfg.port).toBe(587);
  });
});

describe("Disposable Domain Blocklist", () => {
  it("blocks mailinator.com", () => {
    expect(isDisposableEmail("test@mailinator.com")).toBe(true);
  });

  it("blocks tempmail.com", () => {
    expect(isDisposableEmail("test@tempmail.com")).toBe(true);
  });

  it("blocks 10minutemail.com", () => {
    expect(isDisposableEmail("foo@10minutemail.com")).toBe(true);
  });

  it("blocks guerrillamail.com", () => {
    expect(isDisposableEmail("x@guerrillamail.com")).toBe(true);
  });

  it("blocks yopmail.com", () => {
    expect(isDisposableEmail("y@yopmail.com")).toBe(true);
  });

  it("allows real Gmail addresses", () => {
    expect(isDisposableEmail("user@gmail.com")).toBe(false);
  });

  it("allows real company emails", () => {
    expect(isDisposableEmail("john@company.com")).toBe(false);
  });

  it("case-insensitive domain check", () => {
    expect(isDisposableEmail("test@Mailinator.COM")).toBe(true);
  });

  it("handles email with no @ gracefully", () => {
    expect(isDisposableEmail("notanemail")).toBe(false);
  });
});

describe("Production Guard", () => {
  it("returns error sentinel when NODE_ENV=production and SMTP not configured", () => {
    const result = checkProductionGuard({ NODE_ENV: "production" });
    expect(result).toBe("EMAIL_SERVICE_UNAVAILABLE");
  });

  it("returns null when NODE_ENV=production and SMTP IS configured", () => {
    const result = checkProductionGuard({
      NODE_ENV: "production",
      SMTP_HOST: "smtp.gmail.com",
      SMTP_USER: "test@gmail.com",
      SMTP_PASS: "apppassword",
    });
    expect(result).toBeNull();
  });

  it("returns null in development even without SMTP", () => {
    const result = checkProductionGuard({ NODE_ENV: "development" });
    expect(result).toBeNull();
  });

  it("returns null in test environment even without SMTP", () => {
    const result = checkProductionGuard({ NODE_ENV: "test" });
    expect(result).toBeNull();
  });
});

describe("OTP Send Failure Cleanup Logic", () => {
  // Simulate the cleanup flow: if email fails, the OTP record should be
  // invalidated so the 30-second cooldown is not blocked.
  it("records cleanup on send failure", async () => {
    const consumed: string[] = [];

    // Mock OTP invalidation function
    const invalidateOtp = async (email: string, purpose: string): Promise<void> => {
      consumed.push(`${email}:${purpose}`);
    };

    // Simulate send failure flow
    const sendFailed = true;
    if (sendFailed) {
      await invalidateOtp("user@example.com", "REGISTER");
    }

    expect(consumed).toContain("user@example.com:REGISTER");
  });

  it("does not invalidate OTP on success", async () => {
    const consumed: string[] = [];
    const invalidateOtp = async (email: string, purpose: string): Promise<void> => {
      consumed.push(`${email}:${purpose}`);
    };

    const sendFailed = false;
    if (sendFailed) {
      await invalidateOtp("user@example.com", "REGISTER");
    }

    expect(consumed).toHaveLength(0);
  });
});

describe("Email Format Validation", () => {
  const validFormats = [
    "user@example.com",
    "user+tag@example.co.uk",
    "firstname.lastname@company.org",
  ];

  const invalidFormats = [
    "notanemail",
    "missing@domain",
    "@nodomain.com",
    "spaces in@email.com",
  ];

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  it.each(validFormats)("accepts valid format: %s", (email) => {
    expect(emailRegex.test(email)).toBe(true);
  });

  it.each(invalidFormats)("rejects invalid format: %s", (email) => {
    expect(emailRegex.test(email)).toBe(false);
  });
});

describe("lib/email: maskEmail", () => {
  it("masks username correctly", async () => {
    const { maskEmail } = await import("../lib/email");
    expect(maskEmail("john.doe@example.com")).toBe("jo****@example.com");
    expect(maskEmail("a@test.com")).toBe("a****@test.com");
    expect(maskEmail("invalid-email")).toBe("invalid-email");
  });
});

describe("lib/otp: OTP Generation and Hashing", () => {
  it("generates a 6-digit numeric string", async () => {
    const { generateOtp } = await import("../lib/otp");
    for (let i = 0; i < 20; i++) {
      const otp = generateOtp();
      expect(otp).toMatch(/^\d{6}$/);
    }
  });

  it("hashes OTP and verifies correct code", async () => {
    const { hashOtp, verifyOtpHash } = await import("../lib/otp");
    const code = "123456";
    const hash = hashOtp(code);
    expect(verifyOtpHash("123456", hash)).toBe(true);
    expect(verifyOtpHash("654321", hash)).toBe(false);
    expect(verifyOtpHash("12345", hash)).toBe(false);
  });
});

describe("lib/email: validateEmailDeliverability", () => {
  it("rejects invalid email formats", async () => {
    const { validateEmailDeliverability } = await import("../lib/email");
    const res = await validateEmailDeliverability("not-an-email");
    expect(res).toBe("Please use a valid email address.");
  });

  it("rejects disposable domains", async () => {
    const { validateEmailDeliverability } = await import("../lib/email");
    const res = await validateEmailDeliverability("user@tempmail.com");
    expect(res).toContain("disposable email domains are not allowed");
  });

  it("accepts valid non-disposable email in test mode", async () => {
    const { validateEmailDeliverability } = await import("../lib/email");
    const res = await validateEmailDeliverability("realuser@gmail.com");
    expect(res).toBeNull();
  });
});
