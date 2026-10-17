// lib/email.ts
// Email delivery with Brevo HTTP API (primary) and Nodemailer SMTP (fallback),
// provider presets, production guard, rich templates, and per-send audit logs.

import nodemailer, { Transporter } from "nodemailer";
import dns from "dns";
import { promisify } from "util";
import { db } from "@/lib/db";

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────
export interface SendOtpEmailResult {
  /** OTP string – only set in dev/no-SMTP mode for the dev banner */
  devOtp?: string;
}

export type OtpEmailPurpose = "REGISTER" | "RESET_PASSWORD" | "TEST";

// ──────────────────────────────────────────────────────────
// Provider Config
// ──────────────────────────────────────────────────────────
function resolveEmailConfig() {
  const provider = (process.env.EMAIL_PROVIDER || "custom").toLowerCase();
  const user = process.env.SMTP_USER || "";
  const pass = process.env.SMTP_PASS || "";
  const from = process.env.SMTP_FROM || "noreply@shopzen.com";
  const replyTo = process.env.SMTP_REPLY_TO || from;
  const host = process.env.SMTP_HOST || "";
  const port = Number(process.env.SMTP_PORT || 587);

  return { provider, host, port, user, pass, from, replyTo };
}

function isEmailConfigured(): boolean {
  const { pass } = resolveEmailConfig();
  // For Brevo HTTP API, we only need the SMTP_PASS (which is the API key)
  return Boolean(pass);
}

// ──────────────────────────────────────────────────────────
// Brevo HTTP API sender (no IP whitelist required!)
// ──────────────────────────────────────────────────────────
const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

async function sendViaBrevoApi(
  to: string,
  subject: string,
  html: string,
  text: string,
  from: string,
  replyTo: string,
  apiKey: string
): Promise<void> {
  const body = {
    sender: { name: "ShopZen", email: from },
    to: [{ email: to }],
    replyTo: { email: replyTo },
    subject,
    htmlContent: html,
    textContent: text,
    headers: {
      "X-Mailer": "ShopZen Transactional Mailer",
    },
  };

  const res = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      "accept": "application/json",
      "content-type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Brevo API ${res.status}: ${errBody}`);
  }

  console.log(`[EMAIL] Brevo API send successful to: ${to.substring(0, 3)}***`);
}

// ──────────────────────────────────────────────────────────
// SMTP Nodemailer fallback (for gmail, resend, custom)
// ──────────────────────────────────────────────────────────
type SmtpPreset = {
  host: string;
  port: number;
  secure: boolean;
  requireTLS?: boolean;
  fixedUser?: string;
};

const SMTP_PRESETS: Record<string, SmtpPreset> = {
  gmail:  { host: "smtp.gmail.com",       port: 587, secure: false, requireTLS: true },
  brevo:  { host: "smtp-relay.brevo.com", port: 587, secure: false },
  resend: { host: "smtp.resend.com",      port: 465, secure: true,  fixedUser: "resend" },
  custom: { host: "",                     port: 587, secure: false },
};

let _transporter: Transporter | null = null;
let _smtpVerified = false;
let _smtpError: string | null = null;

function getSmtpTransporter(): Transporter {
  if (_transporter) return _transporter;

  const cfg = resolveEmailConfig();
  const preset = SMTP_PRESETS[cfg.provider] || SMTP_PRESETS.custom;

  const host = cfg.host || preset.host;
  const port = cfg.port || preset.port;
  const secure = preset.secure ?? (port === 465);
  const user = preset.fixedUser || cfg.user;

  _transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    requireTLS: preset.requireTLS ?? false,
    auth: { user, pass: cfg.pass },
    tls: { rejectUnauthorized: process.env.NODE_ENV === "production" },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 15_000,
  });

  return _transporter;
}

async function sendViaSmtp(
  to: string,
  subject: string,
  html: string,
  text: string,
  from: string,
  replyTo: string
): Promise<void> {
  const transporter = getSmtpTransporter();
  await transporter.sendMail({
    from: `"ShopZen" <${from}>`,
    replyTo,
    to,
    subject,
    html,
    text,
    headers: {
      "X-Mailer": "ShopZen Transactional Mailer",
      Precedence: "transactional",
    },
  });
}

