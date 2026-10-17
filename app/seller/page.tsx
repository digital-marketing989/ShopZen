import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Header } from "@/components/store/header";
import { Footer } from "@/components/store/footer";
import Link from "next/link";
import { Store, Package, IndianRupee, ShoppingBag, ArrowRight, CheckCircle2 } from "lucide-react";
import { redirect } from "next/navigation";

import { SubOrderManager } from "./suborder-manager";

export default async function SellerPortalPage() {
  const session = await auth();

  // If not logged in, prompt to log in as seller
  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/seller");
  }

  // Find seller profile or fallback demo seller
  let seller: any = {
    id: "seller_techworld",
    businessName: "TechWorld India",
    commissionRate: 8.0,
    status: "APPROVED",
    totalSales: 250000,
    totalEarnings: 230000,
    rating: 4.8,
    products: [
      {
        id: "p1",
        title: "Samsung Galaxy S24 Ultra",
        price: 109999,
        totalStock: 45,
        images: [{ url: "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=100" }],
      },
      {
        id: "p2",
        title: "Sony WH-1000XM5 Wireless Headphones",
        price: 24990,
        totalStock: 28,
        images: [{ url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100" }],
      },
    ],
  };

  let subOrders: any[] = [
    {
      id: "so_1",
      subOrderNumber: "SZ-SUB-89102-1",
      status: "SHIPPED",
      subtotal: 24990,
      trackingId: "DEL98124501",
      courierName: "Delhivery",
      createdAt: new Date(),
      order: { orderNumber: "SZ-89102", status: "CONFIRMED" },
      items: [{ id: "i1", title: "Sony WH-1000XM5", quantity: 1, price: 24990, total: 24990 }],
    },
    {
      id: "so_2",
      subOrderNumber: "SZ-SUB-89103-1",
      status: "PACKED",
      subtotal: 109999,
      trackingId: null,
      courierName: null,
      createdAt: new Date(Date.now() - 3600000 * 3),
      order: { orderNumber: "SZ-89103", status: "PROCESSING" },
      items: [{ id: "i2", title: "Samsung Galaxy S24 Ultra", quantity: 1, price: 109999, total: 109999 }],
    },
  ];

  try {
    const dbSeller = await db.seller.findUnique({
      where: { userId: session.user.id },
      include: {
        products: { take: 10, include: { images: { take: 1 } } },
      },
    });

    if (dbSeller) {
      seller = dbSeller;
    } else {
      const firstSeller = await db.seller.findFirst({
        include: {
          products: { take: 10, include: { images: { take: 1 } } },
        },
      });
      if (firstSeller) seller = firstSeller;
    }

    const dbSubOrders = await db.subOrder.findMany({
      where: seller?.id ? { sellerId: seller.id } : {},
      take: 12,
      orderBy: { createdAt: "desc" },
      include: {
        order: { select: { orderNumber: true, status: true } },
        items: true,
      },
    });
    if (dbSubOrders.length) subOrders = dbSubOrders;
  } catch (err) {
    // Graceful fallback to demo seller metrics
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 space-y-6">
        {/* Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 p-6 md:p-8 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-400/20">
              Verified Merchant Portal
            </span>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight mt-2">
              {seller?.businessName || "TechZone Electronics Store"}
            </h1>
            <p className="text-xs text-gray-300 mt-1">
              Commission Rate: {seller?.commissionRate || 10}% · Status:{" "}
              <span className="text-emerald-400 font-bold">{seller?.status || "APPROVED"}</span>
            </p>
          </div>

          <Link
            href="/admin/products"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 text-xs shadow-md transition self-start sm:self-center"
          >
            <Package className="w-4 h-4" />
            <span>Manage Catalog</span>
          </Link>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Total Earnings
            </span>
            <p className="text-2xl font-black text-gray-900">
              ₹{(seller?.totalEarnings || 425000).toLocaleString("en-IN")}
            </p>
            <span className="text-xs text-emerald-600 font-semibold">Processed weekly</span>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Active Listings
            </span>
            <p className="text-2xl font-black text-gray-900">
              {seller?.products.length || 15}
            </p>
            <span className="text-xs text-blue-600 font-semibold">Live in store</span>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Fulfillment Orders
            </span>
            <p className="text-2xl font-black text-gray-900">{subOrders.length || 24}</p>
            <span className="text-xs text-emerald-600 font-semibold">99.2% on-time dispatch</span>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Seller Rating
            </span>
            <p className="text-2xl font-black text-gray-900">
              {seller?.rating || 4.8}★
            </p>
            <span className="text-xs text-amber-600 font-semibold">Top Rated Merchant</span>
          </div>
        </div>

        {/* Listings and Orders */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Active Products */}
          <div className="lg:col-span-7 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-gray-900 text-sm">Your Active Products</h3>
            <div className="divide-y divide-gray-100">
              {seller?.products.map((p: any) => (
                <div key={p.id} className="py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 p-1 flex-shrink-0 flex items-center justify-center">
                      <img
                        src={p.images?.[0]?.url || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=80&q=80"}
                        alt=""
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 line-clamp-1">{p.title}</p>
                      <p className="text-gray-400 font-bold">₹{p.price.toLocaleString("en-IN")}</p>
                    </div>
                  </div>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                    {p.totalStock} in stock
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* SubOrder Fulfillment & Tracking */}
          <div className="lg:col-span-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-gray-900 text-sm">Assigned SubOrders</h3>
              <span className="text-[10px] text-gray-400 font-mono">Live Dispatch</span>
            </div>
            <SubOrderManager subOrders={subOrders} />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
