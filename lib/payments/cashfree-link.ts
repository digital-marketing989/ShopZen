// lib/payments/cashfree-link.ts
// Helper to safely read and validate the Cashfree payment link and payee name.
// Never throws; safely flags whether payment is available.

export interface CashfreeLinkConfig {
  link: string;
  payeeName: string;
  isValid: boolean;
  error?: string;
}

export function validateCashfreeUrl(urlStr?: string | null): { valid: boolean; error?: string } {
  if (!urlStr || typeof urlStr !== "string" || !urlStr.trim()) {
    return { valid: false, error: "Payment link is missing." };
  }

  try {
    const parsed = new URL(urlStr.trim());
    if (parsed.protocol !== "https:") {
      return { valid: false, error: "Payment link must use HTTPS protocol." };
    }
    const host = parsed.hostname.toLowerCase();
    const isAllowedHost =
      host === "cfpe.me" ||
      host === "cashfree.com" ||
      host.endsWith(".cashfree.com");

    if (!isAllowedHost) {
      return {
        valid: false,
        error: "Host must be cfpe.me or cashfree.com.",
      };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: "Invalid payment link URL format." };
  }
}

export function getCashfreeLinkConfig(): CashfreeLinkConfig {
  const link = (process.env.NEXT_PUBLIC_CASHFREE_PAYMENT_LINK || "").trim();
  const payeeName = (process.env.NEXT_PUBLIC_PAYEE_NAME || "DIGITAL MARKETING").trim();

  const validation = validateCashfreeUrl(link);
  if (!validation.valid) {
    return {
      link: "",
      payeeName,
      isValid: false,
      error: validation.error || "Payment link is invalid",
    };
  }

  return {
    link,
    payeeName,
    isValid: true,
  };
}
