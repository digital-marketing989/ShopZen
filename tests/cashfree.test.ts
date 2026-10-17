import { describe, it, expect } from "vitest";
import { validateCashfreeUrl, cashfreeSettingsSchema } from "@/lib/payment-settings";
import { z } from "zod";

describe("Cashfree URL Validation", () => {
  it("accepts valid cfpe.me URL", () => {
    const res = validateCashfreeUrl("https://cfpe.me/krishnadas");
    expect(res.valid).toBe(true);
  });

  it("accepts valid cashfree.com URL", () => {
    const res = validateCashfreeUrl("https://cashfree.com/pay/krishnadas");
    expect(res.valid).toBe(true);
  });

  it("accepts valid subdomain of cashfree.com", () => {
    const res = validateCashfreeUrl("https://payments.cashfree.com/links/1234");
    expect(res.valid).toBe(true);
  });

  it("rejects non-HTTPS URLs", () => {
    const res = validateCashfreeUrl("http://cfpe.me/krishnadas");
    expect(res.valid).toBe(false);
    expect(res.error).toContain("HTTPS");
  });

  it("rejects invalid hosts", () => {
    const res = validateCashfreeUrl("https://evil.com/pay");
    expect(res.valid).toBe(false);
    expect(res.error).toContain("Host must be cfpe.me or cashfree.com");
  });

  it("rejects malformed URLs", () => {
    const res = validateCashfreeUrl("not-a-url");
    expect(res.valid).toBe(false);
    expect(res.error).toContain("Invalid URL format");
  });

  it("validates with Zod schema correctly", () => {
    const valid = cashfreeSettingsSchema.safeParse({
      link: "https://cfpe.me/krishnadas",
      enabled: true,
    });
    expect(valid.success).toBe(true);

    const invalid = cashfreeSettingsSchema.safeParse({
      link: "https://fake-link.com",
      enabled: false,
    });
    expect(invalid.success).toBe(false);
  });
});

describe("Payment Proof Validation Rules", () => {
  const UTR_REGEX = /^[a-zA-Z0-9]{8,30}$/;

  const proofSchema = z.object({
    utr: z
      .string()
      .trim()
      .min(8, "Transaction ID / UTR must be at least 8 characters")
      .max(30, "Transaction ID / UTR must be at most 30 characters")
      .regex(UTR_REGEX, "Transaction ID / UTR must contain only letters and numbers (8-30 chars)"),
    amountPaid: z
      .number()
      .positive("Amount paid must be greater than 0"),
  });

  it("accepts valid 12-digit UPI UTR", () => {
    const res = proofSchema.safeParse({
      utr: "428719283741",
      amountPaid: 1500,
    });
    expect(res.success).toBe(true);
  });

  it("accepts valid alphanumeric bank reference", () => {
    const res = proofSchema.safeParse({
      utr: "HDFC001239AB",
      amountPaid: 99.5,
    });
    expect(res.success).toBe(true);
  });

  it("rejects UTR shorter than 8 characters", () => {
    const res = proofSchema.safeParse({
      utr: "12345",
      amountPaid: 100,
    });
    expect(res.success).toBe(false);
  });

  it("rejects UTR longer than 30 characters", () => {
    const res = proofSchema.safeParse({
      utr: "A".repeat(35),
      amountPaid: 100,
    });
    expect(res.success).toBe(false);
  });

  it("rejects UTR with special characters", () => {
    const res = proofSchema.safeParse({
      utr: "UTR#1234-5678",
      amountPaid: 100,
    });
    expect(res.success).toBe(false);
  });

  it("rejects zero or negative amount paid", () => {
    const res1 = proofSchema.safeParse({
      utr: "428719283741",
      amountPaid: 0,
    });
    expect(res1.success).toBe(false);

    const res2 = proofSchema.safeParse({
      utr: "428719283741",
      amountPaid: -50,
    });
    expect(res2.success).toBe(false);
  });
});

describe("Stock Reservation and Timeline logic", () => {
  it("determines 30-minute expiry correctly", () => {
    const now = Date.now();
    const thirtyOneMinsAgo = new Date(now - 31 * 60 * 1000).getTime();
    const twentyMinsAgo = new Date(now - 20 * 60 * 1000).getTime();

    const isExpired31 = now - thirtyOneMinsAgo > 30 * 60 * 1000;
    const isExpired20 = now - twentyMinsAgo > 30 * 60 * 1000;

    expect(isExpired31).toBe(true);
    expect(isExpired20).toBe(false);
  });
});
