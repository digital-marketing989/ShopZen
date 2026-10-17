"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import {
  Sparkles,
  Clock,
  ArrowDown,
  ArrowRight,
  ShoppingBag,
  Info,
  Flame,
} from "lucide-react";
import { ProductCard } from "@/components/store/product-card";

interface SaleLandingViewProps {
  campaign: {
    id: string;
    name: string;
    slug: string;
    startsAt: string;
    endsAt: string;
    minDiscount: number;
    maxDiscount: number;
    isActive: boolean;
    showBanner: boolean;
    bannerText?: string | null;
    endsAtFormatted: string;
  } | null;
  serverTimeMs: number;
  initialProducts: any[];
  categories: any[];
}

export function SaleLandingView({
  campaign,
  serverTimeMs,
  initialProducts,
  categories,
}: SaleLandingViewProps) {
  const productsRef = useRef<HTMLDivElement>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<string>("discount_desc");
  const [priceFilter, setPriceFilter] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 12;

  // Clock sync
  const [clockOffset] = useState(() => (serverTimeMs ? serverTimeMs - Date.now() : 0));
  const [isEnded, setIsEnded] = useState(!campaign || !campaign.isActive);
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  useEffect(() => {
    if (!campaign || !campaign.isActive) {
      setIsEnded(true);
      return;
    }

    const endsAtMs = new Date(campaign.endsAt).getTime();

    const updateTimer = () => {
      const current = Date.now() + clockOffset;
      const diff = endsAtMs - current;

      if (diff <= 0) {
        setIsEnded(true);
        setTimeLeft(null);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    updateTimer();
    const id = setInterval(updateTimer, 1000);
    return () => clearInterval(id);
  }, [campaign, clockOffset]);

  const scrollToProducts = () => {
    productsRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Filter & sort
  const filteredProducts = useMemo(() => {
    let list = [...initialProducts];

    if (selectedCategory !== "ALL") {
      list = list.filter(
        (p) =>
          p.category?.slug === selectedCategory ||
          p.category?.id === selectedCategory ||
          p.categoryId === selectedCategory
      );
    }

    if (priceFilter === "UNDER_1000") {
      list = list.filter((p) => p.price < 1000);
    } else if (priceFilter === "1000_5000") {
      list = list.filter((p) => p.price >= 1000 && p.price <= 5000);
    } else if (priceFilter === "ABOVE_5000") {
      list = list.filter((p) => p.price > 5000);
    }

    if (sortBy === "discount_desc") {
      list.sort((a, b) => (b.discountPct || 0) - (a.discountPct || 0));
    } else if (sortBy === "price_asc") {
      list.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price_desc") {
      list.sort((a, b) => b.price - a.price);
    } else if (sortBy === "rating") {
      list.sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0));
    }

    return list;
  }, [initialProducts, selectedCategory, priceFilter, sortBy]);

  const totalPages = Math.ceil(filteredProducts.length / pageSize) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage]);

  const pad = (n: number) => String(n).padStart(2, "0");

  if (isEnded) {
    return (
      <div className="container mx-auto px-4 py-16 text-center max-w-xl">
        <div className="rounded-3xl border border-gray-200 bg-white p-10 shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto text-3xl">
            🪔
          </div>
          <h1 className="text-2xl font-black text-gray-900">This sale has ended</h1>
          <p className="text-sm text-gray-500">
            The Durga Puja Maha Sale is currently inactive. Normal store pricing has resumed. Stay tuned for upcoming festive events!
          </p>
          <div className="pt-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 text-sm shadow transition"
            >
              <span>Explore Store</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* 1. Festive Hero Banner with CSS Decorative Ornaments */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#6b0b0b] via-[#991b1b] to-[#b45309] text-white py-12 md:py-20 border-b-4 border-amber-400 shadow-xl">
        {/* Decorative background mandala & rings */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full border-[16px] border-amber-300/40 border-dashed animate-[spin_120s_linear_infinite]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full border-[8px] border-yellow-200/50 border-dotted" />
        </div>

        {/* Floating CSS diyas & ornaments */}
        <div className="container mx-auto px-4 relative z-10 text-center space-y-6 max-w-4xl">
          {/* Top festive pill */}
          <div className="inline-flex items-center gap-2 rounded-full bg-black/30 backdrop-blur-md px-4 py-1.5 border border-amber-400/40 text-amber-300 text-xs sm:text-sm font-black shadow-inner">
            <Sparkles className="w-4 h-4 text-yellow-300 fill-yellow-300 animate-pulse" />
            <span>FESTIVE SPECIAL · LIMITED PERIOD OFFER</span>
            <Sparkles className="w-4 h-4 text-yellow-300 fill-yellow-300 animate-pulse" />
          </div>

          {/* Main Title */}
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-white drop-shadow-md">
              Durga Puja <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400">Maha Sale</span>
            </h1>
            <p className="text-xl sm:text-3xl font-extrabold text-amber-200 tracking-wide">
              {campaign?.minDiscount || 85}% to {campaign?.maxDiscount || 95}% OFF
            </p>
            <p className="text-xs sm:text-sm text-amber-100/90 font-medium max-w-xl mx-auto">
              Mega festive celebrations on ShopZen! Unbeatable discounts on smartphones, electronics, fashion, and home essentials.
            </p>
          </div>

          {/* Live Countdown Clock */}
          {timeLeft && (
            <div className="inline-block bg-black/40 backdrop-blur-md rounded-2xl p-4 border border-amber-400/40 shadow-2xl">
              <div className="text-[11px] font-bold text-amber-300 uppercase tracking-widest mb-2 flex items-center justify-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Offer Ends In ({campaign?.endsAtFormatted || "22 Oct"})</span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 text-white">
                <div className="flex flex-col items-center bg-white/10 rounded-xl px-2.5 sm:px-3.5 py-1.5 border border-white/10 min-w-[50px] sm:min-w-[64px]">
                  <span className="text-xl sm:text-3xl font-black font-mono text-amber-300">
                    {pad(timeLeft.days)}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-amber-100 font-bold">Days</span>
                </div>
                <span className="text-xl font-bold text-amber-300">:</span>
                <div className="flex flex-col items-center bg-white/10 rounded-xl px-2.5 sm:px-3.5 py-1.5 border border-white/10 min-w-[50px] sm:min-w-[64px]">
                  <span className="text-xl sm:text-3xl font-black font-mono text-amber-300">
                    {pad(timeLeft.hours)}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-amber-100 font-bold">Hours</span>
                </div>
                <span className="text-xl font-bold text-amber-300">:</span>
                <div className="flex flex-col items-center bg-white/10 rounded-xl px-2.5 sm:px-3.5 py-1.5 border border-white/10 min-w-[50px] sm:min-w-[64px]">
                  <span className="text-xl sm:text-3xl font-black font-mono text-amber-300">
                    {pad(timeLeft.minutes)}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-amber-100 font-bold">Mins</span>
                </div>
                <span className="text-xl font-bold text-amber-300">:</span>
                <div className="flex flex-col items-center bg-white/10 rounded-xl px-2.5 sm:px-3.5 py-1.5 border border-white/10 min-w-[50px] sm:min-w-[64px]">
                  <span className="text-xl sm:text-3xl font-black font-mono text-amber-300 animate-pulse">
                    {pad(timeLeft.seconds)}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-amber-100 font-bold">Secs</span>
                </div>
              </div>
            </div>
          )}

          {/* CTA Button that scrolls down */}
          <div className="pt-2">
            <button
              onClick={scrollToProducts}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-300 hover:from-amber-300 hover:to-yellow-200 text-red-950 font-black text-sm sm:text-base px-8 py-3.5 shadow-2xl transition transform hover:scale-105 active:scale-95"
            >
              <span>Shop Now</span>
              <ArrowDown className="w-4 h-4 stroke-[3]" />
            </button>
          </div>

          {/* Compliance Disclaimer Badge */}
          <div className="text-[11px] text-amber-200/80 max-w-lg mx-auto flex items-center justify-center gap-1.5 pt-2">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>
              Discounts are applied directly to the listed MRP and vary by product between {campaign?.minDiscount || 85}% and {campaign?.maxDiscount || 95}%. MRP is never inflated.
            </span>
          </div>
        </div>
      </section>

      {/* 2. Interactive Products Section */}
      <div ref={productsRef} className="container mx-auto px-4 space-y-6 pt-4">
        {/* Category Chips Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => {
              setSelectedCategory("ALL");
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-full text-xs font-bold transition whitespace-nowrap ${
              selectedCategory === "ALL"
                ? "bg-red-700 text-white shadow-md shadow-red-900/30"
                : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            All Maha Sale Deals ({initialProducts.length})
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setSelectedCategory(c.slug);
                setCurrentPage(1);
              }}
              className={`px-4 py-2 rounded-full text-xs font-bold transition whitespace-nowrap ${
                selectedCategory === c.slug
                  ? "bg-red-700 text-white shadow-md shadow-red-900/30"
                  : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Filter & Sort Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-gray-200 shadow-sm text-xs">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-red-600 fill-red-600" />
            <span className="font-bold text-gray-900">
              Showing {filteredProducts.length} Maha Sale products
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Price Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500 font-medium">Price:</span>
              <select
                value={priceFilter}
                onChange={(e) => {
                  setPriceFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="rounded-lg border border-gray-200 px-2.5 py-1.5 font-semibold text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-red-500"
              >
                <option value="ALL">All Prices</option>
                <option value="UNDER_1000">Under ₹1,000</option>
                <option value="1000_5000">₹1,000 – ₹5,000</option>
                <option value="ABOVE_5000">Above ₹5,000</option>
              </select>
            </div>

            {/* Sort Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500 font-medium">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setCurrentPage(1);
                }}
                className="rounded-lg border border-gray-200 px-2.5 py-1.5 font-semibold text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-red-500"
              >
                <option value="discount_desc">Highest Discount (85%–95%)</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="rating">Top Rated</option>
              </select>
            </div>
          </div>
        </div>

        {/* 3. Products Grid */}
        {paginatedProducts.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
            <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-gray-900">No products found</h3>
            <p className="text-xs text-gray-500 mt-1">
              Try switching categories or clearing the price filters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {paginatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}

        {/* 4. Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-6">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-700 disabled:opacity-40 hover:bg-gray-50"
            >
              Previous
            </button>
            <span className="text-xs font-semibold text-gray-600 px-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-700 disabled:opacity-40 hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        )}

        {/* 5. Trust & Terms Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center md:text-left">
            <h4 className="font-extrabold text-amber-900 text-sm">
              Shop with 100% Festive Confidence
            </h4>
            <p className="text-xs text-amber-800/80">
              Free delivery above ₹499 · Genuine MRP guarantee · Strict margin quality standards
            </p>
          </div>
          <Link
            href="/sale-terms"
            className="text-xs font-bold text-red-700 hover:text-red-800 underline underline-offset-4 whitespace-nowrap"
          >
            Read Sale Terms & Conditions →
          </Link>
        </div>
      </div>
    </div>
  );
}
