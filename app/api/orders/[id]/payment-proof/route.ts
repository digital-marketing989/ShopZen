import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  sendPaymentProofSubmittedEmail,
  sendAdminPaymentProofAlert,
} from "@/lib/email";

// Simple in-memory rate limit store for submissions: IP/User -> lastTimestamp
const rateLimitMap = new Map<string, number>();

const UTR_REGEX = /^[a-zA-Z0-9]{8,30}$/;

const proofPayloadSchema = z.object({
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

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const currentUser = session?.user?.id
      ? await db.user.findUnique({
          where: { id: session.user.id },
          select: { id: true, name: true, email: true, role: true },
        })
      : null;
    const { id: orderId } = await params;

    // Rate limiting: max 1 submit per 10 seconds
    const rateLimitKey = `${currentUser?.id || "guest"}-${orderId}`;
    const lastSubmitTime = rateLimitMap.get(rateLimitKey) || 0;
    const now = Date.now();
    if (now - lastSubmitTime < 10_000) {
      const waitSeconds = Math.ceil((10_000 - (now - lastSubmitTime)) / 1000);
      return NextResponse.json(
        {
          success: false,
          code: "RATE_LIMITED",
          message: `Please wait ${waitSeconds} seconds before submitting again.`,
        },
        { status: 429 }
      );
    }

    // 1. Fetch order and verify ownership
    const order = await db.order.findFirst({
      where: {
        OR: [{ id: orderId }, { orderNumber: orderId }],
      },
      include: {
        payment: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, code: "NOT_FOUND", message: "Order not found" },
        { status: 404 }
      );
    }

    if (currentUser) {
      const isOwner = order.userId === currentUser.id;
      const isAdmin = currentUser.role === "ADMIN" || currentUser.role === "SUPER_ADMIN";
      if (!isOwner && !isAdmin) {
        return NextResponse.json(
          { success: false, code: "FORBIDDEN", message: "Forbidden: You do not own this order" },
          { status: 403 }
        );
      }
    }

    // Only allow for orders in PENDING_PAYMENT or resubmission
    if (order.status === "PAID" || order.status === "DELIVERED" || order.status === "CANCELLED") {
      return NextResponse.json(
        {
          success: false,
          code: "INVALID_ORDER_STATUS",
          message: `Cannot submit payment proof for order with status '${order.status}'`,
        },
        { status: 400 }
      );
    }

    // 2. Submission limit: max 5 per order
    const currentSubmissions = order.payment?.submissionCount || 0;
    if (currentSubmissions >= 5) {
      return NextResponse.json(
        {
          success: false,
          code: "LIMIT_REACHED",
          message: "Maximum submission limit (5 attempts) reached for this order. Please contact support.",
        },
        { status: 400 }
      );
    }

    // 3. Parse FormData
    const formData = await req.formData();
    const utrRaw = formData.get("utr")?.toString()?.trim() || "";
    const amountPaidRaw = Number(formData.get("amountPaid"));
    const screenshotFile = formData.get("screenshot") as File | null;

    const validation = proofPayloadSchema.safeParse({
      utr: utrRaw,
      amountPaid: amountPaidRaw,
    });

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          code: "VALIDATION_ERROR",
          message: validation.error.issues[0]?.message || "Invalid input data",
        },
        { status: 400 }
      );
    }

    const { utr, amountPaid } = validation.data;

    // 4. Prevent duplicate UTR across other orders (unique constraint)
    const duplicateUtr = await db.payment.findFirst({
      where: {
        utr: {
          equals: utr,
        },
        NOT: {
          orderId: order.id,
        },
      },
    });

    if (duplicateUtr) {
      return NextResponse.json(
        {
          success: false,
          code: "DUPLICATE_UTR",
          message: "This Transaction ID / UTR has already been submitted for another order. Please check your bank receipt.",
        },
        { status: 409 }
      );
    }

    // 5. Handle Screenshot Upload (optional)
    let proofUrl: string | null = order.payment?.proofUrl || null;
    if (screenshotFile && typeof screenshotFile === "object" && screenshotFile.size > 0) {
      if (screenshotFile.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          {
            success: false,
            code: "FILE_TOO_LARGE",
            message: "Screenshot file size must be less than 5 MB.",
          },
          { status: 400 }
        );
      }

      if (!ALLOWED_MIME_TYPES.has(screenshotFile.type)) {
        return NextResponse.json(
          {
            success: false,
            code: "INVALID_FILE_TYPE",
            message: "Invalid file type. Only JPG, PNG, and WebP images are allowed.",
          },
          { status: 400 }
        );
      }

      const bytes = await screenshotFile.arrayBuffer();
      const buffer = Buffer.from(bytes);

      let ext = "jpg";
      if (screenshotFile.type === "image/png") ext = "png";
      else if (screenshotFile.type === "image/webp") ext = "webp";

      const uploadDir = path.join(process.cwd(), "public", "uploads", "payment-proofs");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const randomName = `proof-${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
      const filePath = path.join(uploadDir, randomName);
      fs.writeFileSync(filePath, buffer);
      proofUrl = `/uploads/payment-proofs/${randomName}`;
    }

    // 6. Execute atomic update inside transaction
    await db.$transaction(async (tx) => {
      await tx.payment.upsert({
        where: { orderId: order.id },
        update: {
          method: "CASHFREE_LINK",
          utr,
          amountPaid,
          proofUrl,
          status: "PENDING",
          submissionCount: { increment: 1 },
          rejectionReason: null,
        },
        create: {
          orderId: order.id,
          method: "CASHFREE_LINK",
          status: "PENDING",
          amount: order.total,
          amountPaid,
          utr,
          proofUrl,
          submissionCount: 1,
        },
      });

      await tx.order.update({
        where: { id: order.id },
        data: {
          status: "PAYMENT_VERIFICATION_PENDING",
        },
      });

      await tx.subOrder.updateMany({
        where: { orderId: order.id },
        data: {
          status: "PAYMENT_VERIFICATION_PENDING",
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: "PAYMENT_VERIFICATION_PENDING",
          note: `Payment proof submitted: UTR ${utr}, Amount ₹${amountPaid}`,
          createdBy: currentUser?.id || order.userId,
        },
      });
    });

    rateLimitMap.set(rateLimitKey, Date.now());

    // 7. Dispatch background emails
    const customerEmail = order.user?.email || currentUser?.email;
    if (customerEmail) {
      sendPaymentProofSubmittedEmail(
        customerEmail,
        order.orderNumber,
        amountPaid,
        utr,
        order.user?.name || undefined
      ).catch((err) => console.error("Error sending customer proof email:", err));
    }

    sendAdminPaymentProofAlert(
      order.orderNumber,
      amountPaid,
      utr,
      order.user?.name || undefined
    ).catch((err) => console.error("Error sending admin proof email:", err));

    return NextResponse.json({
      success: true,
      message: "We are verifying your payment, you will get an email once it is confirmed.",
      orderStatus: "PAYMENT_VERIFICATION_PENDING",
    });
  } catch (error: any) {
    console.error("Payment proof submission error:", error);

    if (error.code === "P2002") {
      return NextResponse.json(
        {
          success: false,
          code: "DUPLICATE_UTR",
          message: "This Transaction ID / UTR has already been submitted for another order.",
        },
        { status: 409 }
      );
    }

    if (error.code === "P2003") {
      return NextResponse.json(
        {
          success: false,
          code: "FOREIGN_KEY_VIOLATION",
          message: "Your session expired or referenced order was not found. Please sign in again.",
        },
        { status: 401 }
      );
    }

    if (error.statusCode === 401 || error.code === "SESSION_EXPIRED" || error.code === "UNAUTHORIZED") {
      return NextResponse.json(
        {
          success: false,
          code: error.code || "UNAUTHORIZED",
          message: error.message || "Your session expired, please sign in again",
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        code: "SUBMISSION_FAILED",
        message: error?.message || "Failed to submit payment verification proof",
      },
      { status: 500 }
    );
  }
}
