import { NextRequest, NextResponse } from "next/server";
import {
  getCashfreeLinkConfig,
  DEFAULT_CASHFREE_LINK,
  DEFAULT_PAYEE_NAME,
} from "@/lib/payments/cashfree-link";
import { getCashfreeSettings } from "@/lib/payment-settings";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  void req;
  try {
    const dbSettings = await getCashfreeSettings().catch(() => null);
    const customLink = dbSettings?.link;
    const isDbEnabled = dbSettings ? dbSettings.enabled : true;

    const config = getCashfreeLinkConfig(customLink);
    return NextResponse.json({
      success: true,
      options: {
        cashfreeEnabled: isDbEnabled && config.isValid,
        payeeName: config.payeeName,
        paymentLink: config.link,
      },
    });
  } catch (error) {
    console.error("Failed to load payment options:", error);
    const config = getCashfreeLinkConfig();
    return NextResponse.json({
      success: true,
      options: {
        cashfreeEnabled: true,
        payeeName: config.payeeName || DEFAULT_PAYEE_NAME,
        paymentLink: config.link || DEFAULT_CASHFREE_LINK,
      },
    });
  }
}
