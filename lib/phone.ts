// lib/phone.ts
// Pure utility for Indian phone number normalization and formatting.
// Zero node-specific dependencies (safe for Edge runtime and client).

/**
 * Normalizes an Indian mobile number to +91XXXXXXXXXX format.
 * Accepts:
 *   - "7894606608" (10 digits, starting with 6-9)
 *   - "+917894606608"
 *   - "917894606608" (12 digits)
 *   - "07894606608" (11 digits with leading 0)
 *   - "0917894606608" (13 digits)
 * Returns formatted +91XXXXXXXXXX or null if invalid.
 */
export function normalizeIndianPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");

  // 10 digits starting with 6-9
  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    return `+91${digits}`;
  }

  // 11 digits: 0XXXXXXXXXX (leading 0 before 10-digit mobile)
  if (digits.length === 11 && digits.startsWith("0") && /^[6-9]/.test(digits.slice(1))) {
    return `+91${digits.slice(1)}`;
  }

  // 12 digits: 91XXXXXXXXXX (country code 91)
  if (digits.length === 12 && digits.startsWith("91") && /^[6-9]/.test(digits.slice(2))) {
    return `+${digits}`;
  }

  // 13 digits: 091XXXXXXXXXX
  if (digits.length === 13 && digits.startsWith("091") && /^[6-9]/.test(digits.slice(3))) {
    return `+91${digits.slice(3)}`;
  }

  return null;
}

/**
 * Returns masked phone for display: +91 98****3210
 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 6) return phone || "";
  const cleaned = phone.startsWith("+91") ? phone : normalizeIndianPhone(phone) || phone;
  if (cleaned.length >= 13) {
    // +91XXXXXXXXXX -> +91 XX****XXXX
    return `+91 ${cleaned.slice(3, 5)}****${cleaned.slice(-4)}`;
  }
  return cleaned;
}
