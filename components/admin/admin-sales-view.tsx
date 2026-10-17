"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Sparkles,
  Flame,
  Calendar,
  Percent,
  AlertTriangle,
  CheckCircle2,
  Pause,
  Play,
  Clock,
  Save,
  Search,
  Eye,
  ShieldAlert,
  Layers,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

interface AdminSalesViewProps {
  initialCampaigns: any[];
  initialActiveCampaign: any;
  initialCategories: any[];
  initialProducts: any[];
  initialBlockSaleBelowCost: boolean;
}

export function AdminSalesView({
  initialCampaigns,
  initialActiveCampaign,
  initialCategories,
  initialProducts,
  initialBlockSaleBelowCost,
}: AdminSalesViewProps) {
  const [campaigns, setCampaigns] = useState<any[]>(initialCampaigns);
  const [activeCampaign, setActiveCampaign] = useState<any>(initialActiveCampaign);
  const [categories, setCategories] = useState<any[]>(initialCategories);
  const [products, setProducts] = useState<any[]>(initialProducts);
  const [blockSaleBelowCost, setBlockSaleBelowCost] = useState<boolean>(initialBlockSaleBelowCost);

  // Form states for campaign editing
  const [name, setName] = useState(initialActiveCampaign?.name || "Durga Puja Maha Sale");
  const [slug, setSlug] = useState(initialActiveCampaign?.slug || "durga-puja-maha-sale");
  const [minDiscount, setMinDiscount] = useState<number>(initialActiveCampaign?.minDiscount || 85);
  const [maxDiscount, setMaxDiscount] = useState<number>(initialActiveCampaign?.maxDiscount || 95);
  const [startsAt, setStartsAt] = useState(
    initialActiveCampaign?.startsAt
      ? new Date(initialActiveCampaign.startsAt).toISOString().slice(0, 16)
      : new Date().toISOString().slice(0, 16)
  );
  const [endsAt, setEndsAt] = useState(
    initialActiveCampaign?.endsAt
      ? new Date(initialActiveCampaign.endsAt).toISOString().slice(0, 16)
      : new Date("2026-10-22T23:59:59+05:30").toISOString().slice(0, 16)
  );
  const [isActive, setIsActive] = useState<boolean>(initialActiveCampaign?.isActive ?? true);
  const [showBanner, setShowBanner] = useState<boolean>(initialActiveCampaign?.showBanner ?? true);
  const [stackWithCoupons, setStackWithCoupons] = useState<boolean>(
    initialActiveCampaign?.stackWithCoupons ?? false
  );
  const [bannerText, setBannerText] = useState(
    initialActiveCampaign?.bannerText || "Durga Puja Maha Sale: Up to 95% OFF on everything"
  );

  const [savingCampaign, setSavingCampaign] = useState(false);
  const [updatingSettings, setUpdatingSettings] = useState(false);

  // Override section states
  const [productSearch, setProductSearch] = useState("");
  const [filterBelowCostOnly, setFilterBelowCostOnly] = useState(false);
  const [bulkDiscount, setBulkDiscount] = useState<number | "">("");
  const [selectedCategoryOverride, setSelectedCategoryOverride] = useState("");
  const [categoryDiscount, setCategoryDiscount] = useState<number | "">("");

  // Product override map state for optimistic inputs
  const [productOverrides, setProductOverrides] = useState<Record<string, number | "">>({});

  useEffect(() => {
    const map: Record<string, number | ""> = {};
    products.forEach((p) => {
      map[p.id] = p.saleDiscountOverride !== null && p.saleDiscountOverride !== undefined ? p.saleDiscountOverride : "";
    });
    setProductOverrides(map);
  }, [products]);

  // Live countdown calculation for header preview
  const [previewTimeLeft, setPreviewTimeLeft] = useState({
    days: 5,
    hours: 8,
    minutes: 42,
    seconds: 19,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff > 0) {
        setPreviewTimeLeft({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((diff / 1000 / 60) % 60),
          seconds: Math.floor((diff / 1000) % 60),
        });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [endsAt]);

  const reloadData = async () => {
    try {
      const res = await fetch("/api/admin/sales");
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data.campaigns || []);
        if (data.activeCampaign) {
          setActiveCampaign(data.activeCampaign);
          setName(data.activeCampaign.name);
          setSlug(data.activeCampaign.slug);
          setMinDiscount(data.activeCampaign.minDiscount);
          setMaxDiscount(data.activeCampaign.maxDiscount);
          setStartsAt(new Date(data.activeCampaign.startsAt).toISOString().slice(0, 16));
          setEndsAt(new Date(data.activeCampaign.endsAt).toISOString().slice(0, 16));
          setIsActive(data.activeCampaign.isActive);
          setShowBanner(data.activeCampaign.showBanner);
          setStackWithCoupons(data.activeCampaign.stackWithCoupons);
          setBannerText(data.activeCampaign.bannerText || "");
        }
        setCategories(data.categories || []);
        setProducts(data.products || []);
        setBlockSaleBelowCost(Boolean(data.blockSaleBelowCost));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Save campaign updates
  const handleSaveCampaign = async (customOverrides?: Partial<any>) => {
    if (!activeCampaign?.id) return;
    setSavingCampaign(true);

    try {
      const payload = {
        id: activeCampaign.id,
        name,
        slug,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        minDiscount: Number(minDiscount),
        maxDiscount: Number(maxDiscount),
        isActive: customOverrides?.isActive !== undefined ? customOverrides.isActive : isActive,
        showBanner,
        stackWithCoupons,
        bannerText,
        ...customOverrides,
      };

      const res = await fetch("/api/admin/sales", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update campaign");

      toast.success("Campaign settings saved and logged to AuditLog!");
      await reloadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save campaign");
    } finally {
      setSavingCampaign(false);
    }
  };

  // Toggle Pause/Resume
  const handleTogglePause = async () => {
    const nextState = !isActive;
    setIsActive(nextState);
    await handleSaveCampaign({ isActive: nextState });
  };

  // End Campaign now
  const handleEndCampaignNow = async () => {
    if (!confirm("Are you sure you want to end this sale campaign immediately?")) return;
    const nowIso = new Date().toISOString();
    setEndsAt(nowIso.slice(0, 16));
    setIsActive(false);
    await handleSaveCampaign({ endsAt: nowIso, isActive: false });
  };

  // Toggle "Block sale below cost"
  const handleToggleBlockSaleBelowCost = async () => {
    const nextVal = !blockSaleBelowCost;
    setBlockSaleBelowCost(nextVal);
    setUpdatingSettings(true);

    try {
      const res = await fetch("/api/admin/sales/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockSaleBelowCost: nextVal }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update setting");

      toast.success(
        nextVal
          ? "Margin Guard Activated: Sale prices below cost will be clamped!"
          : "Margin Guard Disabled: Regular campaign discounts apply."
      );
      await reloadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle setting");
    } finally {
      setUpdatingSettings(false);
    }
  };

  // Save product override
  const handleSaveProductOverride = async (productId: string) => {
    const overrideVal = productOverrides[productId];
    try {
      const res = await fetch("/api/admin/sales/override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "PRODUCT",
          id: productId,
          override: overrideVal === "" ? null : Number(overrideVal),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save override");

      toast.success("Product discount override updated!");
      await reloadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save product override");
    }
  };

  // Save category override
  const handleSaveCategoryOverride = async () => {
    if (!selectedCategoryOverride) {
      toast.error("Please select a category");
      return;
    }

    try {
      const res = await fetch("/api/admin/sales/override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "CATEGORY",
          id: selectedCategoryOverride,
          override: categoryDiscount === "" ? null : Number(categoryDiscount),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update category override");

      toast.success("Category discount override saved!");
      setCategoryDiscount("");
      await reloadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update category override");
    }
  };

  // Bulk Apply to All Products
  const handleBulkApply = async () => {
    const val = bulkDiscount === "" ? null : Number(bulkDiscount);
    if (val !== null && (val < 1 || val > 99)) {
      toast.error("Discount must be between 1% and 99%");
      return;
    }

    if (!confirm(`Apply ${val !== null ? `${val}% discount` : "default range"} to ALL products?`)) return;

    try {
      const res = await fetch("/api/admin/sales/override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "BULK_ALL",
          override: val,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to bulk apply");

      toast.success(`Updated ${data.count} products successfully!`);
      setBulkDiscount("");
      await reloadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to bulk apply");
    }
  };

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        !productSearch ||
        p.title?.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.slug?.toLowerCase().includes(productSearch.toLowerCase());
      const matchesBelowCost = !filterBelowCostOnly || p.isBelowCost;
      return matchesSearch && matchesBelowCost;
    });
  }, [products, productSearch, filterBelowCostOnly]);

  const belowCostCount = products.filter((p) => p.isBelowCost).length;
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      {/* 1. Header & Live Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-red-600 text-white shadow-md">
              <Flame className="w-5 h-5 animate-pulse" />
            </span>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              Maha Sale & Campaign Control
            </h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Manage the Durga Puja Maha Sale (85%–95%), header offer bar, margin guard, and overrides ({campaigns.length} total campaigns).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={reloadData}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleTogglePause}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition ${
              isActive
                ? "bg-amber-500 hover:bg-amber-600 text-white"
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
            }`}
          >
            {isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isActive ? "Pause Sale" : "Resume Sale"}</span>
          </button>

          <button
            onClick={handleEndCampaignNow}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm transition"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>End Campaign Now</span>
          </button>
        </div>
      </div>

      {/* 2. Live Header Offer Bar Preview */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-blue-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-900">
              Live Preview: Storefront Header Offer Bar
            </h2>
          </div>
          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
            {isActive && showBanner ? "Banner Active on Storefront" : "Banner Hidden / Inactive"}
          </span>
        </div>

        {/* The Live Rendered Bar */}
        <div className="rounded-xl overflow-hidden shadow-md border border-amber-400/40 bg-gradient-to-r from-[#7a0c0c] via-[#b91c1c] to-[#b45309] text-white p-3">
          <div className="flex items-center justify-between gap-3 text-xs sm:text-sm">
            <div className="flex items-center flex-wrap gap-2 truncate">
              <span className="inline-flex items-center gap-1 font-black bg-gradient-to-r from-amber-300 to-yellow-400 text-red-950 px-2 py-0.5 rounded-full text-[10px] tracking-wider uppercase">
                <Sparkles className="w-3 h-3 fill-red-950 text-red-950" />
                Maha Sale
              </span>
              <span className="font-bold truncate text-yellow-100">
                🪔 {bannerText || "Durga Puja Maha Sale: Up to 95% OFF on everything"}
              </span>
              <span className="text-amber-200/80 font-normal text-xs">
                (Ends 22 Oct)
              </span>
              <div className="flex items-center gap-1 bg-black/30 px-2 py-0.5 rounded text-yellow-200 font-mono font-bold text-xs border border-amber-400/30">
                <Clock className="w-3 h-3 text-amber-300" />
                <span>{previewTimeLeft.days}d</span>:
                <span>{pad(previewTimeLeft.hours)}h</span>:
                <span>{pad(previewTimeLeft.minutes)}m</span>:
                <span className="text-white animate-pulse">{pad(previewTimeLeft.seconds)}s</span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-400 to-yellow-400 text-red-950 font-black text-xs px-3 py-1 rounded-full shadow-sm">
                <span>Shop Now</span>
                <ChevronRight className="w-3 h-3 stroke-[3]" />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Margin Guard Alert & Toggle */}
      <div className={`rounded-2xl border p-5 shadow-sm space-y-4 ${
        belowCostCount > 0 ? "bg-red-50/70 border-red-200" : "bg-emerald-50/70 border-emerald-200"
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-xl text-white ${belowCostCount > 0 ? "bg-red-600" : "bg-emerald-600"}`}>
              {belowCostCount > 0 ? <AlertTriangle className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm text-gray-900">
                  Margin Guard Status: {belowCostCount > 0 ? `${belowCostCount} Products Below Cost Price` : "All Margins Safe"}
                </h3>
                {blockSaleBelowCost && (
                  <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                    Auto-Clamping Enabled
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {belowCostCount > 0
                  ? blockSaleBelowCost
                    ? "Margin Guard is currently clamping discounts on below-cost items so price stays at or above cost price."
                    : "Warning: Some products have sale prices below cost price. Enable 'Block sale below cost' to clamp their price."
                  : "All products are priced safely at or above their cost prices."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleToggleBlockSaleBelowCost}
              disabled={updatingSettings}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs shadow-md transition ${
                blockSaleBelowCost
                  ? "bg-emerald-700 hover:bg-emerald-800 text-white"
                  : "bg-gray-900 hover:bg-gray-800 text-white"
              }`}
            >
              <span>{blockSaleBelowCost ? "Disable Margin Guard" : "Block Sale Below Cost"}</span>
              <CheckCircle2 className={`w-4 h-4 ${blockSaleBelowCost ? "text-emerald-300" : "text-gray-400"}`} />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Campaign Parameters & Admin Form */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            Campaign Parameters (Durga Puja Maha Sale)
          </h2>
          <span className="text-xs text-gray-400">
            Dates stored in UTC, configured in IST
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block font-bold text-gray-700 mb-1">Campaign Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-gray-200 p-2.5 focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Slug</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full rounded-xl border border-gray-200 p-2.5 focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Starts At (IST / Local)</label>
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="w-full rounded-xl border border-gray-200 p-2.5 focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Ends At (IST: 22 Oct 23:59:59)</label>
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="w-full rounded-xl border border-gray-200 p-2.5 focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Min Discount %</label>
            <input
              type="number"
              min={1}
              max={99}
              value={minDiscount}
              onChange={(e) => setMinDiscount(Number(e.target.value))}
              className="w-full rounded-xl border border-gray-200 p-2.5 focus:ring-2 focus:ring-blue-500 font-bold"
            />
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Max Discount %</label>
            <input
              type="number"
              min={1}
              max={99}
              value={maxDiscount}
              onChange={(e) => setMaxDiscount(Number(e.target.value))}
              className="w-full rounded-xl border border-gray-200 p-2.5 focus:ring-2 focus:ring-blue-500 font-bold"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block font-bold text-gray-700 mb-1">Header Bar Text</label>
            <input
              type="text"
              value={bannerText}
              onChange={(e) => setBannerText(e.target.value)}
              className="w-full rounded-xl border border-gray-200 p-2.5 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Toggles */}
        <div className="flex flex-wrap items-center gap-6 pt-2 text-xs font-semibold text-gray-700 border-t border-gray-100">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
            />
            <span>Campaign Active (Storewide Discounts Live)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showBanner}
              onChange={(e) => setShowBanner(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
            />
            <span>Show Sticky Header Bar</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={stackWithCoupons}
              onChange={(e) => setStackWithCoupons(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
            />
            <span>Allow Coupon Stacking (Default: Off)</span>
          </label>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={() => handleSaveCampaign()}
            disabled={savingCampaign}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{savingCampaign ? "Saving to Database..." : "Save Campaign Settings"}</span>
          </button>
        </div>
      </div>

      {/* 5. Overrides & Bulk Operations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bulk Apply */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            Bulk Apply To All Products
          </h3>
          <p className="text-xs text-gray-500">
            Set an identical fixed discount override across all products in the catalog (or leave blank to clear overrides).
          </p>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={99}
              placeholder="e.g. 90 (% off)"
              value={bulkDiscount}
              onChange={(e) => setBulkDiscount(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-40 rounded-xl border border-gray-200 p-2.5 text-xs font-bold focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleBulkApply}
              className="px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs shadow-sm transition"
            >
              Apply to All Products
            </button>
          </div>
        </div>

        {/* Per-Category Override */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 flex items-center gap-2">
            <Percent className="w-4 h-4 text-blue-600" />
            Per-Category Discount Override
          </h3>
          <p className="text-xs text-gray-500">
            Override discount for all products belonging to a specific category.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedCategoryOverride}
              onChange={(e) => setSelectedCategoryOverride(e.target.value)}
              className="rounded-xl border border-gray-200 p-2.5 text-xs font-medium focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Select Category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.saleDiscountOverride ? `(Current: ${c.saleDiscountOverride}%)` : ""}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              max={99}
              placeholder="% discount"
              value={categoryDiscount}
              onChange={(e) => setCategoryDiscount(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-28 rounded-xl border border-gray-200 p-2.5 text-xs font-bold focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSaveCategoryOverride}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition"
            >
              Set Category Override
            </button>
          </div>
        </div>
      </div>

      {/* 6. Per-Product Override Table with Margin Guard Warnings */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-gray-100">
          <div>
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <span>Catalog Products & Margin Guard Table</span>
              <span className="text-xs font-bold text-gray-400">({filteredProducts.length} items)</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Red alerts show when effective sale price is below product cost price.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search products..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <label className="flex items-center gap-1.5 text-xs font-bold text-red-700 cursor-pointer bg-red-50 px-2.5 py-1.5 rounded-xl border border-red-200">
              <input
                type="checkbox"
                checked={filterBelowCostOnly}
                onChange={(e) => setFilterBelowCostOnly(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-red-600"
              />
              <span>Below Cost Only ({belowCostCount})</span>
            </label>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Product</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Stored MRP</th>
                <th className="py-2.5 px-3">Cost Price</th>
                <th className="py-2.5 px-3">Sale Price</th>
                <th className="py-2.5 px-3">Effective %</th>
                <th className="py-2.5 px-3">Margin Status</th>
                <th className="py-2.5 px-3">Override %</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {filteredProducts.map((p) => {
                const currentVal = productOverrides[p.id] ?? "";
                return (
                  <tr key={p.id} className="hover:bg-gray-50/80 transition">
                    <td className="py-3 px-3">
                      <span className="font-bold text-gray-900 line-clamp-1">{p.title}</span>
                      <span className="text-[10px] text-gray-400 font-mono">{p.slug}</span>
                    </td>
                    <td className="py-3 px-3 text-gray-500">
                      {p.category?.name || "General"}
                    </td>
                    <td className="py-3 px-3 font-semibold text-gray-600">
                      ₹{p.mrp?.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 px-3 font-semibold text-gray-600">
                      {p.costPrice ? `₹${p.costPrice.toLocaleString("en-IN")}` : "—"}
                    </td>
                    <td className="py-3 px-3 font-bold text-emerald-700">
                      ₹{p.effectiveSalePrice?.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 px-3 font-bold text-red-600">
                      {p.effectiveDiscount}% OFF
                    </td>
                    <td className="py-3 px-3">
                      {p.isBelowCost ? (
                        <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                          <AlertTriangle className="w-3 h-3 text-red-600" />
                          Price Below Cost!
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          Safe Margin
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <input
                        type="number"
                        min={1}
                        max={99}
                        placeholder="Auto"
                        value={currentVal}
                        onChange={(e) =>
                          setProductOverrides({
                            ...productOverrides,
                            [p.id]: e.target.value === "" ? "" : Number(e.target.value),
                          })
                        }
                        className="w-16 rounded-lg border border-gray-200 p-1 text-xs font-bold text-center focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleSaveProductOverride(p.id)}
                        className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] shadow-xs transition"
                      >
                        Save
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
