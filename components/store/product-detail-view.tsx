"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Star,
  Heart,
  ShoppingCart,
  Zap,
  Truck,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  Share2,
  MapPin,
  ChevronRight,
  ThumbsUp,
  MessageSquare,
} from "lucide-react";
import { useCartStore } from "@/store/cart";
import { useWishlistStore } from "@/store/wishlist";
import { toast } from "sonner";
import { ProductCard } from "@/components/store/product-card";

interface ProductDetailViewProps {
  product: any;
  similarProducts: any[];
}

export function ProductDetailView({
  product,
  similarProducts,
}: ProductDetailViewProps) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const { toggle, isInWishlist } = useWishlistStore();

  const images = product.images?.length
    ? product.images.map((img: any) => img.url)
    : ["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80"];

  const [activeImage, setActiveImage] = useState(images[0]);
  const [selectedVariant, setSelectedVariant] = useState<any>(
    product.variants?.[0] || null
  );
  const [pincode, setPincode] = useState("110001");
  const [pincodeChecked, setPincodeChecked] = useState(true);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewTitle, setReviewTitle] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewsList, setReviewsList] = useState<any[]>(product.reviews || []);

  const inWish = isInWishlist(product.id);

  const price = selectedVariant?.price || product.price;
  const mrp = selectedVariant?.mrp || product.mrp;
  const discount =
    mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;

  let highlights: string[] = [];
  try {
    highlights = product.highlights
      ? typeof product.highlights === "string"
        ? JSON.parse(product.highlights)
        : product.highlights
      : [];
  } catch {
    highlights = [];
  }

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      variantId: selectedVariant?.id,
      title: `${product.title}${selectedVariant ? ` (${selectedVariant.title})` : ""}`,
      price,
      mrp,
      image: activeImage,
      quantity: 1,
      maxStock: product.totalStock ?? 10,
    });
    toast.success("Added to Cart!", {
      description: product.title,
    });
  };

  const handleBuyNow = () => {
    handleAddToCart();
    router.push("/cart");
  };

  const handleCheckPincode = (e: React.FormEvent) => {
    e.preventDefault();
    if (pincode.length === 6) {
      setPincodeChecked(true);
      toast.success("Delivery available to " + pincode, {
        description: "Standard delivery by " + new Date(Date.now() + 4 * 86400000).toLocaleDateString(),
      });
    } else {
      toast.error("Please enter a valid 6-digit pincode");
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewComment.trim()) {
      toast.error("Please write a review comment");
      return;
    }

    setIsSubmittingReview(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          rating: reviewRating,
          title: reviewTitle,
          comment: reviewComment,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to post review");
      }

      toast.success("Thank you! Your review has been published.");
      setReviewsList([
        {
          id: data.data.id || String(Date.now()),
          rating: reviewRating,
          title: reviewTitle,
          comment: reviewComment,
          createdAt: new Date().toISOString(),
          user: { name: "You" },
          isVerifiedPurchase: true,
        },
        ...reviewsList,
      ]);
      setReviewComment("");
      setReviewTitle("");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit review");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-gray-500">
        <Link href="/" className="hover:text-blue-600">Home</Link>
        <ChevronRight className="w-3 h-3 text-gray-400" />
        {product.category && (
          <>
            <Link href={`/category/${product.category.slug}`} className="hover:text-blue-600">
              {product.category.name}
            </Link>
            <ChevronRight className="w-3 h-3 text-gray-400" />
          </>
        )}
        <span className="text-gray-900 font-medium truncate max-w-[200px] md:max-w-md">
          {product.title}
        </span>
      </nav>

      {/* Main product view */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        {/* Left Column: Gallery & Actions (5 cols) */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          <div className="flex gap-4">
            {/* Thumbnails */}
            <div className="flex flex-col gap-2 max-h-[460px] overflow-y-auto scrollbar-none">
              {images.map((img: string, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(img)}
                  className={`w-16 h-16 rounded-lg border-2 p-1 overflow-hidden transition-all bg-gray-50 flex items-center justify-center ${
                    activeImage === img
                      ? "border-blue-600 ring-2 ring-blue-100"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <img
                    src={img}
                    alt=""
                    className="w-full h-full object-contain"
                  />
                </button>
              ))}
            </div>

            {/* Main Stage Image */}
            <div className="relative flex-1 aspect-square rounded-xl border border-gray-100 bg-gray-50 overflow-hidden flex items-center justify-center p-4">
              <img
                src={activeImage}
                alt={product.title}
                className="max-h-full max-w-full object-contain transition-transform duration-300 hover:scale-110"
              />

              <button
                onClick={() => toggle(product.id)}
                className="absolute top-3 right-3 rounded-full bg-white/90 p-2 text-gray-400 hover:text-red-500 shadow-md backdrop-blur transition"
                aria-label="Wishlist"
              >
                <Heart className={`w-5 h-5 ${inWish ? "fill-red-500 text-red-500" : ""}`} />
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleAddToCart}
              className="flex items-center justify-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-gray-950 font-bold py-3.5 px-4 shadow-md transition transform active:scale-98"
            >
              <ShoppingCart className="w-5 h-5" />
              <span>Add to Cart</span>
            </button>
            <button
              onClick={handleBuyNow}
              className="flex items-center justify-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold py-3.5 px-4 shadow-md transition transform active:scale-98"
            >
              <Zap className="w-5 h-5" />
              <span>Buy Now</span>
            </button>
          </div>
        </div>

        {/* Right Column: Product Info & Pricing (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {product.brand && (
            <p className="text-xs uppercase tracking-wider text-blue-600 font-bold">
              {product.brand.name}
            </p>
          )}

          <h1 className="text-xl md:text-2xl font-bold text-gray-900 leading-snug">
            {product.title}
          </h1>

          {/* Rating Badge */}
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white shadow-sm">
              <span>{(product.avgRating || 4.3).toFixed(1)}</span>
              <Star className="w-3.5 h-3.5 fill-white text-white" />
            </div>
            <span className="text-xs text-gray-500 font-medium">
              {product.totalReviews || reviewsList.length} Ratings & Reviews
            </span>
            <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
              Verified Marketplace Product
            </span>
          </div>

          {/* Price Box */}
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200/80 space-y-2">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-extrabold text-gray-950">
                ₹{price.toLocaleString("en-IN")}
              </span>
              {mrp > price && (
                <>
                  <span className="text-base text-gray-400 line-through">
                    ₹{mrp.toLocaleString("en-IN")}
                  </span>
                  {product.isSaleActive || discount >= 85 ? (
                    <span className="inline-flex items-center gap-1 text-xs md:text-sm font-black text-white bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 px-3 py-1 rounded-full shadow-sm">
                      {discount}% OFF · Durga Puja Maha Sale
                    </span>
                  ) : (
                    <span className="text-sm font-bold text-emerald-600">
                      {discount}% OFF
                    </span>
                  )}
                </>
              )}
            </div>
            <p className="text-xs text-gray-500">Inclusive of all taxes</p>
          </div>

          {/* Bank & Coupon Offers */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 space-y-2 text-xs">
            <p className="font-bold text-blue-900 flex items-center gap-1.5">
              <span>🏷️ Available Offers</span>
            </p>
            <ul className="space-y-1.5 text-gray-700">
              <li className="flex items-start gap-1.5">
                <span className="font-bold text-emerald-700">Bank Offer:</span>
                <span>Flat ₹500 Instant Discount on orders over ₹2,499 with code <strong>SAVE500</strong></span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="font-bold text-emerald-700">Cashback:</span>
                <span>5% Unlimited Cashback on ShopZen Card</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="font-bold text-emerald-700">Freebie:</span>
                <span>Extra 1 Year Extended Warranty for ₹299</span>
              </li>
            </ul>
          </div>

          {/* Delivery Pincode Checker */}
          <div className="border-t border-gray-100 pt-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                Delivery Options
              </span>
            </div>
            <form onSubmit={handleCheckPincode} className="flex gap-2 max-w-xs">
              <input
                type="text"
                maxLength={6}
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                placeholder="Enter Pincode"
                className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-800 transition"
              >
                Check
              </button>
            </form>
            {pincodeChecked && (
              <div className="text-xs text-gray-600 space-y-1 pt-1">
                <p className="flex items-center gap-1.5 text-emerald-700 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Delivery by {new Date(Date.now() + 4 * 86400000).toLocaleDateString("en-IN", { weekday: 'short', month: 'short', day: 'numeric' })} | Free ₹40
                </p>
                <p className="text-gray-500">Secure online payment via Cashfree</p>
              </div>
            )}
          </div>

          {/* Highlights */}
          {highlights.length > 0 && (
            <div className="border-t border-gray-100 pt-4 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Highlights
              </h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-700">
                {highlights.map((h, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Seller details */}
          <div className="border-t border-gray-100 pt-4 flex items-center justify-between text-xs text-gray-600">
            <div>
              <span className="text-gray-400">Sold by: </span>
              <span className="font-bold text-gray-900">
                {product.seller?.storeName || "ShopZen Retail Services"}
              </span>
              <span className="ml-2 inline-flex items-center gap-0.5 rounded bg-blue-50 text-blue-700 px-1.5 py-0.5 font-bold">
                {product.seller?.rating || "4.8"}★
              </span>
            </div>
            <div className="flex items-center gap-3 text-gray-500">
              <span className="flex items-center gap-1"><ShieldCheck className="w-4 h-4 text-emerald-600" /> 7 Days Replacement</span>
              <span className="flex items-center gap-1"><Truck className="w-4 h-4 text-blue-600" /> Fast Shipping</span>
            </div>
          </div>
        </div>
      </div>

      {/* Product Description & Specifications */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Product Description</h2>
            <div className="prose prose-sm max-w-none text-gray-600 leading-relaxed">
              <p>{product.description || "Designed for premium quality, peak durability and daily convenience. Engineered with top-grade materials to ensure superior reliability."}</p>
            </div>
          </div>

          {/* Specifications Table */}
          {product.specifications?.length > 0 && (
            <div className="border-t border-gray-100 pt-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Specifications</h2>
              <div className="rounded-xl border border-gray-100 overflow-hidden divide-y divide-gray-100">
                {product.specifications.map((spec: any) => (
                  <div key={spec.id} className="grid grid-cols-3 text-xs p-3 hover:bg-gray-50">
                    <span className="font-semibold text-gray-500">{spec.name}</span>
                    <span className="col-span-2 text-gray-900">{spec.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reviews & Ratings Section */}
          <div className="border-t border-gray-100 pt-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                Ratings & Reviews
              </h2>
            </div>

            {/* Write a Review form */}
            <form onSubmit={handleReviewSubmit} className="rounded-xl bg-gray-50 border border-gray-200/80 p-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">Rate this Product</h4>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    className="p-1 hover:scale-110 transition"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        star <= reviewRating
                          ? "fill-amber-400 text-amber-400"
                          : "text-gray-300"
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-2 text-xs font-semibold text-gray-700">
                  {reviewRating} out of 5 stars
                </span>
              </div>

              <input
                type="text"
                placeholder="Review Headline (e.g., Outstanding performance & design)"
                value={reviewTitle}
                onChange={(e) => setReviewTitle(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />

              <textarea
                placeholder="Write your honest review here..."
                rows={3}
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />

              <button
                type="submit"
                disabled={isSubmittingReview}
                className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs font-bold transition disabled:opacity-50"
              >
                {isSubmittingReview ? "Submitting..." : "Submit Review"}
              </button>
            </form>

            {/* Existing Reviews List */}
            <div className="space-y-4">
              {reviewsList.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No reviews yet. Be the first to review this product!</p>
              ) : (
                reviewsList.map((rev: any) => (
                  <div key={rev.id} className="border-b border-gray-100 pb-4 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="inline-flex items-center gap-0.5 rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        <span>{rev.rating}</span>
                        <Star className="w-2.5 h-2.5 fill-white text-white" />
                      </div>
                      <span className="font-bold text-xs text-gray-900">{rev.title || "Great product"}</span>
                    </div>
                    <p className="text-xs text-gray-700 leading-relaxed">{rev.comment}</p>
                    <div className="flex items-center gap-2 text-[11px] text-gray-400">
                      <span>{rev.user?.name || "Customer"}</span>
                      {rev.isVerifiedPurchase && (
                        <span className="text-emerald-600 flex items-center gap-0.5 font-medium">
                          <CheckCircle2 className="w-3 h-3" /> Certified Buyer
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Similar Products (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-gray-900 text-sm">Similar Products</h3>
            <div className="space-y-4">
              {similarProducts.map((p) => (
                <Link
                  key={p.id}
                  href={`/product/${p.slug}`}
                  className="flex items-center gap-3 group border-b border-gray-50 pb-3 last:border-0 last:pb-0"
                >
                  <div className="w-16 h-16 rounded-lg bg-gray-50 p-1 flex-shrink-0">
                    <img
                      src={p.images?.[0]?.url || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=150&q=80"}
                      alt=""
                      className="w-full h-full object-contain group-hover:scale-105 transition"
                    />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-gray-800 line-clamp-1 group-hover:text-blue-600">
                      {p.title}
                    </h4>
                    <p className="text-xs font-bold text-gray-900 mt-1">
                      ₹{p.price.toLocaleString("en-IN")}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