// ──────────────────────────────────────────────────────────
// Unified send dispatcher
// ──────────────────────────────────────────────────────────
async function dispatchEmail(
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<void> {
  const cfg = resolveEmailConfig();

  if (cfg.provider === "brevo") {
    // If the key is a Brevo API key (v3 API keys start with "xkeysib-") or explicitly provided
    const apiKey = process.env.BREVO_API_KEY || (cfg.pass.startsWith("xkeysib-") ? cfg.pass : null);
    if (apiKey) {
      await sendViaBrevoApi(to, subject, html, text, cfg.from, cfg.replyTo, apiKey);
    } else {
      // Brevo SMTP relay (for "xsmtpsib-..." credentials)
      await sendViaSmtp(to, subject, html, text, cfg.from, cfg.replyTo);
    }
  } else {
    // Use SMTP for gmail, resend, custom
    await sendViaSmtp(to, subject, html, text, cfg.from, cfg.replyTo);
  }
}

// ──────────────────────────────────────────────────────────
// SMTP verification (for non-Brevo HTTP API providers)
// ──────────────────────────────────────────────────────────
async function verifySmtp(): Promise<void> {
  const cfg = resolveEmailConfig();

  const isBrevoApi = cfg.provider === "brevo" && (Boolean(process.env.BREVO_API_KEY) || cfg.pass.startsWith("xkeysib-"));
  if (isBrevoApi) {
    _smtpVerified = true;
    _smtpError = null;
    console.log(`[EMAIL] Brevo HTTP API ready (api-key configured)`);
    return;
  }

  if (!isEmailConfigured()) {
    const reason = "SMTP credentials not set";
    _smtpError = reason;
    _smtpVerified = false;
    if (process.env.NODE_ENV !== "production") {
      console.log(`[EMAIL] SMTP NOT configured (${reason}) – dev console fallback active`);
    }
    return;
  }

  try {
    const t = getSmtpTransporter();
    await t.verify();
    _smtpVerified = true;
    _smtpError = null;
    console.log(`[EMAIL] SMTP ready (provider: ${cfg.provider}, host: ${cfg.host || "default"}:${cfg.port})`);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    _smtpVerified = false;
    _smtpError = reason;
    console.error(`[EMAIL] SMTP connection test failed: ${reason}`);
    _transporter = null;
  }
}

// Kick off verification asynchronously when this module loads (server-side only)
if (typeof window === "undefined") {
  verifySmtp().catch(() => {/* already logged */});
}

/** Expose verification status for the admin health check */
export function getSmtpStatus() {
  const cfg = resolveEmailConfig();
  return {
    provider: cfg.provider,
    host: cfg.provider === "brevo" ? "api.brevo.com (HTTP)" : cfg.host,
    port: cfg.provider === "brevo" ? 443 : cfg.port,
    configured: isEmailConfigured(),
    verified: _smtpVerified,
    error: _smtpError,
  };
}

/** Force-reset the singleton (call after .env hot-reload or config change) */
export function resetTransporter(): void {
  if (_transporter) {
    try { (_transporter as any).close?.(); } catch { /* ignore */ }
    _transporter = null;
  }
  _smtpVerified = false;
  _smtpError = null;
}

// ──────────────────────────────────────────────────────────
// Mask email for display: ab****@gmail.com
// ──────────────────────────────────────────────────────────
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}****@${domain}`;
}

// ──────────────────────────────────────────────────────────
// Disposable / fake domain blocklist
// ──────────────────────────────────────────────────────────
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "tempmail.com",
  "10minutemail.com",
  "10minutemail.net",
  "guerrillamail.com",
  "guerrillamail.net",
  "guerrillamail.org",
  "guerrillamail.biz",
  "guerrillamail.de",
  "guerrillamail.info",
  "yopmail.com",
  "throwam.com",
  "sharklasers.com",
  "guerrillamailblock.com",
  "spam4.me",
  "trashmail.com",
  "trashmail.net",
  "trashmail.me",
  "trashmail.at",
  "trashmail.io",
  "fakeinbox.com",
  "mailnull.com",
  "dispostable.com",
  "maildrop.cc",
  "spamgourmet.com",
  "mailnesia.com",
  "mintemail.com",
  "spamgourmet.net",
  "spamgourmet.org",
  "mytrashmail.com",
  "throwam.com",
  "binkmail.com",
  "safetymail.info",
  "nowmymail.com",
  "mt2009.com",
  "spamoff.de",
  "tempe-mail.com",
  "tempr.email",
  "tmpmail.net",
  "tmpmail.org",
  "discard.email",
  "mailexpire.com",
  "crazymailing.com",
  "objectmail.com",
  "otherinbox.com",
  "spamavert.com",
  "ieatspam.eu",
  "ieatspam.info",
  "spamcorner.com",
  "spamday.com",
  "spamex.com",
  "spamfree24.org",
  "spamgrap.com",
  "spamherelots.com",
  "spamhereplease.com",
  "spamhole.com",
  "spamify.com",
  "spamthis.co.uk",
  "spamtroll.net",
  "spamz.de",
]);

export function isDisposableEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  return domain ? DISPOSABLE_DOMAINS.has(domain) : false;
}

// ──────────────────────────────────────────────────────────
// MX record validation
// ──────────────────────────────────────────────────────────
const resolveMx = promisify(dns.resolveMx);

export async function hasMxRecord(email: string): Promise<boolean> {
  try {
    const domain = email.split("@")[1];
    if (!domain) return false;
    const records = await resolveMx(domain);
    return records.length > 0;
  } catch {
    return false;
  }
}

/**
 * Validate an email address is format-valid, not disposable, and has MX records.
 * Returns null if OK, or a user-facing error string.
 */
export async function validateEmailDeliverability(email: string): Promise<string | null> {
  const normalized = email.trim().toLowerCase();

  // 1. Basic format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return "Please use a valid email address.";
  }

  // 2. Disposable domain
  if (isDisposableEmail(normalized)) {
    return "Please use a valid email address (disposable email domains are not allowed).";
  }

  // 3. MX record check (skip in test environments where DNS may not be available)
  if (process.env.NODE_ENV !== "test") {
    const hasMx = await hasMxRecord(normalized);
    if (!hasMx) {
      return "Please use a valid email address (domain has no mail servers).";
    }
  }

  return null;
}

// ──────────────────────────────────────────────────────────
// HTML email template
// ──────────────────────────────────────────────────────────
function buildOtpEmailHtml(
  otp: string,
  purposeLabel: string,
  userName?: string
): string {
  const greeting = userName ? `Hi ${userName},` : "Hi there,";
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Your ShopZen Verification Code</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#2563eb,#4f46e5);padding:32px 40px;text-align:center;">
              <table cellpadding="0" cellspacing="0" style="display:inline-table;">
                <tr>
                  <td style="vertical-align:middle;padding-right:10px;">
                    <div style="width:40px;height:40px;background:rgba(255,255,255,0.2);border-radius:10px;text-align:center;line-height:40px;font-size:22px;font-weight:900;color:#fff;">S</div>
                  </td>
                  <td style="vertical-align:middle;">
                    <span style="font-size:26px;font-weight:900;color:#fff;letter-spacing:-0.5px;">Shop<span style="color:#bfdbfe;">Zen</span></span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 20px;">
              <p style="margin:0 0 8px;font-size:16px;color:#374151;font-weight:600;">${greeting}</p>
              <h2 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#111827;">${purposeLabel}</h2>
              <p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.6;">
                Use the 6-digit code below to complete your action. It expires in <strong>5 minutes</strong>.
              </p>
              <!-- OTP Box -->
              <div style="background:#eff6ff;border:2px dashed #3b82f6;border-radius:12px;padding:28px;text-align:center;margin-bottom:28px;">
                <div style="font-size:42px;font-weight:900;letter-spacing:14px;color:#1d4ed8;font-family:'Courier New',monospace;line-height:1;">${otp}</div>
                <p style="margin:12px 0 0;font-size:12px;color:#6b7280;">This code expires in 5 minutes</p>
              </div>
              <!-- Security note -->
              <div style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:16px;margin-bottom:20px;">
                <p style="margin:0;font-size:13px;color:#92400e;line-height:1.6;">
                  🔒 <strong>Never share this code with anyone</strong> — ShopZen staff will never ask for your OTP.<br/>
                  If you did not request this, you can safely ignore this email.
                </p>
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                © ${year} ShopZen. All rights reserved.<br/>
                This is a transactional message — no marketing content.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildOtpEmailText(
  otp: string,
  purposeLabel: string,
  userName?: string
): string {
  const greeting = userName ? `Hi ${userName},` : "Hi there,";
  const year = new Date().getFullYear();

  return `${greeting}

