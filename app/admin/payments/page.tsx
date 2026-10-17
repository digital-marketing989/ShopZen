"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  CreditCard,
  Search,
  Filter,
  Download,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Eye,
  ExternalLink,
  RefreshCw,
  Copy,
  Check,
  ChevronRight,
  ShieldCheck,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface PaymentRecord {
  id: string;
  orderId: string;
  method: string;
  status: string;
  amount: number;
  currency: string;
  utr?: string | null;
  amountPaid?: number | null;
  proofUrl?: string | null;
  verifiedAt?: string | null;
  rejectionReason?: string | null;
  submissionCount: number;
  createdAt: string;
  updatedAt: string;
  order: {
    id: string;
    orderNumber: string;
    status: string;
    total: number;
    createdAt: string;
    user?: {
      id: string;
      name?: string | null;
      email: string;
      phone?: string | null;
    } | null;
    items?: Array<{
      id: string;
      title: string;
      quantity: number;
      price: number;
      product?: {
        title: string;
        images?: Array<{ url: string }>;
      } | null;
    }>;
  };
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Modals
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [rejectModalPayment, setRejectModalPayment] = useState<PaymentRecord | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [copiedUtr, setCopiedUtr] = useState<string | null>(null);

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (search.trim()) params.set("search", search.trim());
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const res = await fetch(`/api/admin/payments?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to load payments");
      }
      const data = await res.json();
      setPayments(data.payments || []);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to load payments");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, dateFrom, dateTo]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleApprove = async (payment: PaymentRecord) => {
    const confirmApprove = window.confirm(
      `Approve payment for Order #${payment.order.orderNumber} (₹${payment.amountPaid || payment.amount})? This will mark the order as PAID and deduct stock.`
    );
    if (!confirmApprove) return;

    try {
      setProcessingId(payment.id);
      const res = await fetch(`/api/admin/payments/${payment.id}/approve`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to approve payment");
      }
      toast.success(data.message || "Payment approved!");
      fetchPayments();
    } catch (err: any) {
      toast.error(err.message || "Approval failed");
    } finally {
      setProcessingId(null);
    }
  };

  const handleOpenReject = (payment: PaymentRecord) => {
    setRejectModalPayment(payment);
    setRejectReason("Amount not received or UTR reference could not be verified in bank statement.");
  };

  const handleConfirmReject = async () => {
    if (!rejectModalPayment) return;
    if (!rejectReason.trim() || rejectReason.trim().length < 3) {
      toast.error("Please provide a valid rejection reason");
      return;
    }

    try {
      setProcessingId(rejectModalPayment.id);
      const res = await fetch(`/api/admin/payments/${rejectModalPayment.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to reject payment");
      }
      toast.success(data.message || "Payment rejected");
      setRejectModalPayment(null);
      fetchPayments();
    } catch (err: any) {
      toast.error(err.message || "Rejection failed");
    } finally {
      setProcessingId(null);
    }
  };

  const handleCopyUtr = (utr: string) => {
    navigator.clipboard.writeText(utr);
    setCopiedUtr(utr);
    toast.success("UTR copied to clipboard");
    setTimeout(() => setCopiedUtr(null), 2000);
  };

  const getCsvDownloadUrl = () => {
    const params = new URLSearchParams();
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    if (search.trim()) params.set("search", search.trim());
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    params.set("format", "csv");
    return `/api/admin/payments?${params.toString()}`;
  };

  // Counts
  const pendingCount = payments.filter((p) => p.order.status === "PAYMENT_VERIFICATION_PENDING").length;
  const mismatchCount = payments.filter(
    (p) => p.amountPaid !== undefined && p.amountPaid !== null && p.amountPaid !== p.amount
  ).length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              Cashfree Payment Verifications
            </h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Review customer transaction IDs (UTR) and payment screenshots to approve orders and reduce inventory.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchPayments}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-semibold px-3 py-2 text-xs shadow-sm transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          <a
            href={getCsvDownloadUrl()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 text-xs shadow-sm transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pending Verification</p>
            <p className="text-2xl font-black text-blue-600 mt-1">{pendingCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Amount Mismatches</p>
            <p className="text-2xl font-black text-amber-600 mt-1">{mismatchCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Records</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{payments.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gray-50 text-gray-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search & Filters Bar */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Order ID, UTR, Customer..."
              className="w-full rounded-xl border border-gray-200 pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div className="md:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING_VERIFICATION">Pending Verification Only</option>
              <option value="PAID">Approved (PAID)</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          {/* Date Range */}
          <div className="md:col-span-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              title="From date"
              className="w-full rounded-xl border border-gray-200 px-2.5 py-2 text-xs text-gray-600 focus:outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              title="To date"
              className="w-full rounded-xl border border-gray-200 px-2.5 py-2 text-xs text-gray-600 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-600 uppercase tracking-wider text-[10px] font-bold">
                <th className="py-3 px-4">Order ID</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Expected</th>
                <th className="py-3 px-4">Amount Paid</th>
                <th className="py-3 px-4">UTR / Transaction ID</th>
                <th className="py-3 px-4">Proof</th>
                <th className="py-3 px-4">Submitted Time</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400">
                    {loading ? "Loading payments..." : "No payment records found."}
                  </td>
                </tr>
              ) : (
                payments.map((p) => {
                  const hasAmountMismatch =
                    p.amountPaid !== undefined &&
                    p.amountPaid !== null &&
                    p.amountPaid !== p.amount;
                  const isPending = p.order.status === "PAYMENT_VERIFICATION_PENDING";
                  const isPaid = p.status === "PAID" || p.order.status === "PAID";
                  const isRejected = p.status === "REJECTED";

                  return (
                    <tr
                      key={p.id}
                      className={`transition ${
                        hasAmountMismatch && isPending
                          ? "bg-red-50/70 border-l-4 border-l-red-500"
                          : "hover:bg-gray-50/60"
                      }`}
                    >
                      {/* Order ID */}
                      <td className="py-3.5 px-4 font-mono font-bold text-gray-900">
                        <Link
                          href={`/admin/orders/${p.order.id}`}
                          className="hover:text-blue-600 flex items-center gap-1"
                        >
                          <span>{p.order.orderNumber}</span>
                          <ExternalLink className="w-3 h-3 text-gray-400" />
                        </Link>
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-gray-900">{p.order.user?.name || "Customer"}</p>
                        <p className="text-[11px] text-gray-500">{p.order.user?.email}</p>
                      </td>

                      {/* Expected Amount */}
                      <td className="py-3.5 px-4 font-bold text-gray-900">
                        ₹{p.amount.toLocaleString("en-IN")}
                      </td>

                      {/* Amount Paid */}
                      <td className="py-3.5 px-4">
                        {p.amountPaid !== null && p.amountPaid !== undefined ? (
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`font-extrabold ${
                                hasAmountMismatch ? "text-red-700" : "text-emerald-700"
                              }`}
                            >
                              ₹{p.amountPaid.toLocaleString("en-IN")}
                            </span>
                            {hasAmountMismatch && (
                              <span
                                title={`Expected ₹${p.amount}, but customer entered ₹${p.amountPaid}`}
                                className="text-[10px] font-bold text-red-700 bg-red-100 border border-red-300 px-1 py-0.2 rounded"
                              >
                                Mismatch!
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">Not submitted</span>
                        )}
                      </td>

                      {/* UTR */}
                      <td className="py-3.5 px-4">
                        {p.utr ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-bold text-slate-800 bg-gray-100 px-2 py-0.5 rounded">
                              {p.utr}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyUtr(p.utr!)}
                              className="text-gray-400 hover:text-gray-700 transition"
                              title="Copy UTR"
                            >
                              {copiedUtr === p.utr ? (
                                <Check className="w-3.5 h-3.5 text-green-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">None</span>
                        )}
                      </td>

                      {/* Proof Screenshot */}
                      <td className="py-3.5 px-4">
                        {p.proofUrl ? (
                          <button
                            type="button"
                            onClick={() => setPreviewImage(p.proofUrl!)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 transition bg-blue-50 px-2 py-1 rounded-lg border border-blue-200"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Preview</span>
                          </button>
                        ) : (
                          <span className="text-gray-400">No image</span>
                        )}
                      </td>

                      {/* Submitted Time */}
                      <td className="py-3.5 px-4 text-gray-500 text-[11px]">
                        {new Date(p.updatedAt).toLocaleString("en-IN", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>PAID</span>
                          </span>
                        ) : isRejected ? (
                          <span
                            title={p.rejectionReason || "Declined"}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full"
                          >
                            <XCircle className="w-3 h-3" />
                            <span>REJECTED</span>
                          </span>
                        ) : isPending ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                            <Clock className="w-3 h-3" />
                            <span>VERIFYING</span>
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-gray-500">
                            {p.order.status}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        {isPending ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleApprove(p)}
                              disabled={processingId === p.id}
                              className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 text-[11px] shadow-sm transition disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenReject(p)}
                              disabled={processingId === p.id}
                              className="rounded-lg border border-red-200 bg-white hover:bg-red-50 text-red-600 font-bold px-2.5 py-1 text-[11px] transition disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        ) : isPaid ? (
                          <span className="text-[11px] text-gray-400 font-semibold">✓ Verified</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleApprove(p)}
                            disabled={processingId === p.id}
                            className="rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold px-2 py-1 text-[10px]"
                          >
                            Re-approve
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Screenshot Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-4 space-y-3 shadow-2xl relative">
            <div className="flex items-center justify-between pb-2 border-b">
              <h3 className="font-bold text-gray-900 text-sm">Payment Screenshot Proof</h3>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto rounded-xl bg-gray-100 flex items-center justify-center p-2">
              <img
                src={previewImage}
                alt="Payment proof screenshot"
                className="max-h-[65vh] w-auto object-contain rounded-lg shadow-sm"
              />
            </div>
            <div className="flex justify-end pt-2">
              <a
                href={previewImage}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-blue-600 font-bold hover:underline"
              >
                <span>Open in full tab</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectModalPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b">
              <div>
                <h3 className="font-bold text-gray-900 text-sm">
                  Decline Payment Verification
                </h3>
                <p className="text-xs text-gray-500">
                  Order #{rejectModalPayment.order.orderNumber}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRejectModalPayment(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <label htmlFor="rejection-reason" className="block text-xs font-bold text-gray-700">
                Reason for Rejection (sent to customer email) <span className="text-red-500">*</span>
              </label>
              <textarea
                id="rejection-reason"
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. UTR not found in bank statement, amount mismatch, screenshot illegible..."
                className="w-full rounded-xl border border-gray-200 p-3 text-xs focus:outline-none focus:ring-1 focus:ring-red-500"
              />
              <p className="text-[11px] text-gray-400">
                The customer will be notified via email and will be able to resubmit their proof on their order page.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setRejectModalPayment(null)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={processingId === rejectModalPayment.id}
                className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 text-xs shadow transition disabled:opacity-50"
              >
                {processingId === rejectModalPayment.id ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
