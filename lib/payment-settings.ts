import { db } from "@/lib/db";
import { z } from "zod";

export const CASHFREE_DEFAULT_LINK =
  process.env.NEXT_PUBLIC_CASHFREE_PAYMENT_LINK || "https://cfpe.me/krishnadas";

export function validateCashfreeUrl(urlStr: string): { valid: boolean; error?: string } {
  try {
    const parsed = new URL(urlStr);
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
        error: "Host must be cfpe.me or cashfree.com (e.g. https://cfpe.me/krishnadas).",
      };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: "Invalid URL format." };
  }
}

export const cashfreeSettingsSchema = z.object({
  link: z
    .string()
    .trim()
    .url("Must be a valid URL")
    .refine((val) => validateCashfreeUrl(val).valid, {
      message: "URL must start with https:// and host must be cfpe.me or cashfree.com",
    }),
  enabled: z.boolean(),
});

export async function getCashfreeSettings(): Promise<{
  link: string;
  enabled: boolean;
  source: "DATABASE" | "ENV";
}> {
  try {
    const [linkSetting, enabledSetting] = await Promise.all([
      db.setting.findUnique({ where: { key: "cashfree_payment_link" } }),
      db.setting.findUnique({ where: { key: "cashfree_enabled" } }),
    ]);

    const enabled = enabledSetting ? enabledSetting.value === "true" : true;
    const link = linkSetting?.value?.trim() || CASHFREE_DEFAULT_LINK;
    const source = linkSetting?.value ? "DATABASE" : "ENV";

    return { link, enabled, source };
  } catch (error) {
    console.error("Error reading Cashfree settings:", error);
    return {
      link: CASHFREE_DEFAULT_LINK,
      enabled: true,
      source: "ENV",
    };
  }
}