${purposeLabel}

Your ShopZen verification code: ${otp}

This code expires in 5 minutes.

NEVER share this code with anyone — ShopZen staff will never ask for your OTP.
If you did not request this, you can safely ignore this email.

© ${year} ShopZen. This is a transactional message.`;
}

// ──────────────────────────────────────────────────────────
// Audit log helper
// ──────────────────────────────────────────────────────────
async function logEmailSend(
  toEmailMasked: string,
  purpose: string,
  status: "SUCCESS" | "FAILED",
  provider: string,
  error?: string
): Promise<void> {
  try {
    await db.emailLog.create({
      data: {
        toEmail: toEmailMasked,
        purpose,
        status,
        provider,
        error: error ?? null,
      },
    });
  } catch (err) {
    // Never let logging failures surface to the user
    console.warn("[EMAIL_LOG] Failed to write email log:", err);
  }
}

// ──────────────────────────────────────────────────────────
// Main send function
// ──────────────────────────────────────────────────────────
export async function sendOtpEmail(
  email: string,
  otp: string,
  purpose: OtpEmailPurpose,
  userName?: string
): Promise<SendOtpEmailResult> {
  const normalizedEmail = email.trim().toLowerCase();
  const maskedEmail = maskEmail(normalizedEmail);
  const isDev = process.env.NODE_ENV !== "production";

  const purposeLabel =
    purpose === "REGISTER"
      ? "Verify your ShopZen account"
      : purpose === "RESET_PASSWORD"
      ? "Reset your ShopZen password"
      : "ShopZen email test";

  const cfg = resolveEmailConfig();

  // ── Production guard ───────────────────────────────────
  if (!isDev && !isEmailConfigured()) {
    const reason = "Email credentials not set";
    console.error(`[EMAIL] Refusing to send in production: ${reason}`);
    await logEmailSend(maskedEmail, purpose, "FAILED", cfg.provider, reason);
    throw new Error("EMAIL_SERVICE_UNAVAILABLE");
  }

  // ── Dev console fallback (not configured) ──────────────
  if (!isEmailConfigured()) {
    // Only in dev – production already blocked above
    console.log(`\n[DEV EMAIL OTP] ${normalizedEmail}: ${otp}`);
    console.log(`[DEV EMAIL] Purpose: ${purpose} | Expires: 5 min\n`);
    await logEmailSend(maskedEmail, purpose, "SUCCESS", "dev");
    return { devOtp: otp };
  }

  // ── Real email send ────────────────────────────────────
  const subject = `Your ShopZen verification code: ${otp}`;
  const html = buildOtpEmailHtml(otp, purposeLabel, userName);
  const text = buildOtpEmailText(otp, purposeLabel, userName);

  try {
    await dispatchEmail(normalizedEmail, subject, html, text);
    console.log(`[EMAIL] OTP sent to ${maskedEmail} via ${cfg.provider}`);
    await logEmailSend(maskedEmail, purpose, "SUCCESS", cfg.provider);
    return {};
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.error(`[EMAIL] ${cfg.provider} send failed:`, err);
    await logEmailSend(maskedEmail, purpose, "FAILED", cfg.provider, reason);
    if (isDev) {
      console.warn(`\n⚠️  [DEV EMAIL WARNING] Real email sending failed via ${cfg.provider}: ${reason}`);
      console.warn(`👉 [DEV OTP FALLBACK] ${normalizedEmail}: ${otp}`);
      console.warn(`ℹ️  Falling back to Dev OTP on screen so your development is not blocked.\n`);
      return { devOtp: otp };
    }
    // Re-throw a clean sentinel so the API layer can turn it into HTTP 502 or 503
    throw new Error("EMAIL_SEND_FAILED");
  }
}

/**
 * Send a test email to the given address (admin health check).
 * Returns { success, error? }
 */
export async function sendTestEmail(
  toEmail: string
): Promise<{ success: boolean; error?: string }> {
  const maskedEmail = maskEmail(toEmail.trim().toLowerCase());
  const cfg = resolveEmailConfig();

  if (!isEmailConfigured()) {
    await logEmailSend(maskedEmail, "TEST", "FAILED", cfg.provider, "Email not configured");
    return { success: false, error: "Email is not configured." };
  }

  try {
    const subject = "ShopZen Email Test — Email service is working ✓";
    const text = `This is a test email sent from ShopZen.\n\nEmail provider: ${cfg.provider}\n\nIf you received this, your email configuration is correct.`;
    const html = `<p>This is a test email from <strong>ShopZen</strong>.</p><p>Provider: <code>${cfg.provider}</code></p><p>Your email configuration is working correctly ✓</p>`;

    await dispatchEmail(toEmail.trim().toLowerCase(), subject, html, text);

    await logEmailSend(maskedEmail, "TEST", "SUCCESS", cfg.provider);
    return { success: true };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    await logEmailSend(maskedEmail, "TEST", "FAILED", cfg.provider, reason);
    return { success: false, error: reason };
  }
}

// ──────────────────────────────────────────────────────────
// Cashfree Payment Notifications
// ──────────────────────────────────────────────────────────

export async function sendPaymentProofSubmittedEmail(
  toEmail: string,
  orderNumber: string,
  amount: number,
  utr: string,
  customerName?: string
): Promise<void> {
  const normalized = toEmail.trim().toLowerCase();
  const masked = maskEmail(normalized);
  const cfg = resolveEmailConfig();
  const greeting = customerName ? `Hi ${customerName},` : "Hi there,";

  const subject = `Payment verification in progress for Order #${orderNumber}`;
  const text = `${greeting}\n\nWe have received your payment proof for Order #${orderNumber}.\nAmount: ₹${amount.toLocaleString("en-IN")}\nUTR / Transaction ID: ${utr}\n\nOur team is verifying your payment with our bank. You will receive an email once it is confirmed.\n\nThank you for shopping with ShopZen!`;
  const html = `
    <div style="font-family:'Segoe UI',sans-serif;max-width:540px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:16px;">
      <h2 style="color:#2563eb;margin-bottom:8px;">ShopZen Payment Verification</h2>
      <p style="color:#374151;">${greeting}</p>
      <p style="color:#374151;line-height:1.5;">We have received your payment proof for <strong>Order #${orderNumber}</strong>.</p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;margin:20px 0;">
        <p style="margin:4px 0;font-size:14px;color:#166534;"><strong>Amount Paid:</strong> ₹${amount.toLocaleString("en-IN")}</p>
        <p style="margin:4px 0;font-size:14px;color:#166534;"><strong>Transaction ID / UTR:</strong> ${utr}</p>
        <p style="margin:4px 0;font-size:14px;color:#166534;"><strong>Status:</strong> Payment Verification Pending</p>
      </div>
      <p style="color:#6b7280;font-size:13px;line-height:1.5;">Our team is reviewing your transaction. You will receive a confirmation email as soon as your payment is approved.</p>
      <p style="color:#9ca3af;font-size:12px;margin-top:24px;border-top:1px solid #e5e7eb;padding-top:16px;">ShopZen Transactional Notifications</p>
    </div>
  `;

  try {
    if (isEmailConfigured()) {
      await dispatchEmail(normalized, subject, html, text);
      await logEmailSend(masked, "PAYMENT_PROOF_SUBMITTED", "SUCCESS", cfg.provider);
      console.log(`[EMAIL] Payment proof submitted email sent to ${masked}`);
    } else {
      console.log(`[DEV EMAIL] Payment proof submitted for order ${orderNumber} to ${masked}`);
      await logEmailSend(masked, "PAYMENT_PROOF_SUBMITTED", "SUCCESS", "dev");
    }
  } catch (err: any) {
    console.error(`[EMAIL] Failed to send payment proof email:`, err?.message || err);
    await logEmailSend(masked, "PAYMENT_PROOF_SUBMITTED", "FAILED", cfg.provider, err?.message || String(err));
  }
}

