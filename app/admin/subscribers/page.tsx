"use client";

import { useState } from "react";
import { Mail, Download, CheckCircle2, UserCheck } from "lucide-react";
import { toast } from "sonner";

export default function AdminSubscribersPage() {
  const [subscribers, setSubscribers] = useState<any[]>([
    { id: "sub_1", email: "rahul.sharma@example.com", date: "2026-10-10", isActive: true },
    { id: "sub_2", email: "priya.p@example.com", date: "2026-10-11", isActive: true },
    { id: "sub_3", email: "arun.kumar@gmail.com", date: "2026-10-12", isActive: true },
    { id: "sub_4", email: "sneha.reddy@outlook.com", date: "2026-10-13", isActive: true },
    { id: "sub_5", email: "vikram.mehta@yahoo.com", date: "2026-10-14", isActive: true },
  ]);

  const exportCSV = () => {
    const headers = ["Subscriber ID", "Email", "Subscription Date", "Status"];
    const rows = subscribers.map((s) => [
      s.id,
      s.email,
      s.date,
      s.isActive ? "ACTIVE" : "UNSUBSCRIBED",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `shopzen_subscribers_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Subscribers list exported to CSV");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            Newsletter Subscribers
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Audience mailing list for marketing campaigns, promotional offers, and festival sales.
          </p>
        </div>

        <button
          onClick={exportCSV}
          className="inline-flex items-center gap-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-white px-4 py-2.5 text-xs font-bold shadow-md transition"
        >
          <Download className="w-4 h-4" />
          <span>Export Audience CSV</span>
        </button>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs text-gray-600">
          <thead className="bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100">
            <tr>
              <th className="p-4">Email Address</th>
              <th className="p-4">Subscribed Date</th>
              <th className="p-4">Verification</th>
              <th className="p-4 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {subscribers.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50/60 transition">
                <td className="p-4 font-bold text-gray-900 flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-blue-600" />
                  <span>{s.email}</span>
                </td>
                <td className="p-4 text-gray-500">{s.date}</td>
                <td className="p-4">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    <CheckCircle2 className="w-3 h-3" /> Double Opt-In Confirmed
                  </span>
                </td>
                <td className="p-4 text-right">
                  <span className="font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    Active
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
