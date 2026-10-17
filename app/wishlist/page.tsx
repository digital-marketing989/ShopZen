"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/store/header";
import { Footer } from "@/components/store/footer";
import { useWishlistStore } from "@/store/wishlist";
import { ProductCard } from "@/components/store/product-card";
import { Heart, ArrowRight } from "lucide-react";

export default function WishlistPage() {
  const { items } = useWishlistStore();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWishlistProducts() {
      if (!items.length) {
        setProducts([]);
        setLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/products?limit=50");
        const data = await res.json();
        if (data.success && data.data.products) {
          const filtered = data.data.products.filter((p: any) =>
            items.includes(p.id)
          );
          setProducts(filtered);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    fetchWishlistProducts();
  }, [items]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight mb-6 flex items-center gap-2">
          <Heart className="w-6 h-6 text-red-500 fill-red-500" />
          My Wishlist ({items.length})
        </h1>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              Your wishlist is empty
            </h3>
            <p className="text-xs text-gray-500 mb-6">
              Save items you love by tapping the heart icon on any product.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition"
            >
              <span>Explore Deals</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
