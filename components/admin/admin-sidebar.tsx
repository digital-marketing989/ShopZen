"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Tags,
  ShoppingBag,
  Users,
  Store,
  TicketPercent,
  ArrowLeft,
  Settings,
  ShieldAlert,
  CreditCard,
  Sliders,
  Flame,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Maha Sales", href: "/admin/sales", icon: Flame },
  { label: "Products", href: "/admin/products", icon: Package },
  { label: "Inventory", href: "/admin/inventory", icon: Settings },
  { label: "Orders", href: "/admin/orders", icon: ShoppingBag },
  { label: "Payments (Cashfree)", href: "/admin/payments", icon: CreditCard },
  { label: "Returns & Refunds", href: "/admin/returns", icon: ShieldAlert },
  { label: "Categories", href: "/admin/categories", icon: FolderTree },
  { label: "Brands", href: "/admin/brands", icon: Tags },
  { label: "Sellers", href: "/admin/sellers", icon: Store },
  { label: "Coupons", href: "/admin/coupons", icon: TicketPercent },
  { label: "Support Tickets", href: "/admin/tickets", icon: Users },
  { label: "Payment Settings", href: "/admin/settings/payments", icon: Sliders },
  { label: "Email Settings", href: "/admin/settings/email", icon: Settings },
  { label: "Newsletter", href: "/admin/subscribers", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 min-h-screen flex flex-col justify-between border-r border-slate-800 flex-shrink-0">
      <div>
        {/* Brand */}
        <div className="p-6 border-b border-slate-800">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white text-lg shadow-md">
              S
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-white">
                Shop<span className="text-blue-500">Zen</span>
              </span>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-blue-400">
                Admin Console
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-blue-600 text-white shadow-md shadow-blue-900/40"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Back link */}
      <div className="p-4 border-t border-slate-800">
        <Link
          href="/"
          className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white transition rounded-lg hover:bg-slate-800"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit to Customer Store</span>
        </Link>
      </div>
    </aside>
  );
}
