"use client";

import Image from "next/image";
import Link from "next/link";
import { Star, Heart, ShoppingCart, Check } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { useWishlistStore } from "@/store/wishlist";
import { toast } from "sonner";
import { useState } from "react";

interface ProductCardProps {
  product: {
    id: string;
    title: string;
    slug: string;
    price: number;
    mrp: number;
    discountPct?: number;
    isSaleActive?: boolean;
    campaignName?: string;
    avgRating?: number;
    totalReviews?: number;
    images?: { url: string; alt?: string }[];
    totalStock?: number;
    category?: { name: string; slug: string };
    brand?: { name: string };
  };
}

export function ProductCard({ product }: ProductCardProps) {
  const addItem = useCartStore((s) => s.addItem);
  const { toggle, isInWishlist } = useWishlistStore();
  const [added, setAdded] = useState(false);

  const primaryImage =
    product.images?.[0]?.url ||
    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80";

  const discount =
    product.discountPct ||
    (product.mrp > product.price
      ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
      : 0);

  const inWish = isInWishlist(product.id);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    addItem({
      productId: product.id,
      title: product.title,
      price: product.price,
      mrp: product.mrp,
      image: primaryImage,
      quantity: 1,
      maxStock: product.totalStock ?? 10,
    });

    setAdded(true);
    toast.success("Added to cart", {
      description: product.title,
      duration: 2000,
    });

    setTimeout(() => setAdded(false), 1500);
  };

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggle(product.id);
    if (!inWish) {
      toast.success("Added to wishlist");
    } else {
      toast.info("Removed from wishlist");
    }
  };

  return (
    <div className="group relative flex flex-col rounded-xl border border-gray-100 bg-white p-3 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      {/* Discount badge */}
      {discount > 0 && (
        <span
          className={`absolute top-3 left-3 z-10 rounded-md px-2 py-0.5 text-[11px] font-black text-white shadow-md ${
            product.isSaleActive || discount >= 85
              ? "bg-gradient-to-r from-red-600 via-rose-600 to-amber-600"
              : "bg-emerald-600 font-bold"
          }`}
        >
          {discount}% OFF
        </span>
      )}

      {/* Wishlist toggle */}
      <button
        onClick={handleToggleWishlist}
        aria-label="Wishlist"
        className={`absolute top-3 right-3 z-10 rounded-full p-2 backdrop-blur-md transition-colors ${
          inWish
            ? "bg-red-50 text-red-500 fill-red-500 shadow-sm"
            : "bg-white/80 text-gray-400 hover:text-red-500 hover:bg-white shadow-sm"
        }`}
      >
        <Heart className={`w-4 h-4 ${inWish ? "fill-red-500 text-red-500" : ""}`} />
      </button>

      {/* Product Image */}
      <Link
        href={`/product/${product.slug}`}
        className="relative block aspect-square w-full overflow-hidden rounded-lg bg-gray-50 mb-3"
      >
        <img
          src={primaryImage}
          alt={product.title}
          className="h-full w-full object-contain p-2 transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      </Link>

      {/* Product Info */}
      <div className="flex flex-1 flex-col justify-between">
        <div>
          {product.category && (
            <p className="text-[11px] uppercase tracking-wider text-gray-400 font-medium mb-1">
              {product.category.name}
            </p>
          )}

          <Link href={`/product/${product.slug}`}>
            <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 hover:text-blue-600 transition-colors mb-1.5 leading-snug">
              {product.title}
            </h3>
          </Link>

          {/* Rating */}
          <div className="flex items-center gap-1.5 mb-2">
            <div className="inline-flex items-center gap-0.5 rounded bg-emerald-600 px-1.5 py-0.5 text-[11px] font-bold text-white">
              <span>{(product.avgRating || 4.2).toFixed(1)}</span>
              <Star className="w-2.5 h-2.5 fill-white text-white" />
            </div>
            <span className="text-xs text-gray-400">
              ({product.totalReviews || 124})
            </span>
          </div>
        </div>

        <div>
          {/* Price */}
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-lg font-bold text-gray-900">
              ₹{product.price.toLocaleString("en-IN")}
            </span>
            {product.mrp > product.price && (
              <span className="text-xs text-gray-400 line-through">
                ₹{product.mrp.toLocaleString("en-IN")}
              </span>
            )}
          </div>

          {/* Add to Cart button */}
          <button
            onClick={handleAddToCart}
            className={`w-full flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${
              added
                ? "bg-emerald-600 text-white"
                : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95 shadow-sm"
            }`}
          >
            {added ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Added to Cart</span>
              </>
            ) : (
              <>
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>Add to Cart</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
