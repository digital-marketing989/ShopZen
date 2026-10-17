// lib/sms/index.ts
// Pluggable SMS provider abstraction.
// Set SMS_PROVIDER env var to "msg91" | "twilio" | "fast2sms" | "console" (default)

export interface SmsProvider {
  send(phone: string, message: string): Promise<void>;
}

// -------------------------------------------------------
// Console provider (dev fallback)
// -------------------------------------------------------
class ConsoleSmsProvider implements SmsProvider {
  async send(phone: string, message: string): Promise<void> {
    // Extract OTP from the message for a cleaner dev log
    const otpMatch = message.match(/\b(\d{6})\b/);
    const otp = otpMatch ? otpMatch[1] : "(see message)";
    console.log(`\n[DEV OTP] ${phone}: ${otp}`);
    console.log(`[DEV SMS] To: ${phone} | Message: ${message}\n`);
  }
}

// -------------------------------------------------------
// MSG91 provider
// -------------------------------------------------------
class Msg91SmsProvider implements SmsProvider {
  private authKey: string;
  private templateId: string;

  constructor() {
    this.authKey = process.env.MSG91_AUTH_KEY!;
    this.templateId = process.env.MSG91_TEMPLATE_ID!;
  }

  async send(phone: string, message: string): Promise<void> {
    const cleanPhone = phone.replace(/^\+/, ""); // MSG91 expects without +
    const otpMatch = message.match(/\b(\d{6})\b/);
    const otp = otpMatch ? otpMatch[1] : "";

    const res = await fetch("https://api.msg91.com/api/v5/otp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authkey: this.authKey,
      },
      body: JSON.stringify({
        template_id: this.templateId,
        mobile: cleanPhone,
        otp,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`MSG91 send failed: ${body}`);
    }
  }
}

// -------------------------------------------------------
// Twilio provider
// -------------------------------------------------------
class TwilioSmsProvider implements SmsProvider {
  private accountSid: string;
  private authToken: string;
  private from: string;

  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID!;
    this.authToken = process.env.TWILIO_AUTH_TOKEN!;
    this.from = process.env.TWILIO_FROM!;
  }

  async send(phone: string, message: string): Promise<void> {
    const creds = Buffer.from(`${this.accountSid}:${this.authToken}`).toString(
      "base64"
    );
    const body = new URLSearchParams({
      To: phone,
      From: this.from,
      Body: message,
    });

    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${creds}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      }
    );

    if (!res.ok) {
      const json = await res.json();
      throw new Error(`Twilio send failed: ${json.message}`);
    }
  }
}

// -------------------------------------------------------
// Fast2SMS provider
// -------------------------------------------------------
class Fast2SmsSmsProvider implements SmsProvider {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.FAST2SMS_API_KEY!;
  }

  async send(phone: string, message: string): Promise<void> {
    const cleanPhone = phone.replace(/^\+91/, "");
    const res = await fetch("https://www.fast2sms.com/dev/bulkV2", {
      method: "POST",
      headers: {
        authorization: this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        route: "v3",
        sender_id: "SHOPZN",
        message,
        language: "english",
        flash: 0,
        numbers: cleanPhone,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Fast2SMS send failed: ${body}`);
    }
  }
}

// -------------------------------------------------------
// Factory
// -------------------------------------------------------
function createSmsProvider(): SmsProvider {
  const provider = (process.env.SMS_PROVIDER || "console").toLowerCase();

  switch (provider) {
    case "msg91":
      if (!process.env.MSG91_AUTH_KEY) {
        console.warn("[SMS] MSG91_AUTH_KEY not set, falling back to console");
        return new ConsoleSmsProvider();
      }
      return new Msg91SmsProvider();

    case "twilio":
      if (!process.env.TWILIO_ACCOUNT_SID) {
        console.warn(
          "[SMS] TWILIO_ACCOUNT_SID not set, falling back to console"
        );
        return new ConsoleSmsProvider();
      }
      return new TwilioSmsProvider();

    case "fast2sms":
      if (!process.env.FAST2SMS_API_KEY) {
        console.warn(
          "[SMS] FAST2SMS_API_KEY not set, falling back to console"
        );
        return new ConsoleSmsProvider();
      }
      return new Fast2SmsSmsProvider();

    default:
      return new ConsoleSmsProvider();
  }
}

export const smsProvider: SmsProvider = createSmsProvider();

/**
 * Send an OTP SMS message.
 * Returns devOtp string only in non-production environments.
 */
export async function sendOtpSms(
  phone: string,
  otp: string
): Promise<{ devOtp?: string }> {
  const message = `Your ShopZen verification code is ${otp}. It expires in 5 minutes. Do not share it with anyone.`;

  await smsProvider.send(phone, message);

  // In development, return the OTP for the dev banner
  if (process.env.NODE_ENV !== "production") {
    return { devOtp: otp };
  }

  return {};
}
