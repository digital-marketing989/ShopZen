"use client";

import { useState, useEffect } from "react";
import { ShoppingBag, Search, CheckCircle2, Clock, Filter } from "lucide-react";
import { toast } from "sonner";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/orders?limit=50");
      const data = await res.json();
      if (data.success && data.data.orders) {
        setOrders(data.data.orders);
      }
    } catch {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        toast.success(`Order status updated to ${newStatus}`);
        setOrders(
          orders.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
        );
      } else {
        toast.error("Failed to update order status");
      }
    } catch {
      toast.error("Network error");
    }
  };

  const filtered = orders.filter((o) => {
    const matchesStatus = statusFilter === "ALL" || o.status === statusFilter;
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      (o.address?.name && o.address.name.toLowerCase().includes(search.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">
          Orders Management
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Monitor fulfillment, process shipments, and manage customer orders.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by order number or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs text-gray-900 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-400 font-medium">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 font-semibold text-gray-700 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="PLACED">Placed</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PACKED">Packed</option>
            <option value="SHIPPED">Shipped</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100">
              <tr>
                <th className="p-4">Order Number</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Items</th>
                <th className="p-4">Total</th>
                <th className="p-4">Payment</th>
                <th className="p-4">Status Transition</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((ord) => (
                <tr key={ord.id} className="hover:bg-gray-50/60 transition">
                  <td className="p-4">
                    <p className="font-mono font-bold text-gray-900">
                      {ord.orderNumber}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {new Date(ord.createdAt).toLocaleDateString()}
                    </p>
                  </td>
                  <td className="p-4">
                    <p className="font-bold text-gray-800">
                      {ord.address?.name || "Customer"}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {ord.address?.city}, {ord.address?.pincode}
                    </p>
                  </td>
                  <td className="p-4">
                    <span className="font-medium text-gray-700">
                      {ord.items?.length || 1} product(s)
                    </span>
                  </td>
                  <td className="p-4 font-extrabold text-gray-950">
                    ₹{ord.total.toLocaleString("en-IN")}
                  </td>
                  <td className="p-4">
                    <span className="font-bold text-[11px] text-gray-700">
                      {ord.paymentMethod}
                    </span>
                    <span
                      className={`block text-[10px] font-semibold ${
                        ord.paymentStatus === "PAID"
                          ? "text-emerald-600"
                          : "text-amber-600"
                      }`}
                    >
                      {ord.paymentStatus}
                    </span>
                  </td>
                  <td className="p-4">
                    <select
                      value={ord.status}
                      onChange={(e) => handleStatusChange(ord.id, e.target.value)}
                      className={`text-xs font-bold rounded-lg px-2.5 py-1.5 border focus:outline-none transition ${
                        ord.status === "DELIVERED"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : ord.status === "CANCELLED"
                          ? "bg-red-50 text-red-800 border-red-200"
                          : "bg-blue-50 text-blue-800 border-blue-200"
                      }`}
                    >
                      <option value="PLACED">PLACED</option>
                      <option value="CONFIRMED">CONFIRMED</option>
                      <option value="PACKED">PACKED</option>
                      <option value="SHIPPED">SHIPPED</option>
                      <option value="DELIVERED">DELIVERED</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