export async function sendAdminPaymentProofAlert(
  orderNumber: string,
  amount: number,
  utr: string,
  customerName?: string
): Promise<void> {
  const adminEmail = process.env.SMTP_USER || "admin@shopzen.com";
  const normalized = adminEmail.trim().toLowerCase();
  const masked = maskEmail(normalized);
  const cfg = resolveEmailConfig();

  const subject = `[Action Required] New Payment Proof Submitted: Order #${orderNumber}`;
  const text = `Admin Alert:\n\nA customer has submitted payment proof for Order #${orderNumber}.\nCustomer: ${customerName || "Customer"}\nAmount: ₹${amount.toLocaleString("en-IN")}\nUTR: ${utr}\n\nPlease visit /admin/payments to verify and approve or reject.`;
  const html = `
    <div style="font-family:'Segoe UI',sans-serif;max-width:540px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:16px;">
      <h2 style="color:#ea580c;margin-bottom:8px;">New Payment Verification Needed</h2>
      <p style="color:#374151;">A customer has submitted Cashfree payment proof.</p>
      <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:16px;margin:16px 0;">
        <p style="margin:4px 0;"><strong>Order:</strong> #${orderNumber}</p>
        <p style="margin:4px 0;"><strong>Customer:</strong> ${customerName || "Customer"}</p>
        <p style="margin:4px 0;"><strong>Amount Paid:</strong> ₹${amount.toLocaleString("en-IN")}</p>
        <p style="margin:4px 0;"><strong>UTR / Txn ID:</strong> ${utr}</p>
      </div>
      <p style="color:#374151;">Log into the <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/admin/payments" style="color:#2563eb;font-weight:bold;">Admin Payments Console</a> to approve or reject.</p>
    </div>
  `;

  try {
    if (isEmailConfigured()) {
      await dispatchEmail(normalized, subject, html, text);
      await logEmailSend(masked, "ADMIN_PAYMENT_PROOF_ALERT", "SUCCESS", cfg.provider);
    } else {
      console.log(`[DEV EMAIL] Admin alert: New proof submitted for order ${orderNumber} (UTR: ${utr})`);
    }
  } catch (err: any) {
    console.error(`[EMAIL] Failed to send admin payment alert:`, err?.message || err);
  }
}

