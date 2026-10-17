import { NextRequest, NextResponse } from "next/server";
import { getCashfreeLinkConfig } from "@/lib/payments/cashfree-link";

export async function GET(req: NextRequest) {
  void req;
  try {
    const config = getCashfreeLinkConfig();
    return NextResponse.json({
      success: true,
      options: {
        cashfreeEnabled: config.isValid,
        payeeName: config.payeeName,
      },
    });
  } catch (error) {
    console.error("Failed to load payment options:", error);
    return NextResponse.json({
      success: true,
      options: {
        cashfreeEnabled: false,
        payeeName: "DIGITAL MARKETING",
      },
    });
  }
}
