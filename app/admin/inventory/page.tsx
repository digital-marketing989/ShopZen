"use client";

import { useState, useEffect } from "react";
import {
  Boxes,
  AlertTriangle,
  ArrowUpDown,
  Download,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";

export default function AdminInventoryPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "LOW_STOCK" | "OUT_OF_STOCK">("ALL");
  const [search, setSearch] = useState("");
  const [adjustModal, setAdjustModal] = useState<any>(null);
  const [adjustmentQty, setAdjustmentQty] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("RESTOCK");

  const fetchInventory = async () => {
    try {
      const res = await fetch("/api/products?limit=50");
      const data = await res.json();
      if (data.success) {
        setProducts(data.data.products);
      }
    } catch {
      toast.error("Failed to load inventory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustModal || !adjustmentQty) return;

    try {
      const newStock = adjustModal.totalStock + Number(adjustmentQty);
      const res = await fetch(`/api/products/${adjustModal.slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ totalStock: Math.max(0, newStock) }),
      });

      if (res.ok) {
        toast.success(`Inventory updated for ${adjustModal.title}`);
        setAdjustModal(null);
        setAdjustmentQty("");
        fetchInventory();
      } else {
        toast.error("Failed to update stock");
      }
    } catch {
      toast.error("Network error");
    }
  };

  const exportCSV = () => {
    const headers = ["Product ID", "Title", "SKU", "Category", "Price", "Stock Level", "Status"];
    const rows = filteredProducts.map((p) => [
      p.id,
      `"${p.title.replace(/"/g, '""')}"`,
      p.sku || "N/A",
      p.category?.name || "General",
      p.price,
      p.totalStock,
      p.status,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `shopzen_inventory_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Inventory exported to CSV");
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase());
    if (filter === "LOW_STOCK") return matchesSearch && p.totalStock > 0 && p.totalStock <= 10;
    if (filter === "OUT_OF_STOCK") return matchesSearch && p.totalStock === 0;
    return matchesSearch;
  });

  const lowStockCount = products.filter((p) => p.totalStock > 0 && p.totalStock <= 10).length;
  const outOfStockCount = products.filter((p) => p.totalStock === 0).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            Inventory & Stock Ledger
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Real-time stock control, adjustment auditing, and replenishment alerts.
          </p>
        </div>

        <button
          onClick={exportCSV}
          className="inline-flex items-center gap-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-white px-4 py-2.5 text-xs font-bold shadow-md transition"
        >
          <Download className="w-4 h-4" />
          <span>Export Inventory CSV</span>
        </button>
      </div>

      {/* KPI filter tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={() => setFilter("ALL")}
          className={`p-4 rounded-2xl border text-left transition ${
            filter === "ALL"
              ? "border-blue-600 bg-blue-50/50 ring-2 ring-blue-100"
              : "border-gray-100 bg-white hover:border-gray-200"
          }`}
        >
          <p className="text-xs font-bold text-gray-500">Total Tracked Items</p>
          <p className="text-2xl font-black text-gray-950 mt-1">{products.length}</p>
        </button>

        <button
          onClick={() => setFilter("LOW_STOCK")}
          className={`p-4 rounded-2xl border text-left transition ${
            filter === "LOW_STOCK"
              ? "border-amber-600 bg-amber-50/50 ring-2 ring-amber-100"
              : "border-gray-100 bg-white hover:border-gray-200"
          }`}
        >
          <p className="text-xs font-bold text-amber-700 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            Low Stock Alerts
          </p>
          <p className="text-2xl font-black text-amber-950 mt-1">{lowStockCount}</p>
        </button>

        <button
          onClick={() => setFilter("OUT_OF_STOCK")}
          className={`p-4 rounded-2xl border text-left transition ${
            filter === "OUT_OF_STOCK"
              ? "border-red-600 bg-red-50/50 ring-2 ring-red-100"
              : "border-gray-100 bg-white hover:border-gray-200"
          }`}
        >
          <p className="text-xs font-bold text-red-700">Out of Stock</p>
          <p className="text-2xl font-black text-red-950 mt-1">{outOfStockCount}</p>
        </button>
      </div>

      {/* Search */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm flex items-center gap-3">
        <Search className="w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search products by title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full text-xs text-gray-900 focus:outline-none"
        />
      </div>

      {/* Inventory Table */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100">
              <tr>
                <th className="p-4">Product</th>
                <th className="p-4">Category</th>
                <th className="p-4">Available Units</th>
                <th className="p-4">Stock Health</th>
                <th className="p-4 text-right">Stock Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProducts.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50/60 transition">
                  <td className="p-4 font-bold text-gray-900 line-clamp-1 max-w-xs">
                    {p.title}
                  </td>
                  <td className="p-4 text-gray-600">{p.category?.name || "General"}</td>
                  <td className="p-4 font-black text-sm text-gray-950">{p.totalStock}</td>
                  <td className="p-4">
                    <span
                      className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                        p.totalStock > 10
                          ? "bg-emerald-50 text-emerald-700"
                          : p.totalStock > 0
                          ? "bg-amber-50 text-amber-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {p.totalStock > 10
                        ? "Optimal"
                        : p.totalStock > 0
                        ? "Low Stock"
                        : "Out of Stock"}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => setAdjustModal(p)}
                      className="px-3 py-1.5 rounded-lg border border-gray-200 text-blue-600 font-bold hover:bg-blue-50 text-xs transition"
                    >
                      Adjust Stock
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjust Stock Modal */}
      {adjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-sm">Adjust Inventory</h3>
              <button onClick={() => setAdjustModal(null)} className="text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-600">
              Product: <strong>{adjustModal.title}</strong>
              <br />
              Current Available Stock: <strong>{adjustModal.totalStock}</strong>
            </p>

            <form onSubmit={handleAdjustStock} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-gray-700">Stock Adjustment Quantity</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. +25 or -5"
                  value={adjustmentQty}
                  onChange={(e) => setAdjustmentQty(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 p-2 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700">Reason</label>
                <select
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 p-2 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="RESTOCK">Supplier Restock</option>
                  <option value="INVENTORY_COUNT">Manual Physical Count</option>
                  <option value="DAMAGED">Damaged / Expired</option>
                  <option value="RETURN">Customer Return Adjustment</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setAdjustModal(null)}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  Confirm Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