export async function sendPaymentConfirmedEmail(
  toEmail: string,
  orderNumber: string,
  amount: number,
  customerName?: string,
  savings?: number
): Promise<void> {
  const normalized = toEmail.trim().toLowerCase();
  const masked = maskEmail(normalized);
  const cfg = resolveEmailConfig();
  const greeting = customerName ? `Hi ${customerName},` : "Hi there,";

  const subject = `Payment Confirmed! Your Order #${orderNumber} is being processed`;
  const savingsText = savings && savings > 0 ? `\n\n🎉 You saved ₹${savings.toLocaleString("en-IN")} with Durga Puja Maha Sale!` : "";
  const text = `${greeting}\n\nGreat news! Your payment of ₹${amount.toLocaleString("en-IN")} for Order #${orderNumber} has been verified and confirmed.${savingsText}\nYour order is now being packed and prepared for delivery.\n\nThank you for choosing ShopZen!`;
  const html = `
    <div style="font-family:'Segoe UI',sans-serif;max-width:540px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:16px;">
      <h2 style="color:#16a34a;margin-bottom:8px;">✓ Payment Confirmed</h2>
      <p style="color:#374151;">${greeting}</p>
      <p style="color:#374151;line-height:1.5;">Your payment of <strong>₹${amount.toLocaleString("en-IN")}</strong> for <strong>Order #${orderNumber}</strong> has been successfully verified.</p>
      ${
        savings && savings > 0
          ? `<div style="background:linear-gradient(to right, #fef2f2, #fff7ed);border:1px solid #fecaca;border-radius:12px;padding:12px;margin:16px 0;text-align:center;color:#991b1b;font-weight:bold;font-size:13px;">
              🎉 You saved ₹${savings.toLocaleString("en-IN")} with Durga Puja Maha Sale!
            </div>`
          : ""
      }
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;margin:20px 0;">
        <p style="margin:4px 0;font-size:14px;color:#166534;"><strong>Order Status:</strong> PAID</p>
        <p style="margin:4px 0;font-size:14px;color:#166534;"><strong>Estimated Delivery:</strong> 3-4 Business Days</p>
      </div>
      <p style="color:#374151;font-size:14px;">You can track your order status anytime on your <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/orders" style="color:#2563eb;font-weight:bold;">My Orders</a> page.</p>
      <p style="color:#9ca3af;font-size:12px;margin-top:24px;border-top:1px solid #e5e7eb;padding-top:16px;">ShopZen Transactional Notifications</p>
    </div>
  `;

  try {
    if (isEmailConfigured()) {
      await dispatchEmail(normalized, subject, html, text);
      await logEmailSend(masked, "PAYMENT_CONFIRMED", "SUCCESS", cfg.provider);
      console.log(`[EMAIL] Payment confirmed email sent to ${masked}`);
    } else {
      console.log(`[DEV EMAIL] Payment confirmed for order ${orderNumber} to ${masked}`);
      await logEmailSend(masked, "PAYMENT_CONFIRMED", "SUCCESS", "dev");
    }
  } catch (err: any) {
    console.error(`[EMAIL] Failed to send payment confirmation email:`, err?.message || err);
    await logEmailSend(masked, "PAYMENT_CONFIRMED", "FAILED", cfg.provider, err?.message || String(err));
  }
}

