"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  ShoppingCart,
  Heart,
  Search,
  Menu,
  X,
  User,
  Package,
  LogOut,
  ChevronDown,
  ChevronRight,
  MapPin,
  Bell,
  Store,
  LayoutDashboard,
  Zap,
  Sparkles,
  Smartphone,
  Laptop,
  Shirt,
  Utensils,
  Armchair,
  BookOpen,
  Dumbbell,
  Baby,
  Car,
  Wrench,
  Layers,
  ArrowRight,
} from "lucide-react";
import { useCartStore } from "@/store/cart";
import { useWishlistStore } from "@/store/wishlist";
import { HeaderOfferBar } from "./header-offer-bar";

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  banner?: string;
  children?: Category[];
  _count?: { products: number; children?: number };
}

const CATEGORY_ICONS: Record<string, any> = {
  "mobiles-accessories": Smartphone,
  "electronics-computers": Laptop,
  "fashion-lifestyle": Shirt,
  "home-appliances-kitchen": Utensils,
  "furniture-home-decor": Armchair,
  "beauty-personal-care": Sparkles,
  "grocery-household-essentials": Package,
  "books-stationery-education": BookOpen,
  "sports-fitness-outdoors": Dumbbell,
  "toys-baby-kids": Baby,
  "automotive-travel": Car,
  "tools-industrial-other": Wrench,
};

