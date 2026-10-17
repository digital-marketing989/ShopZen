"use client";

import Link from "next/link";
import {
  TrendingUp,
  ShoppingBag,
  Package,
  Users,
  Store,
  AlertTriangle,
  ArrowRight,
  Clock,
  IndianRupee,
  CheckCircle2,
} from "lucide-react";

interface AdminDashboardViewProps {
  stats: {
    totalRevenue: number;
    totalOrders: number;
    totalProducts: number;
    totalUsers: number;
    totalSellers: number;
  };
  recentOrders: any[];
  lowStockProducts: any[];
  revenueChart: { day: string; sales: number; orders: number }[];
}

export function AdminDashboardView({
  stats,
  recentOrders,
  lowStockProducts,
  revenueChart,
}: AdminDashboardViewProps) {
  const maxSales = Math.max(...revenueChart.map((c) => c.sales), 1);

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">
          Marketplace Executive Dashboard
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Real-time metrics, order throughput, revenue analytics, and system alerts.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Total Revenue
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-gray-950">
            ₹{stats.totalRevenue.toLocaleString("en-IN")}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+18.4% from last week</span>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Total Orders
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-gray-950">{stats.totalOrders}</p>
          <div className="flex items-center gap-1.5 text-xs text-blue-600 font-semibold">
            <span>Marketplace sales volume</span>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Catalog Products
            </span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-gray-950">{stats.totalProducts}</p>
          <div className="flex items-center gap-1.5 text-xs text-purple-600 font-semibold">
            <span>Across 10 categories</span>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Active Sellers
            </span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Store className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-gray-950">{stats.totalSellers}</p>
          <div className="flex items-center gap-1.5 text-xs text-amber-600 font-semibold">
            <span>Verified merchant stores</span>
          </div>
        </div>
      </div>

      {/* Revenue Chart Section */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-900 text-sm">
              Daily Sales Volume (Last 7 Days)
            </h3>
            <p className="text-xs text-gray-400">Aggregated revenue performance</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-gray-100 text-gray-700">
            INR Currency
          </span>
        </div>

        {/* Visual Bar Graph */}
        <div className="h-48 flex items-end justify-between gap-3 pt-6 px-2">
          {revenueChart.map((col, idx) => {
            const heightPct = Math.max(15, Math.round((col.sales / maxSales) * 100));

            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <div className="text-[10px] font-bold text-gray-600">
                  {col.sales > 0 ? `₹${col.sales}` : "₹0"}
                </div>
                <div
                  style={{ height: `${heightPct}%` }}
                  className="w-full max-w-[48px] rounded-t-lg bg-gradient-to-t from-blue-700 to-blue-500 hover:from-blue-600 hover:to-indigo-500 transition-all shadow-sm"
                />
                <span className="text-[11px] font-semibold text-gray-500">{col.day}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two Column Grid: Low Stock Alert & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Recent Orders (7 cols) */}
        <div className="lg:col-span-7 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <h3 className="font-bold text-gray-900 text-sm">Recent Orders</h3>
            <Link
              href="/admin/orders"
              className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
            >
              <span>Manage All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-gray-100">
            {recentOrders.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 italic">No recent orders yet</p>
            ) : (
              recentOrders.map((ord) => (
                <div key={ord.id} className="py-3.5 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold font-mono text-gray-900">{ord.orderNumber}</p>
                    <p className="text-gray-500 mt-0.5">
                      {ord.user?.name || "Customer"} · {new Date(ord.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-extrabold text-gray-900">
                      ₹{ord.total.toLocaleString("en-IN")}
                    </p>
                    <span className="inline-block mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                      {ord.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Low Stock Alerts (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Low Stock Alerts
            </h3>
            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
              Action Required
            </span>
          </div>

          <div className="divide-y divide-gray-100">
            {lowStockProducts.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 italic">All products well stocked</p>
            ) : (
              lowStockProducts.map((p) => (
                <div key={p.id} className="py-3 flex items-center justify-between text-xs">
                  <div className="pr-2">
                    <p className="font-semibold text-gray-900 line-clamp-1">{p.title}</p>
                    <p className="text-gray-400 mt-0.5">₹{p.price.toLocaleString("en-IN")}</p>
                  </div>
                  <span className="font-bold px-2.5 py-1 rounded-md bg-red-50 text-red-700 border border-red-200 text-xs">
                    {p.totalStock} left
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