export async function sendPaymentRejectedEmail(
  toEmail: string,
  orderNumber: string,
  amount: number,
  reason: string,
  customerName?: string
): Promise<void> {
  const normalized = toEmail.trim().toLowerCase();
  const masked = maskEmail(normalized);
  const cfg = resolveEmailConfig();
  const greeting = customerName ? `Hi ${customerName},` : "Hi there,";

  const subject = `Payment verification issue for Order #${orderNumber}`;
  const text = `${greeting}\n\nWe were unable to verify your payment for Order #${orderNumber}.\nReason: ${reason}\n\nYou can re-enter your UTR or submit updated proof by visiting your order page.\nIf you have already paid, please ensure the transaction reference matches your bank receipt.\n\nShopZen Support`;
  const html = `
    <div style="font-family:'Segoe UI',sans-serif;max-width:540px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:16px;">
      <h2 style="color:#dc2626;margin-bottom:8px;">Payment Verification Notice</h2>
      <p style="color:#374151;">${greeting}</p>
      <p style="color:#374151;line-height:1.5;">We were unable to verify your payment for <strong>Order #${orderNumber}</strong>.</p>
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px;margin:20px 0;">
        <p style="margin:4px 0;font-size:14px;color:#991b1b;"><strong>Reason:</strong> ${reason}</p>
      </div>
      <p style="color:#374151;font-size:14px;line-height:1.5;">Please visit <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/orders" style="color:#2563eb;font-weight:bold;">My Orders</a> to check your details and resubmit your payment reference or receipt.</p>
      <p style="color:#9ca3af;font-size:12px;margin-top:24px;border-top:1px solid #e5e7eb;padding-top:16px;">ShopZen Support</p>
    </div>
  `;

  try {
    if (isEmailConfigured()) {
      await dispatchEmail(normalized, subject, html, text);
      await logEmailSend(masked, "PAYMENT_REJECTED", "SUCCESS", cfg.provider);
      console.log(`[EMAIL] Payment rejected email sent to ${masked}`);
    } else {
      console.log(`[DEV EMAIL] Payment rejected for order ${orderNumber} to ${masked} (Reason: ${reason})`);
      await logEmailSend(masked, "PAYMENT_REJECTED", "SUCCESS", "dev");
    }
  } catch (err: any) {
    console.error(`[EMAIL] Failed to send payment rejection email:`, err?.message || err);
    await logEmailSend(masked, "PAYMENT_REJECTED", "FAILED", cfg.provider, err?.message || String(err));
  }
}

