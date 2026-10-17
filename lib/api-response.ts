// lib/api-response.ts
// Central response and error handling utility for API routes.

import { NextResponse } from "next/server";
import { ZodError } from "zod";

export interface ApiResponseOptions {
  status?: number;
  devOtp?: string;
}

/**
 * Standard success response wrapper.
 * Automatically handles devOtp inclusion only in development.
 */
export function apiSuccess(
  data: Record<string, unknown> = {},
  status = 200,
  devOtp?: string
) {
  const isDev = process.env.NODE_ENV !== "production";
  const payload: Record<string, unknown> = { ...data };

  if (isDev && devOtp) {
    payload.devOtp = devOtp;
  }

  return NextResponse.json(payload, { status });
}

/**
 * Centralized API error handler.
 * Logs full error server-side, extracts safe error messages,
 * and includes dev details only in development.
 */
export function handleApiError(error: unknown, context = "API_ERROR"): NextResponse {
  // 1. Always log full error server-side for diagnostics
  console.error(`[${context}] Error:`, error);

  // 2. Handle Zod validation errors
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Validation failed",
        message: error.issues[0]?.message || "Validation failed",
        details: error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const isDev = process.env.NODE_ENV !== "production";
  const errorMessage = error instanceof Error ? error.message : "Internal server error";

  // Prisma connection errors or database offline
  const isPrismaError =
    typeof error === "object" &&
    error !== null &&
    ("clientVersion" in error || "code" in error);

  if (isPrismaError) {
    return NextResponse.json(
      {
        error: isDev
          ? `Database error: ${errorMessage}`
          : "Database service temporarily unavailable. Please try again.",
        message: isDev
          ? `Database error: ${errorMessage}`
          : "Database service temporarily unavailable. Please try again.",
        ...(isDev ? { devDetails: String(error) } : {}),
      },
      { status: 503 }
    );
  }

  // Generic fallback
  return NextResponse.json(
    {
      error: isDev ? errorMessage : "An unexpected error occurred. Please try again.",
      message: isDev ? errorMessage : "An unexpected error occurred. Please try again.",
      ...(isDev ? { devDetails: String(error) } : {}),
    },
    { status: 500 }
  );
}
