"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  Timer,
  ChevronRight,
  TrendingUp,
  Percent,
  Flame,
  ArrowRight,
  ChevronLeft,
} from "lucide-react";
import { ProductCard } from "@/components/store/product-card";

interface HomeViewProps {
  categories: any[];
  flashSaleProducts: any[];
  featuredProducts: any[];
  electronicsProducts: any[];
  fashionProducts: any[];
  saleCampaign?: any;
  mahaSaleProducts?: any[];
}

const HERO_SLIDES = [
  {
    id: 1,
    title: "Mega Electronics Fest",
    subtitle: "Up to 60% OFF on Flagship Smartphones, Laptops & Audio",
    badge: "Big Festive Offer",
    cta: "Explore Electronics",
    link: "/category/electronics",
    gradient: "from-blue-900 via-indigo-900 to-slate-900",
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80",
  },
  {
    id: 2,
    title: "Fashion & Wardrobe Upgrade",
    subtitle: "Minimum 40% OFF on Top International & Designer Brands",
    badge: "Trending Styles",
    cta: "Shop Fashion",
    link: "/category/fashion",
    gradient: "from-purple-900 via-pink-900 to-rose-950",
    image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&q=80",
  },
  {
    id: 3,
    title: "Next-Gen Smartphones",
    subtitle: "Experience 5G Speed, Pro Cameras & Massive Battery Life",
    badge: "Brand Launches",
    cta: "View Mobiles",
    link: "/category/mobiles-tablets",
    gradient: "from-cyan-950 via-teal-900 to-slate-950",
    image: "https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=800&q=80",
  },
];

