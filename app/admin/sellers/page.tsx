"use client";

import { useState, useEffect } from "react";
import { Store, Check, Ban, Search } from "lucide-react";
import { toast } from "sonner";

export default function AdminSellersPage() {
  const [sellers, setSellers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSellers = async () => {
    try {
      const res = await fetch("/api/admin/sellers");
      const data = await res.json();
      if (data.success) {
        setSellers(data.data);
      }
    } catch {
      toast.error("Failed to load sellers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSellers();
  }, []);

  const handleUpdateStatus = async (sellerId: string, status: string) => {
    try {
      const res = await fetch("/api/admin/sellers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: sellerId, status }),
      });

      if (res.ok) {
        toast.success(`Seller status updated to ${status}`);
        setSellers(
          sellers.map((s) => (s.id === sellerId ? { ...s, status } : s))
        );
      } else {
        toast.error("Failed to update status");
      }
    } catch {
      toast.error("Network error");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">
          Seller Accounts & Approvals
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Review marketplace merchants, commission rates, and compliance.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs text-gray-600">
          <thead className="bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100">
            <tr>
              <th className="p-4">Store Name</th>
              <th className="p-4">Owner Contact</th>
              <th className="p-4">Products</th>
              <th className="p-4">Commission</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sellers.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50/60 transition">
                <td className="p-4">
                  <p className="font-bold text-gray-900">{s.storeName}</p>
                  <p className="text-[10px] text-gray-400">{s.businessType}</p>
                </td>
                <td className="p-4">
                  <p className="font-medium text-gray-800">{s.user?.name || "Merchant"}</p>
                  <p className="text-[10px] text-gray-400">{s.user?.email}</p>
                </td>
                <td className="p-4 font-semibold text-gray-700">
                  {s._count?.products || 0} listings
                </td>
                <td className="p-4 font-bold text-gray-900">
                  {s.commissionRate || 10}%
                </td>
                <td className="p-4">
                  <span
                    className={`font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                      s.status === "APPROVED"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : s.status === "PENDING"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-red-50 text-red-700 border-red-200"
                    }`}
                  >
                    {s.status}
                  </span>
                </td>
                <td className="p-4 text-right space-x-2">
                  {s.status !== "APPROVED" && (
                    <button
                      onClick={() => handleUpdateStatus(s.id, "APPROVED")}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-700 transition"
                    >
                      Approve
                    </button>
                  )}
                  {s.status !== "SUSPENDED" && (
                    <button
                      onClick={() => handleUpdateStatus(s.id, "SUSPENDED")}
                      className="px-2.5 py-1 rounded-lg border border-red-200 text-red-600 font-bold text-[11px] hover:bg-red-50 transition"
                    >
                      Suspend
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
