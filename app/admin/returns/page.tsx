"use client";

import { useState, useEffect } from "react";
import { RotateCcw, CheckCircle2, XCircle, Search, Download } from "lucide-react";
import { toast } from "sonner";

export default function AdminReturnsPage() {
  const [returns, setReturns] = useState<any[]>([
    {
      id: "ret_1",
      orderNumber: "ORD-2026-X89",
      customer: "Rahul Sharma",
      product: "Samsung Galaxy S24 Ultra",
      reason: "Defective item - screen glitch",
      amount: 129999,
      status: "PENDING",
      createdAt: new Date().toISOString(),
    },
    {
      id: "ret_2",
      orderNumber: "ORD-2026-K12",
      customer: "Priya Patel",
      product: "boAt Airdopes 141",
      reason: "Color mismatch with description",
      amount: 1499,
      status: "APPROVED",
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
  ]);

  const handleUpdateStatus = (id: string, status: string) => {
    setReturns(returns.map((r) => (r.id === id ? { ...r, status } : r)));
    toast.success(`Return request updated to ${status}`);
  };

  const exportCSV = () => {
    const headers = ["Return ID", "Order Number", "Customer", "Product", "Amount", "Reason", "Status"];
    const rows = returns.map((r) => [
      r.id,
      r.orderNumber,
      `"${r.customer}"`,
      `"${r.product}"`,
      r.amount,
      `"${r.reason}"`,
      r.status,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `shopzen_returns_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Returns data exported to CSV");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            Return & Refund Moderation
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Review customer return requests, inspect claimed damages, and authorize refunds.
          </p>
        </div>

        <button
          onClick={exportCSV}
          className="inline-flex items-center gap-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-white px-4 py-2.5 text-xs font-bold shadow-md transition"
        >
          <Download className="w-4 h-4" />
          <span>Export Returns CSV</span>
        </button>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs text-gray-600">
          <thead className="bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100">
            <tr>
              <th className="p-4">Order #</th>
              <th className="p-4">Customer</th>
              <th className="p-4">Product & Reason</th>
              <th className="p-4">Refund Amount</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Moderation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {returns.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50/60 transition">
                <td className="p-4 font-mono font-bold text-gray-900">{r.orderNumber}</td>
                <td className="p-4 font-medium text-gray-800">{r.customer}</td>
                <td className="p-4">
                  <p className="font-bold text-gray-900">{r.product}</p>
                  <p className="text-[11px] text-gray-500">{r.reason}</p>
                </td>
                <td className="p-4 font-extrabold text-gray-950">
                  ₹{r.amount.toLocaleString("en-IN")}
                </td>
                <td className="p-4">
                  <span
                    className={`font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                      r.status === "APPROVED"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : r.status === "REJECTED"
                        ? "bg-red-50 text-red-700 border-red-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}
                  >
                    {r.status}
                  </span>
                </td>
                <td className="p-4 text-right space-x-2">
                  {r.status === "PENDING" && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus(r.id, "APPROVED")}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-700 transition"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(r.id, "REJECTED")}
                        className="px-2.5 py-1 rounded-lg border border-red-200 text-red-600 font-bold text-[11px] hover:bg-red-50 transition"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {r.status === "APPROVED" && (
                    <button
                      onClick={() => handleUpdateStatus(r.id, "COMPLETED")}
                      className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-bold text-[11px] hover:bg-blue-700 transition"
                    >
                      Process Payout
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
