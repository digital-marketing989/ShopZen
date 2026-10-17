// app/api/auth/login-otp/route.ts
// Phone-based OTP login has been removed from ShopZen.
// This route now returns 410 Gone so any legacy clients get a clear response.

import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      code: "PHONE_LOGIN_REMOVED",
      message:
        "Phone-based OTP login is no longer available. Please use email and password.",
    },
    { status: 410 }
  );
}
