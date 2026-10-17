"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Clock,
  AlertCircle,
  CheckCircle2,
  Upload,
  ArrowRight,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

interface PaymentOrderProps {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  createdAt: string;
  payment: {
    method: string;
    status: string;
    utr?: string | null;
    amountPaid?: number | null;
    proofUrl?: string | null;
    submissionCount: number;
    rejectionReason?: string | null;
  } | null;
  items: Array<{
    id: string;
    title: string;
    quantity: number;
    price: number;
  }>;
}

export function PaymentScreenClient({
  order,
  paymentLink,
  cashfreeEnabled,
  isExpired,
}: {
  order: PaymentOrderProps;
  paymentLink: string;
  cashfreeEnabled: boolean;
  isExpired: boolean;
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [copiedOrderId, setCopiedOrderId] = useState(false);

  // Form state
  const [utr, setUtr] = useState(order.payment?.utr || "");
  const [amountPaid, setAmountPaid] = useState<string>(
    order.payment?.amountPaid ? String(order.payment.amountPaid) : String(order.total)
  );
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(order.payment?.proofUrl || null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submittedSuccess, setSubmittedSuccess] = useState(
    order.status === "PAYMENT_VERIFICATION_PENDING"
  );

  const submissionCount = order.payment?.submissionCount || 0;
  const isPendingVerification = order.status === "PAYMENT_VERIFICATION_PENDING" || submittedSuccess;
  const wasRejected = Boolean(order.payment?.rejectionReason);

  const handleCopyAmount = async () => {
    try {
      await navigator.clipboard.writeText(String(order.total));
      setCopied(true);
      toast.success(`Copied ₹${order.total} to clipboard`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleCopyOrderId = async () => {
    try {
      await navigator.clipboard.writeText(order.orderNumber);
      setCopiedOrderId(true);
      toast.success(`Copied Order ID ${order.orderNumber}`);
      setTimeout(() => setCopiedOrderId(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size exceeds 5 MB limit");
      return;
    }

    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast.error("Only JPG, PNG, or WebP images are allowed");
      return;
    }

    setScreenshot(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanUtr = utr.trim();
    if (!cleanUtr) {
      setErrorMsg("Transaction ID / UTR is required.");
      return;
    }

    const utrRegex = /^[a-zA-Z0-9]{8,30}$/;
    if (!utrRegex.test(cleanUtr)) {
      setErrorMsg("Transaction ID / UTR must be 8 to 30 alphanumeric characters.");
      return;
    }

    const numAmount = Number(amountPaid);
    if (!numAmount || numAmount <= 0) {
      setErrorMsg("Please enter a valid amount paid.");
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append("utr", cleanUtr);
      formData.append("amountPaid", String(numAmount));
      if (screenshot) {
        formData.append("screenshot", screenshot);
      }

      const res = await fetch(`/api/orders/${order.id}/payment-proof`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit payment verification proof");
      }

      toast.success(data.message || "Payment proof submitted successfully!");
      setSubmittedSuccess(true);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit payment proof");
      toast.error(err.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Breadcrumb */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <Link href="/orders" className="hover:text-blue-600 font-semibold">
          ← Back to My Orders
        </Link>
        <span className="font-mono text-gray-700">Order #{order.orderNumber}</span>
      </div>

      {/* Expiry Warning if stock reservation passed 30 mins */}
      {isExpired && !isPendingVerification && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Stock Reservation Notice (30 Minutes)</p>
            <p className="mt-0.5 text-amber-700">
              The initial 30-minute stock reservation window for this order has expired. You can still complete your payment now using the link below, and your stock will be confirmed once our team verifies your payment.
            </p>
          </div>
        </div>
      )}

      {/* Previous Rejection Banner if admin rejected */}
      {wasRejected && !isPendingVerification && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-900 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-red-800">Previous Payment Verification Declined</p>
            <p className="text-red-700">
              Reason: <em>&ldquo;{order.payment?.rejectionReason}&rdquo;</em>
            </p>
            <p className="text-[11px] text-red-600">
              Please check your payment details or bank receipt and resubmit with the correct UTR / transaction ID.
            </p>
          </div>
        </div>
      )}

      {/* Main Payment Card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
        {/* Title */}
        <div className="text-center space-y-1.5 pb-4 border-b border-gray-100">
          <span className="text-[11px] font-bold tracking-widest text-blue-600 uppercase bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
            Cashfree Direct Checkout
          </span>
          <h1 className="text-2xl font-black text-gray-950 tracking-tight">
            Complete your payment
          </h1>
          <p className="text-xs text-gray-500">
            Order ID: <strong className="font-mono text-gray-900">{order.orderNumber}</strong>
          </p>
        </div>

        {/* Large Amount Box */}
        <div className="rounded-2xl bg-gradient-to-br from-blue-50 via-indigo-50/50 to-white border-2 border-blue-200 p-6 text-center space-y-3">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
            Exact Amount to Pay
          </p>
          <div className="flex items-center justify-center gap-2">
            <span className="text-4xl sm:text-5xl font-black text-blue-950 tracking-tight">
              ₹{order.total.toLocaleString("en-IN")}
            </span>
          </div>

          <div className="flex justify-center items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleCopyAmount}
              id="copy-amount-btn"
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 bg-white hover:bg-blue-50 text-blue-700 font-bold px-3 py-1.5 text-xs shadow-sm transition"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-green-600" />
                  <span className="text-green-700">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-blue-600" />
                  <span>Copy amount</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleCopyOrderId}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-bold px-3 py-1.5 text-xs shadow-sm transition"
            >
              {copiedOrderId ? (
                <>
                  <Check className="w-3.5 h-3.5 text-green-600" />
                  <span className="text-green-700">Copied ID!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-gray-500" />
                  <span>Copy Order ID</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Receiver Instructions Note */}
        <div className="rounded-xl bg-amber-50 border border-amber-200/80 p-4 space-y-2 text-xs">
          <div className="flex items-center gap-2 text-amber-900 font-bold">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>Important Payment Instructions</span>
          </div>
          <p className="text-amber-900 text-xs sm:text-sm font-medium leading-relaxed">
            Enter exactly Rs {order.total} on the next page and add Order ID {order.orderNumber} in the note if available. The receiver name will show as DIGITAL MARKETING.
          </p>
        </div>

        {/* Step 1: Pay Now Button */}
        <div className="space-y-2 pt-2">
          <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">
            Step 1: Open Cashfree Payment Link
          </p>
          <a
            href={paymentLink}
            target="_blank"
            rel="noopener noreferrer"
            id="pay-now-btn"
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black py-3.5 px-6 text-sm shadow-md transition transform active:scale-[0.99]"
          >
            <span>Pay Now (Opens Cashfree in new tab)</span>
            <ExternalLink className="w-4 h-4" />
          </a>
          <p className="text-[11px] text-gray-400 text-center">
            Accepts Google Pay, PhonePe, Paytm, BHIM UPI, Debit/Credit Cards & Net Banking.
          </p>
        </div>

        {/* Step 2: Verification Pending State or Submit Form */}
        <div className="pt-4 border-t border-gray-100">
          {isPendingVerification ? (
            /* Success confirmation screen */
            <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/60 p-6 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-emerald-950">
                  Payment Verification in Progress
                </h3>
                <p className="text-xs text-emerald-800 max-w-md mx-auto leading-relaxed">
                  We are verifying your payment, you will get an email once it is confirmed.
                </p>
              </div>

              <div className="rounded-xl bg-white border border-emerald-200 p-4 text-left space-y-1.5 text-xs max-w-sm mx-auto shadow-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Order Number:</span>
                  <span className="font-mono font-bold text-gray-900">{order.orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">UTR / Txn ID:</span>
                  <span className="font-mono font-bold text-gray-900">{utr || order.payment?.utr}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Amount Paid:</span>
                  <span className="font-bold text-emerald-700">₹{amountPaid || order.payment?.amountPaid}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Current Status:</span>
                  <span className="font-bold text-blue-600">PAYMENT_VERIFICATION_PENDING</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
                <Link
                  href={`/orders/${order.id}`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 text-xs shadow transition"
                >
                  <FileText className="w-4 h-4" />
                  <span>View Order Details</span>
                </Link>
                <Link
                  href="/orders"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-semibold py-2.5 px-6 text-xs transition"
                >
                  <span>All My Orders</span>
                </Link>
              </div>
            </div>
          ) : (
            /* "I have paid" Form */
            <form onSubmit={handleSubmitProof} className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                    Step 2: I have paid
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Enter the transaction reference from your UPI / bank app to verify your payment.
                  </p>
                </div>
                {submissionCount > 0 && (
                  <span className="text-[11px] font-semibold text-gray-400">
                    Attempt {submissionCount + 1} of 5
                  </span>
                )}
              </div>

              {errorMsg && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* UTR Input */}
              <div>
                <label htmlFor="utr-input" className="block text-xs font-bold text-gray-700">
                  Transaction ID / UTR <span className="text-red-500">*</span>
                </label>
                <input
                  id="utr-input"
                  type="text"
                  value={utr}
                  onChange={(e) => setUtr(e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 30))}
                  placeholder="e.g. 428719283741 or UPI Ref ID"
                  required
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <p className="mt-1 text-[11px] text-gray-400">
                  8 to 30 alphanumeric characters found in your Google Pay, PhonePe, or bank transfer confirmation.
                </p>
              </div>

              {/* Amount Paid Input */}
              <div>
                <label htmlFor="amount-input" className="block text-xs font-bold text-gray-700">
                  Amount Paid (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  id="amount-input"
                  type="number"
                  step="any"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  placeholder={String(order.total)}
                  required
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm font-bold focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Screenshot Upload (Optional) */}
              <div>
                <label htmlFor="screenshot-input" className="block text-xs font-bold text-gray-700">
                  Payment Screenshot <span className="text-gray-400 font-normal">(optional, max 5 MB)</span>
                </label>
                <div className="mt-1 flex items-center gap-3">
                  <label
                    htmlFor="screenshot-input"
                    className="cursor-pointer inline-flex items-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50/50 hover:bg-gray-100/60 px-4 py-2.5 text-xs font-semibold text-gray-700 transition"
                  >
                    <Upload className="w-4 h-4 text-gray-500" />
                    <span>{screenshot ? screenshot.name : "Choose JPG, PNG, or WebP"}</span>
                  </label>
                  <input
                    id="screenshot-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {previewUrl && (
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 underline font-medium"
                    >
                      View preview
                    </a>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                id="submit-paid-btn"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 text-sm shadow-md transition disabled:opacity-50"
              >
                {submitting ? (
                  <span>Submitting Verification...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Submit Payment Proof for Verification</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