export function Header() {
  const router = useRouter();
  const { data: session } = useSession();
  const cartCount = useCartStore((s) => s.getItemCount());
  const wishlistCount = useWishlistStore((s) => s.items.length);

  const [isMounted, setIsMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedMobileCategory, setExpandedMobileCategory] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [megaMenuOpen, setMegaMenuOpen] = useState(false);
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);

  const [pincode, setPincode] = useState("");
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const megaMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
    fetchCategories();
    const saved = localStorage.getItem("shopzen-pincode");
    if (saved) setPincode(saved);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (megaMenuRef.current && !megaMenuRef.current.contains(e.target as Node)) {
        setMegaMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch {}
  };

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    try {
      const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.suggestions || []);
        setShowSuggestions(true);
      }
    } catch {}
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowSuggestions(false);
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const role = (session?.user as any)?.role;
  const activeCategory = categories[activeCategoryIndex] || categories[0];

  return (
    <header className="sticky top-0 z-50 bg-white shadow-md">
      <HeaderOfferBar />

      {/* 1. Top bar */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 border-b border-blue-900/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-9 text-[11px] text-blue-100 font-medium">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-amber-300" />
                <span>Free delivery across India on orders above ₹499</span>
              </span>
              <span className="hidden md:inline-block text-blue-300">|</span>
              <span className="hidden md:flex items-center gap-1 text-amber-200">
                <Sparkles className="w-3 h-3" />
                <span>Maha Sale Live: 85% - 95% OFF</span>
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/sale" className="hover:text-amber-300 font-bold text-amber-300 transition-colors">
                Maha Sale Hub
              </Link>
              <Link href="/sale-terms" className="hover:text-white transition-colors hidden sm:inline-block">
                Sale Terms
              </Link>
              <Link href="/seller/register" className="hover:text-white transition-colors">
                Sell on ShopZen
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Header Bar */}
      <div className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 sm:gap-6 h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 shrink-0 group">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <Zap className="w-5 h-5 text-amber-300 fill-amber-300" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black text-gray-900 tracking-tight leading-none">
                  Shop<span className="text-orange-500">Zen</span>
                </span>
                <span className="text-[9px] uppercase tracking-widest text-blue-600 font-extrabold italic">
                  Explore Plus
                </span>
              </div>
            </Link>

            {/* Pincode selector */}
            <button className="hidden xl:flex items-center gap-1.5 text-xs text-gray-600 hover:text-blue-600 shrink-0 border border-gray-200 rounded-xl px-2.5 py-1.5 hover:border-blue-300 transition">
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              <div className="text-left leading-tight">
                <div className="text-[10px] text-gray-400">Deliver to</div>
                <div className="font-bold text-gray-800">{pincode || "560001"}</div>
              </div>
            </button>

            {/* Search Bar */}
            <form onSubmit={handleSearchSubmit} className="flex-1 relative max-w-3xl">
              <div className="flex items-center bg-gray-50 border-2 border-gray-200 rounded-xl overflow-hidden focus-within:border-blue-600 focus-within:bg-white transition-all shadow-sm">
                <input
                  ref={searchRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  onFocus={() => searchQuery.length > 1 && setShowSuggestions(true)}
                  placeholder="Search for 1,00,000+ products, mobiles, electronics, fashion and brands..."
                  className="flex-1 px-4 py-2.5 text-sm outline-none bg-transparent placeholder-gray-400 font-medium"
                />
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 transition-colors flex items-center justify-center"
                  aria-label="Search"
                >
                  <Search className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>

              {/* Suggestions dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-2xl mt-1.5 z-50 overflow-hidden divide-y divide-gray-50">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setSearchQuery(s.title);
                        setShowSuggestions(false);
                        router.push(`/search?q=${encodeURIComponent(s.title)}`);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50/70 flex items-center gap-3 transition-colors"
                    >
                      <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="font-medium text-gray-800 truncate">{s.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </form>

            {/* Right actions */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* User Account */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors text-sm font-semibold text-gray-800"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                    <User className="w-4 h-4" />
                  </div>
                  <span className="hidden md:block max-w-[90px] truncate">
                    {session?.user?.name?.split(" ")[0] || "Sign In"}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-500 hidden md:block" />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-100 rounded-2xl shadow-2xl z-50 overflow-hidden p-2">
                    {session ? (
                      <>
                        <div className="px-3 py-2.5 border-b border-gray-100 bg-blue-50/60 rounded-xl mb-1">
                          <p className="font-bold text-gray-900 text-sm truncate">{session.user?.name}</p>
                          <p className="text-xs text-gray-500 truncate">{session.user?.email}</p>
                        </div>
                        <div className="space-y-0.5 text-sm">
                          <Link href="/orders" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-50" onClick={() => setUserMenuOpen(false)}>
                            <Package className="w-4 h-4 text-blue-600" /> Orders
                          </Link>
                          <Link href="/wishlist" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-50" onClick={() => setUserMenuOpen(false)}>
                            <Heart className="w-4 h-4 text-rose-500" /> Wishlist
                          </Link>
                          {(role === "ADMIN" || role === "SUPER_ADMIN") && (
                            <Link href="/admin" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-purple-700 font-semibold bg-purple-50 hover:bg-purple-100" onClick={() => setUserMenuOpen(false)}>
                              <LayoutDashboard className="w-4 h-4 text-purple-600" /> Admin Console
                            </Link>
                          )}
                          {(role === "SELLER" || role === "ADMIN" || role === "SUPER_ADMIN") && (
                            <Link href="/seller" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-blue-700 font-semibold bg-blue-50 hover:bg-blue-100" onClick={() => setUserMenuOpen(false)}>
                              <Store className="w-4 h-4 text-blue-600" /> Seller Dashboard
                            </Link>
                          )}
                          <div className="border-t border-gray-100 my-1 pt-1">
                            <button
                              onClick={() => { signOut({ callbackUrl: "/" }); setUserMenuOpen(false); }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg font-medium"
                            >
                              <LogOut className="w-4 h-4" /> Sign Out
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="p-2 space-y-2">
                        <Link href="/auth/login" className="block w-full text-center py-2.5 px-4 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition" onClick={() => setUserMenuOpen(false)}>
                          Login
                        </Link>
                        <Link href="/auth/register" className="block w-full text-center py-2 px-4 border border-blue-600 text-blue-600 rounded-xl text-sm font-bold hover:bg-blue-50 transition" onClick={() => setUserMenuOpen(false)}>
                          Create Account
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Wishlist */}
              <Link href="/wishlist" className="relative p-2.5 rounded-xl hover:bg-gray-100 transition-colors text-gray-700">
                <Heart className="w-5 h-5" />
                {isMounted && wishlistCount > 0 && (
                  <span className="absolute 1 top-1 right-1 bg-red-500 text-white text-[10px] rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center font-black shadow-sm">
                    {wishlistCount}
                  </span>
                )}
              </Link>

              {/* Cart */}
              <Link href="/cart" className="relative p-2.5 rounded-xl hover:bg-gray-100 transition-colors text-gray-700">
                <ShoppingCart className="w-5 h-5" />
                {isMounted && cartCount > 0 && (
                  <span className="absolute top-1 right-1 bg-orange-500 text-white text-[10px] rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center font-black shadow-sm animate-bounce">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
              </Link>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-xl hover:bg-gray-100 text-gray-700"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Flipkart-Inspired Mega Category Bar (Desktop) */}
      <div className="bg-white border-b border-gray-200 hidden lg:block relative" ref={megaMenuRef}>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-11 text-xs">
            {/* All Categories Button */}
            <button
              onClick={() => setMegaMenuOpen(!megaMenuOpen)}
              onMouseEnter={() => setMegaMenuOpen(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-3.5 py-1.5 rounded-lg shadow-sm transition"
            >
              <Layers className="w-4 h-4" />
              <span>All 12 Categories</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${megaMenuOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Category Quick Tabs (First 8 categories) */}
            <div className="flex items-center gap-1 xl:gap-2 overflow-x-hidden">
              {categories.slice(0, 8).map((cat, idx) => {
                const IconComponent = CATEGORY_ICONS[cat.slug] || Package;
                return (
                  <div
                    key={cat.id}
                    className="relative group"
                    onMouseEnter={() => {
                      setActiveCategoryIndex(idx);
                    }}
                  >
                    <Link
                      href={`/category/${cat.slug}`}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-gray-700 hover:text-blue-600 font-bold hover:bg-blue-50/70 transition-colors whitespace-nowrap"
                    >
                      <IconComponent className="w-3.5 h-3.5 text-gray-500 group-hover:text-blue-600" />
                      <span>{cat.name}</span>
                      <ChevronDown className="w-3 h-3 text-gray-400 group-hover:text-blue-600" />
                    </Link>

                    {/* Quick subcategory hover flyout */}
                    {cat.children && cat.children.length > 0 && (
                      <div className="hidden group-hover:block absolute top-full left-0 bg-white border border-gray-100 rounded-xl shadow-xl w-60 py-2 z-40">
                        <div className="px-3 pb-1.5 border-b border-gray-100 font-bold text-gray-900 text-[11px] flex items-center justify-between">
                          <span>Top Subcategories</span>
                          <Link href={`/category/${cat.slug}`} className="text-blue-600 hover:underline">
                            View All →
                          </Link>
                        </div>
                        <div className="max-h-72 overflow-y-auto py-1 divide-y divide-gray-50">
                          {cat.children.slice(0, 10).map((sub) => (
                            <Link
                              key={sub.id}
                              href={`/category/${sub.slug}`}
                              className="block px-3 py-1.5 text-gray-600 hover:bg-blue-50 hover:text-blue-600 font-medium transition-colors"
                            >
                              {sub.name}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Right Deals & Maha Sale Buttons */}
            <div className="flex items-center gap-2">
              <Link
                href="/sale"
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-red-600 to-amber-600 text-white font-extrabold shadow-sm hover:from-red-700 hover:to-amber-700 transition"
              >
                <Sparkles className="w-3 h-3 text-amber-300 fill-amber-300" />
                <span>Maha Sale</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Full Desktop Mega-Menu Flyout (12 Categories Tree) */}
        {megaMenuOpen && (
          <div
            className="absolute top-full left-0 right-0 bg-white border-b-2 border-blue-600 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150"
            onMouseLeave={() => setMegaMenuOpen(false)}
          >
            <div className="container mx-auto px-4 py-6">
              <div className="grid grid-cols-12 gap-6 min-h-[420px]">
                {/* Left Side: 12 Main Categories List */}
                <div className="col-span-4 border-r border-gray-100 pr-4 space-y-1 max-h-[500px] overflow-y-auto">
                  <div className="text-[11px] font-black uppercase text-gray-400 tracking-wider px-3 pb-2">
                    Select Department ({categories.length})
                  </div>
                  {categories.map((cat, idx) => {
                    const IconComponent = CATEGORY_ICONS[cat.slug] || Package;
                    const isActive = idx === activeCategoryIndex;
                    return (
                      <button
                        key={cat.id}
                        onMouseEnter={() => setActiveCategoryIndex(idx)}
                        onClick={() => {
                          setActiveCategoryIndex(idx);
                          router.push(`/category/${cat.slug}`);
                          setMegaMenuOpen(false);
                        }}
                        className={`w-full text-left flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-xs transition-all ${
                          isActive
                            ? "bg-blue-600 text-white shadow-md shadow-blue-500/20 translate-x-1"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <IconComponent className={`w-4 h-4 ${isActive ? "text-white" : "text-gray-500"}`} />
                          <span>{cat.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                              isActive ? "bg-blue-700 text-blue-100" : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {cat.children?.length || 0}
                          </span>
                          <ChevronRight className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-gray-400"}`} />
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Right Side: Active Category's Subcategories & Details */}
                {activeCategory && (
                  <div className="col-span-8 flex flex-col justify-between">
                    <div>
                      {/* Department Title & Quick Link */}
                      <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-xl font-black text-gray-900 tracking-tight">
                              {activeCategory.name}
                            </h3>
                            <span className="text-xs bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full">
                              {activeCategory.children?.length || 0} Subcategories
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                            {activeCategory.description || "Browse top verified brands and best deals"}
                          </p>
                        </div>
                        <Link
                          href={`/category/${activeCategory.slug}`}
                          onClick={() => setMegaMenuOpen(false)}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3.5 py-2 rounded-xl transition"
                        >
                          <span>Explore All {activeCategory.name}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>

                      {/* Subcategories Grid in 3 Columns */}
                      <div className="grid grid-cols-3 gap-x-6 gap-y-2.5 pt-5 max-h-[380px] overflow-y-auto pr-2">
                        {activeCategory.children && activeCategory.children.length > 0 ? (
                          activeCategory.children.map((sub) => (
                            <Link
                              key={sub.id}
                              href={`/category/${sub.slug}`}
                              onClick={() => setMegaMenuOpen(false)}
                              className="group flex items-center justify-between p-2 rounded-lg hover:bg-blue-50/70 transition-colors"
                            >
                              <span className="text-xs font-semibold text-gray-700 group-hover:text-blue-600 transition-colors line-clamp-1">
                                {sub.name}
                              </span>
                              <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                            </Link>
                          ))
                        ) : (
                          <div className="col-span-3 text-center py-10 text-gray-400 text-xs">
                            No subcategories configured yet.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Department Footer Promo Banner */}
                    <div className="mt-4 p-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <span className="font-bold text-gray-800">
                          Durga Puja Maha Sale: 85% to 95% discount active across all departments
                        </span>
                      </div>
                      <Link
                        href="/sale"
                        onClick={() => setMegaMenuOpen(false)}
                        className="font-bold text-red-600 hover:text-red-700 underline"
                      >
                        Shop Maha Sale Deals →
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Mobile Menu Drawer (Responsive Accordion) */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-t border-gray-200 max-h-[80vh] overflow-y-auto divide-y divide-gray-100 animate-in slide-in-from-top-2">
          {/* Mobile User Profile / Auth */}
          <div className="p-4 bg-gray-50 flex items-center justify-between">
            {session ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center">
                  {session.user?.name?.charAt(0) || "U"}
                </div>
                <div>
                  <div className="font-bold text-sm text-gray-900">{session.user?.name}</div>
                  <div className="text-xs text-gray-500">{session.user?.email}</div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 w-full">
                <Link
                  href="/auth/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 text-center py-2 bg-blue-600 text-white font-bold rounded-xl text-xs"
                >
                  Login
                </Link>
                <Link
                  href="/auth/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 text-center py-2 border border-blue-600 text-blue-600 font-bold rounded-xl text-xs"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Quick links */}
          <div className="p-3 grid grid-cols-2 gap-2 text-xs font-bold">
            <Link
              href="/sale"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2.5 rounded-xl bg-red-50 text-red-700 border border-red-200 flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 fill-red-500 text-red-500" />
              <span>Maha Sale</span>
            </Link>
            <Link
              href="/orders"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2.5 rounded-xl bg-gray-100 text-gray-800 flex items-center justify-center gap-1.5"
            >
              <Package className="w-3.5 h-3.5" />
              <span>My Orders</span>
            </Link>
          </div>

          {/* Categories Accordion */}
          <div className="p-3 space-y-1">
            <div className="text-[11px] font-black uppercase text-gray-400 tracking-wider px-2 py-1">
              Shop By Category ({categories.length})
            </div>
            {categories.map((cat) => {
              const IconComponent = CATEGORY_ICONS[cat.slug] || Package;
              const isExpanded = expandedMobileCategory === cat.id;

              return (
                <div key={cat.id} className="border border-gray-100 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between p-3 bg-white hover:bg-gray-50">
                    <Link
                      href={`/category/${cat.slug}`}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2.5 font-bold text-xs text-gray-800"
                    >
                      <IconComponent className="w-4 h-4 text-blue-600" />
                      <span>{cat.name}</span>
                    </Link>
                    {cat.children && cat.children.length > 0 && (
                      <button
                        onClick={() =>
                          setExpandedMobileCategory(isExpanded ? null : cat.id)
                        }
                        className="p-1 rounded-md text-gray-400 hover:text-gray-600"
                        aria-label="Expand subcategories"
                      >
                        <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </button>
                    )}
                  </div>

                  {isExpanded && cat.children && (
                    <div className="bg-gray-50 p-2 divide-y divide-gray-100">
                      {cat.children.map((sub) => (
                        <Link
                          key={sub.id}
                          href={`/category/${sub.slug}`}
                          onClick={() => setMobileMenuOpen(false)}
                          className="block px-3 py-2 text-xs font-medium text-gray-600 hover:text-blue-600"
                        >
                          {sub.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
