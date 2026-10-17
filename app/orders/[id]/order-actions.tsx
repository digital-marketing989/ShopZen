"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, XCircle, RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function OrderActions({ order }: { order: any }) {
  const router = useRouter();
  const [cancelling, setCancelling] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnReason, setReturnReason] = useState("Defective or damaged product");
  const [returnDesc, setReturnDesc] = useState("");
  const [submittingReturn, setSubmittingReturn] = useState(false);

  const canCancel = order.status === "PLACED";
  const canReturn = order.status === "DELIVERED";

  const handlePrintInvoice = () => {
    window.print();
  };

  const handleCancelOrder = async () => {
    if (!confirm("Are you sure you want to cancel this order?")) return;

    setCancelling(true);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "CANCELLED",
          note: "Cancelled by customer",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to cancel order");
      }

      toast.success("Order cancelled successfully");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel order");
    } finally {
      setCancelling(false);
    }
  };

  const handleSubmitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingReturn(true);

    try {
      const res = await fetch("/api/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          reason: returnReason,
          description: returnDesc,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit return");
      }

      toast.success("Return request submitted! Our team will review within 24 hours.");
      setReturnModalOpen(false);
      setReturnDesc("");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit return request");
    } finally {
      setSubmittingReturn(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={handlePrintInvoice}
          className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 px-3.5 py-2 text-xs font-bold text-gray-700 shadow-2xs transition"
        >
          <FileText className="w-3.5 h-3.5 text-blue-600" />
          <span>Invoice</span>
        </button>

        {canCancel && (
          <button
            onClick={handleCancelOrder}
            disabled={cancelling}
            className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 px-3.5 py-2 text-xs font-bold text-red-700 transition disabled:opacity-50"
          >
            {cancelling ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <XCircle className="w-3.5 h-3.5" />
            )}
            <span>Cancel Order</span>
          </button>
        )}

        {canReturn && (
          <button
            onClick={() => setReturnModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 px-3.5 py-2 text-xs font-bold text-amber-800 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Return Request</span>
          </button>
        )}
      </div>

      {/* Return Request Modal */}
      {returnModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-sm">
                Request Return for Order #{order.orderNumber}
              </h3>
              <button
                onClick={() => setReturnModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitReturn} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Reason for Return
                </label>
                <select
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Defective or damaged product">
                    Defective or damaged product
                  </option>
                  <option value="Item not as described">Item not as described</option>
                  <option value="Wrong item received">Wrong item received</option>
                  <option value="Quality not satisfactory">
                    Quality not satisfactory
                  </option>
                  <option value="Changed mind">Changed mind</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Additional Details
                </label>
                <textarea
                  value={returnDesc}
                  onChange={(e) => setReturnDesc(e.target.value)}
                  rows={3}
                  placeholder="Describe the issue with the product..."
                  className="w-full rounded-xl border border-gray-200 p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReturnModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReturn}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50"
                >
                  {submittingReturn ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
