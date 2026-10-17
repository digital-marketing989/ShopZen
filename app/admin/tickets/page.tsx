"use client";

import { useState } from "react";
import { MessageSquare, AlertCircle, CheckCircle, Clock, Download } from "lucide-react";
import { toast } from "sonner";

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<any[]>([
    {
      id: "TCK-1001",
      customer: "Amit Verma",
      subject: "Delayed delivery inquiry for ORD-2026-X89",
      priority: "HIGH",
      status: "OPEN",
      createdAt: new Date().toISOString(),
    },
    {
      id: "TCK-1002",
      customer: "Kavita Rao",
      subject: "Invoice download error on account page",
      priority: "MEDIUM",
      status: "RESOLVED",
      createdAt: new Date(Date.now() - 172800000).toISOString(),
    },
    {
      id: "TCK-1003",
      customer: "Anand Gupta",
      subject: "Seller onboarding GSTIN verification query",
      priority: "LOW",
      status: "OPEN",
      createdAt: new Date(Date.now() - 43200000).toISOString(),
    },
  ]);

  const handleStatusChange = (id: string, status: string) => {
    setTickets(tickets.map((t) => (t.id === id ? { ...t, status } : t)));
    toast.success(`Ticket ${id} marked as ${status}`);
  };

  const exportCSV = () => {
    const headers = ["Ticket ID", "Customer", "Subject", "Priority", "Status", "Date"];
    const rows = tickets.map((t) => [
      t.id,
      `"${t.customer}"`,
      `"${t.subject}"`,
      t.priority,
      t.status,
      new Date(t.createdAt).toLocaleDateString(),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `shopzen_support_tickets_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Support tickets exported to CSV");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            Customer Support Tickets
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Resolve buyer inquiries, delivery disputes, and merchant help requests.
          </p>
        </div>

        <button
          onClick={exportCSV}
          className="inline-flex items-center gap-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-white px-4 py-2.5 text-xs font-bold shadow-md transition"
        >
          <Download className="w-4 h-4" />
          <span>Export Tickets CSV</span>
        </button>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs text-gray-600">
          <thead className="bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100">
            <tr>
              <th className="p-4">Ticket ID</th>
              <th className="p-4">Customer</th>
              <th className="p-4">Subject</th>
              <th className="p-4">Priority</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tickets.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50/60 transition">
                <td className="p-4 font-mono font-bold text-gray-900">{t.id}</td>
                <td className="p-4 font-medium text-gray-800">{t.customer}</td>
                <td className="p-4 font-semibold text-gray-900 max-w-sm">{t.subject}</td>
                <td className="p-4">
                  <span
                    className={`font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${
                      t.priority === "HIGH"
                        ? "bg-red-50 text-red-700"
                        : t.priority === "MEDIUM"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-blue-50 text-blue-700"
                    }`}
                  >
                    {t.priority}
                  </span>
                </td>
                <td className="p-4">
                  <span
                    className={`font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                      t.status === "RESOLVED"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-blue-50 text-blue-700 border-blue-200"
                    }`}
                  >
                    {t.status}
                  </span>
                </td>
                <td className="p-4 text-right">
                  {t.status !== "RESOLVED" ? (
                    <button
                      onClick={() => handleStatusChange(t.id, "RESOLVED")}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-700 transition"
                    >
                      Resolve
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStatusChange(t.id, "OPEN")}
                      className="px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 font-bold text-[11px] hover:bg-gray-50 transition"
                    >
                      Reopen
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