export function HomeView({
  categories,
  flashSaleProducts,
  featuredProducts,
  electronicsProducts,
  fashionProducts,
  saleCampaign,
  mahaSaleProducts,
}: HomeViewProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Flash sale countdown timer (e.g. 14 hours 28 mins 12 secs)
  const [timeLeft, setTimeLeft] = useState({
    hours: 14,
    minutes: 36,
    seconds: 45,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 24, minutes: 0, seconds: 0 };
      });
    }, 1000);

    const slideTimer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 5000);

    return () => {
      clearInterval(timer);
      clearInterval(slideTimer);
    };
  }, []);

  const slide = HERO_SLIDES[currentSlide];

  return (
    <div className="bg-gray-50 min-h-screen pb-16">
      {/* 1. Category Quick Strip */}
      <div className="bg-white border-b border-gray-200 py-3 shadow-sm overflow-x-auto scrollbar-none">
        <div className="container mx-auto px-4 flex items-center justify-between min-w-[960px] gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/category/${cat.slug}`}
              className="flex flex-col items-center gap-1.5 group min-w-[80px]"
            >
              <div className="w-14 h-14 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center p-2 group-hover:scale-105 group-hover:border-blue-500 group-hover:shadow-md transition-all">
                <img
                  src={
                    cat.image ||
                    "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=150&q=80"
                  }
                  alt={cat.name}
                  className="w-10 h-10 object-contain rounded-full"
                />
              </div>
              <span className="text-xs font-semibold text-gray-700 group-hover:text-blue-600 transition text-center line-clamp-1">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </div>

      <div className="container mx-auto px-4 pt-4 space-y-6">
        {/* Festive Homepage Hero Banner */}
        {saleCampaign?.isActive && (
          <div className="relative overflow-hidden rounded-2xl shadow-xl bg-gradient-to-r from-[#700b0b] via-[#991b1b] to-[#b45309] text-white p-6 md:p-10 border-2 border-amber-400/50">
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-3 max-w-xl text-center md:text-left">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-black/30 backdrop-blur-md px-3.5 py-1 text-xs font-black text-amber-300 border border-amber-400/40">
                  <Sparkles className="w-3.5 h-3.5 fill-amber-300 text-amber-300 animate-pulse" />
                  DURGA PUJA MAHA CELEBRATION
                </span>
                <h2 className="text-2xl md:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
                  Durga Puja <span className="text-amber-300">Maha Sale</span>
                </h2>
                <p className="text-sm md:text-base text-amber-100/90 font-medium">
                  {saleCampaign.bannerText || "Up to 95% OFF on everything"} · Authentic MRP struck through, guaranteed authentic discounts.
                </p>
                <div className="pt-1">
                  <Link
                    href="/sale"
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-red-950 font-black px-6 py-3 text-sm shadow-xl transition transform hover:scale-105 active:scale-95"
                  >
                    <span>Shop The Maha Sale</span>
                    <ArrowRight className="w-4 h-4 stroke-[3]" />
                  </Link>
                </div>
              </div>
              <div className="bg-black/30 backdrop-blur-md rounded-2xl p-5 border border-amber-400/30 text-center shrink-0 w-full md:w-auto">
                <div className="text-[11px] font-bold text-amber-300 uppercase tracking-widest mb-1.5 flex items-center justify-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span>Mega Festive Deals</span>
                </div>
                <div className="text-3xl md:text-4xl font-black text-white font-mono">
                  {saleCampaign.minDiscount || 85}% - {saleCampaign.maxDiscount || 95}%
                </div>
                <div className="text-xs text-amber-200 mt-1 font-semibold">
                  OFF On Every Product
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. Hero Banner Carousel */}
        <div className="relative overflow-hidden rounded-2xl shadow-lg h-[260px] md:h-[360px] lg:h-[400px]">
          <div
            className={`w-full h-full bg-gradient-to-r ${slide.gradient} p-6 md:p-12 flex items-center justify-between transition-all duration-700 text-white`}
          >
            <div className="max-w-xl space-y-3 md:space-y-4 z-10">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-md px-3 py-1 text-xs font-bold text-amber-300 border border-white/20">
                <Sparkles className="w-3.5 h-3.5" />
                {slide.badge}
              </span>
              <h2 className="text-2xl md:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
                {slide.title}
              </h2>
              <p className="text-sm md:text-base text-gray-200 line-clamp-2">
                {slide.subtitle}
              </p>
              <div>
                <Link
                  href={slide.link}
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-gray-950 px-6 py-3 text-sm font-bold shadow-lg transition-transform hover:scale-105"
                >
                  <span>{slide.cta}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            <div className="hidden md:block relative w-72 h-72 lg:w-96 lg:h-96">
              <img
                src={slide.image}
                alt={slide.title}
                className="w-full h-full object-cover rounded-2xl shadow-2xl ring-4 ring-white/10 transform rotate-1 hover:rotate-0 transition duration-500"
              />
            </div>
          </div>

          {/* Carousel dots */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
            {HERO_SLIDES.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`h-2 rounded-full transition-all ${
                  currentSlide === idx ? "w-8 bg-white" : "w-2 bg-white/40"
                }`}
                aria-label={`Slide ${idx + 1}`}
              />
            ))}
          </div>

          {/* Nav arrows */}
          <button
            onClick={() =>
              setCurrentSlide((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)
            }
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/30 hover:bg-black/50 text-white p-2 backdrop-blur-sm transition"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() =>
              setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length)
            }
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/30 hover:bg-black/50 text-white p-2 backdrop-blur-sm transition"
            aria-label="Next slide"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Maha Sale Section: Top 12 Discounted Products */}
        {saleCampaign?.isActive && mahaSaleProducts && mahaSaleProducts.length > 0 && (
          <div className="rounded-2xl bg-white border border-red-200 p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-red-600 to-amber-600 text-white shadow-md">
                  <Flame className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-950 flex items-center gap-2">
                    Durga Puja Maha Sale Deals
                    <span className="text-xs font-black px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                      85% – 95% OFF
                    </span>
                  </h3>
                  <p className="text-xs text-gray-500">
                    Top 12 massive festive price drops across electronics, fashion & more
                  </p>
                </div>
              </div>
              <Link
                href="/sale"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition"
              >
                <span>View All Maha Sale Deals ({mahaSaleProducts.length}+)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
              {mahaSaleProducts.slice(0, 12).map((prod) => (
                <ProductCard key={prod.id} product={prod} />
              ))}
            </div>
          </div>
        )}

        {/* 3. Deal of the Day / Flash Sale Strip */}
        <div className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 mb-4 border-b border-gray-100 gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-red-600 text-white shadow-md shadow-red-200">
                <Flame className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  Deals of the Day
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                    Live Now
                  </span>
                </h3>
                <p className="text-xs text-gray-500">Unbeatable discounts handpicked for today</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Countdown timer */}
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                <Timer className="w-4 h-4 text-red-600" />
                <span>Ends in:</span>
                <span className="bg-gray-900 text-white font-mono px-1.5 py-0.5 rounded">
                  {String(timeLeft.hours).padStart(2, "0")}h
                </span>
                :
                <span className="bg-gray-900 text-white font-mono px-1.5 py-0.5 rounded">
                  {String(timeLeft.minutes).padStart(2, "0")}m
                </span>
                :
                <span className="bg-gray-900 text-white font-mono px-1.5 py-0.5 rounded">
                  {String(timeLeft.seconds).padStart(2, "0")}s
                </span>
              </div>

              <Link
                href="/category/deals"
                className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                <span>View All Deals</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Flash sale products grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {flashSaleProducts.slice(0, 5).map((prod) => (
              <ProductCard key={prod.id} product={prod} />
            ))}
          </div>
        </div>

        {/* 4. Promotional 3-Column Feature Banners */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white p-5 flex items-center justify-between shadow-sm hover:shadow-md transition">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-200">Limited Period</p>
              <h4 className="text-lg font-extrabold mt-1">Flat ₹500 OFF</h4>
              <p className="text-xs text-amber-100 mt-1">Use coupon: <span className="font-mono bg-white/20 px-1.5 py-0.5 rounded">SAVE500</span></p>
              <Link href="/category/electronics" className="mt-3 inline-block text-xs font-bold bg-white text-orange-600 px-3 py-1.5 rounded-lg shadow-sm">
                Shop Electronics
              </Link>
            </div>
            <div className="text-5xl opacity-40">⚡</div>
          </div>

          <div className="rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-5 flex items-center justify-between shadow-sm hover:shadow-md transition">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-200">Festival Special</p>
              <h4 className="text-lg font-extrabold mt-1">Top Rated Brands</h4>
              <p className="text-xs text-blue-100 mt-1">Up to 70% off with Free Shipping</p>
              <Link href="/category/fashion" className="mt-3 inline-block text-xs font-bold bg-white text-blue-600 px-3 py-1.5 rounded-lg shadow-sm">
                Explore Brands
              </Link>
            </div>
            <div className="text-5xl opacity-40">🏷️</div>
          </div>

          <div className="rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-5 flex items-center justify-between shadow-sm hover:shadow-md transition">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-200">Verified Sellers</p>
              <h4 className="text-lg font-extrabold mt-1">Express 48hr Delivery</h4>
              <p className="text-xs text-emerald-100 mt-1">Guaranteed on thousands of items</p>
              <Link href="/category/mobiles-tablets" className="mt-3 inline-block text-xs font-bold bg-white text-emerald-700 px-3 py-1.5 rounded-lg shadow-sm">
                View Gadgets
              </Link>
            </div>
            <div className="text-5xl opacity-40">🚀</div>
          </div>
        </div>

        {/* 5. Trending Electronics Section */}
        <div className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100">
            <div>
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Best in Electronics & Gadgets
              </h3>
              <p className="text-xs text-gray-500">Latest audio, smartphones, accessories and monitors</p>
            </div>
            <Link
              href="/category/electronics"
              className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>View All</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {electronicsProducts.slice(0, 5).map((prod) => (
              <ProductCard key={prod.id} product={prod} />
            ))}
          </div>
        </div>

        {/* 6. Trending Fashion Section */}
        <div className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100">
            <div>
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Percent className="w-5 h-5 text-purple-600" />
                Wardrobe Essentials & Fashion
              </h3>
              <p className="text-xs text-gray-500">Trendy footwear, apparel, watches and accessories</p>
            </div>
            <Link
              href="/category/fashion"
              className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>View All</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {fashionProducts.slice(0, 5).map((prod) => (
              <ProductCard key={prod.id} product={prod} />
            ))}
          </div>
        </div>

        {/* 7. Featured & Recommended */}
        <div className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100">
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                Recommended For You
              </h3>
              <p className="text-xs text-gray-500">Based on popular buying trends</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {featuredProducts.slice(0, 5).map((prod) => (
              <ProductCard key={prod.id} product={prod} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
