"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  SlidersHorizontal,
  ChevronRight,
  RotateCcw,
  Sparkles,
  ChevronLeft,
  Package,
} from "lucide-react";
import { ProductCard } from "@/components/store/product-card";

export interface BreadcrumbItem {
  name: string;
  url?: string;
}

export interface SubcategoryChip {
  id: string;
  name: string;
  slug: string;
  productCount?: number;
}

interface ProductListingProps {
  initialProducts: any[];
  title: string;
  totalCount: number;
  brands: any[];
  categories?: any[];
  categorySlug?: string;
  breadcrumbs?: BreadcrumbItem[];
  subcategories?: SubcategoryChip[];
  categoryBanner?: string;
  categoryDescription?: string;
}

export function ProductListing({
  initialProducts,
  title,
  totalCount,
  brands,
  categorySlug,
  breadcrumbs = [],
  subcategories = [],
  categoryBanner,
  categoryDescription,
}: ProductListingProps) {
  // Filter states
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(100000);
  const [minRating, setMinRating] = useState<number>(0);
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>("popular");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 16;

  // Filtered & sorted products
  const filteredProducts = useMemo(() => {
    let result = [...initialProducts];

    if (selectedBrands.length > 0) {
      result = result.filter(
        (p) => p.brand?.name && selectedBrands.includes(p.brand.name)
      );
    }

    if (minPrice > 0) {
      result = result.filter((p) => p.price >= minPrice);
    }

    if (maxPrice < 100000) {
      result = result.filter((p) => p.price <= maxPrice);
    }

    if (minRating > 0) {
      result = result.filter((p) => (p.rating || p.avgRating || 0) >= minRating);
    }

    if (inStockOnly) {
      result = result.filter((p) => (p.totalStock || 0) > 0);
    }

    if (sortBy === "price_asc") {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price_desc") {
      result.sort((a, b) => b.price - a.price);
    } else if (sortBy === "rating") {
      result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === "discount") {
      result.sort((a, b) => (b.discountPct || 0) - (a.discountPct || 0));
    } else if (sortBy === "newest") {
      result.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    return result;
  }, [
    initialProducts,
    selectedBrands,
    minPrice,
    maxPrice,
    minRating,
    inStockOnly,
    sortBy,
  ]);

  // Paginated slice
  const totalPages = Math.ceil(filteredProducts.length / pageSize) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  const toggleBrand = (brandName: string) => {
    setCurrentPage(1);
    setSelectedBrands((prev) =>
      prev.includes(brandName)
        ? prev.filter((b) => b !== brandName)
        : [...prev, brandName]
    );
  };

  const resetFilters = () => {
    setSelectedBrands([]);
    setMinPrice(0);
    setMaxPrice(100000);
    setMinRating(0);
    setInStockOnly(false);
    setCurrentPage(1);
  };

  const hasActiveFilters =
    selectedBrands.length > 0 ||
    minPrice > 0 ||
    maxPrice < 100000 ||
    minRating > 0 ||
    inStockOnly;

  return (
    <div className="container mx-auto px-4 py-6">
      {/* 1. Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="flex items-center gap-1.5 text-xs text-gray-500 font-medium overflow-x-auto whitespace-nowrap">
          <li>
            <Link href="/" className="hover:text-blue-600 transition">
              Home
            </Link>
          </li>
          {breadcrumbs.map((b, i) => (
            <li key={i} className="flex items-center gap-1.5">
              <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
              {b.url ? (
                <Link href={b.url} className="hover:text-blue-600 transition">
                  {b.name}
                </Link>
              ) : (
                <span className="text-gray-900 font-semibold">{b.name}</span>
              )}
            </li>
          ))}
          {breadcrumbs.length === 0 && (
            <li className="flex items-center gap-1.5">
              <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-gray-900 font-semibold">{title}</span>
            </li>
          )}
        </ol>
      </nav>

      {/* 2. Optional Category Header / Banner */}
      {categoryBanner ? (
        <div
          className="relative rounded-2xl overflow-hidden mb-6 bg-cover bg-center h-44 md:h-52 flex items-end p-6 text-white shadow-md border border-gray-100"
          style={{ backgroundImage: `linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.2) 60%), url(${categoryBanner})` }}
        >
          <div className="relative z-10 space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest bg-blue-600 text-white px-2.5 py-0.5 rounded-full inline-block">
              Shop Department
            </span>
            <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight drop-shadow-md">
              {title}
            </h1>
            {categoryDescription && (
              <p className="text-xs md:text-sm text-gray-200 line-clamp-1 max-w-2xl font-medium">
                {categoryDescription}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="mb-5 pb-4 border-b border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
                  {title}
                </h1>
                <span className="text-xs bg-blue-50 text-blue-700 font-bold px-2.5 py-0.5 rounded-full">
                  {totalCount} Products
                </span>
              </div>
              {categoryDescription && (
                <p className="text-xs text-gray-500 mt-1 max-w-2xl">
                  {categoryDescription}
                </p>
              )}
            </div>

            {/* Durga Puja Discount Callout */}
            <div className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs text-amber-900 font-bold self-start md:self-auto">
              <Sparkles className="w-4 h-4 text-amber-600 fill-amber-500" />
              <span>Maha Sale: 85% to 95% discount applied</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Subcategories Quick Chips */}
      {subcategories && subcategories.length > 0 && (
        <div className="mb-6 space-y-2">
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-blue-600" />
            <span>Explore Subcategories ({subcategories.length})</span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {subcategories.map((sub) => {
              const isCurrent = categorySlug === sub.slug;
              return (
                <Link
                  key={sub.id}
                  href={`/category/${sub.slug}`}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shadow-sm ${
                    isCurrent
                      ? "bg-blue-600 text-white shadow-blue-500/20"
                      : "bg-white text-gray-700 border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50"
                  }`}
                >
                  <span>{sub.name}</span>
                  {sub.productCount !== undefined && sub.productCount > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        isCurrent ? "bg-blue-700 text-blue-100" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {sub.productCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Controls Bar (Count, Active Filters, Sorting) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-200 gap-3">
        <p className="text-xs text-gray-500">
          Showing{" "}
          <span className="font-bold text-gray-900">
            {filteredProducts.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} -{" "}
            {Math.min(currentPage * pageSize, filteredProducts.length)}
          </span>{" "}
          of <span className="font-bold text-gray-900">{filteredProducts.length}</span> filtered products
        </p>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
            className="md:hidden inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 shadow-sm"
          >
            <SlidersHorizontal className="w-4 h-4 text-blue-600" />
            <span>Filters ({selectedBrands.length + (minRating ? 1 : 0) + (inStockOnly ? 1 : 0)})</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-semibold hidden sm:inline">
              Sort by:
            </span>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="popular">Popularity</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rating">Customer Rating</option>
              <option value="discount">Highest Discount</option>
              <option value="newest">Newest Arrivals</option>
            </select>
          </div>
        </div>
      </div>

      {/* 5. Main Layout with Filters Sidebar & Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-6 mt-6">
        {/* Filters Sidebar */}
        <aside
          className={`col-span-1 space-y-5 ${
            mobileFilterOpen ? "block" : "hidden md:block"
          }`}
        >
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-5 sticky top-24">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-black text-gray-900 text-sm flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-blue-600" />
                Filters
              </h3>
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </button>
              )}
            </div>

            {/* Price Filter */}
            <div className="space-y-2.5">
              <h4 className="text-[11px] font-black uppercase tracking-wider text-gray-500">
                Price (₹)
              </h4>
              <div className="flex items-center gap-2 text-xs">
                <input
                  type="number"
                  placeholder="Min"
                  value={minPrice || ""}
                  onChange={(e) => {
                    setMinPrice(Number(e.target.value) || 0);
                    setCurrentPage(1);
                  }}
                  className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
                <span className="text-gray-400">to</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPrice === 100000 ? "" : maxPrice}
                  onChange={(e) => {
                    setMaxPrice(Number(e.target.value) || 100000);
                    setCurrentPage(1);
                  }}
                  className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>
            </div>

            {/* Rating Filter */}
            <div className="space-y-2 pt-3 border-t border-gray-100">
              <h4 className="text-[11px] font-black uppercase tracking-wider text-gray-500">
                Customer Rating
              </h4>
              {[4, 3, 2].map((stars) => (
                <label
                  key={stars}
                  className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer hover:text-blue-600 font-medium"
                >
                  <input
                    type="radio"
                    name="rating"
                    checked={minRating === stars}
                    onChange={() => {
                      setMinRating(minRating === stars ? 0 : stars);
                      setCurrentPage(1);
                    }}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span>{stars}★ & above</span>
                </label>
              ))}
            </div>

            {/* Availability */}
            <div className="space-y-2 pt-3 border-t border-gray-100">
              <h4 className="text-[11px] font-black uppercase tracking-wider text-gray-500">
                Availability
              </h4>
              <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer hover:text-blue-600 font-medium">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => {
                    setInStockOnly(e.target.checked);
                    setCurrentPage(1);
                  }}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>Exclude Out of Stock</span>
              </label>
            </div>

            {/* Brand Filter */}
            {brands && brands.length > 0 && (
              <div className="space-y-2.5 pt-3 border-t border-gray-100">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-gray-500">
                  Brands
                </h4>
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {brands.map((b) => (
                    <label
                      key={b.id || b.name}
                      className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer hover:text-blue-600 font-medium"
                    >
                      <input
                        type="checkbox"
                        checked={selectedBrands.includes(b.name)}
                        onChange={() => toggleBrand(b.name)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span>{b.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Product Grid */}
        <div className="col-span-1 md:col-span-3 lg:col-span-4 space-y-6">
          {filteredProducts.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
              <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 mx-auto flex items-center justify-center text-2xl mb-4">
                🔍
              </div>
              <h3 className="text-lg font-black text-gray-900 mb-1">
                No matching products found
              </h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto mb-4">
                No products currently match your active filters in this department.
              </p>
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset All Filters</span>
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {paginatedProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>

              {/* 6. Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-6 border-t border-gray-200">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => {
                      setCurrentPage((p) => Math.max(1, p - 1));
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="p-2 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold transition flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </button>

                  <div className="flex items-center gap-1 text-xs font-bold">
                    {Array.from({ length: totalPages }).map((_, idx) => {
                      const pageNum = idx + 1;
                      const isActive = pageNum === currentPage;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => {
                            setCurrentPage(pageNum);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className={`w-9 h-9 rounded-xl font-mono transition ${
                            isActive
                              ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                              : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => {
                      setCurrentPage((p) => Math.min(totalPages, p + 1));
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="p-2 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold transition flex items-center gap-1"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
