import Link from "next/link";
import {
  ShieldCheck,
  Truck,
  RotateCcw,
  Headphones,
  CreditCard,
  Heart,
} from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      {/* Features strip */}
      <div className="border-b border-gray-800 bg-gray-950/60 py-6">
        <div className="container mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-600/10 text-blue-400">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <p className="font-semibold text-white text-sm">Free Delivery</p>
              <p className="text-xs text-gray-400">For orders above ₹500</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-600/10 text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="font-semibold text-white text-sm">100% Authentic</p>
              <p className="text-xs text-gray-400">Direct from verified sellers</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-600/10 text-amber-400">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <p className="font-semibold text-white text-sm">7-Day Easy Returns</p>
              <p className="text-xs text-gray-400">Hassle-free replacement</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-purple-600/10 text-purple-400">
              <Headphones className="w-6 h-6" />
            </div>
            <div>
              <p className="font-semibold text-white text-sm">24/7 Support</p>
              <p className="text-xs text-gray-400">Dedicated customer care</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main footer links */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="col-span-2">
            <Link href="/" className="inline-flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white text-xl shadow-md">
                S
              </div>
              <span className="text-2xl font-black tracking-tight text-white">
                Shop<span className="text-blue-500">Zen</span>
              </span>
            </Link>
            <p className="text-sm text-gray-400 max-w-sm mb-4 leading-relaxed">
              India's premier multi-vendor e-commerce marketplace. Discover millions of products across electronics, fashion, lifestyle, home decor, and daily essentials with guaranteed authentic quality.
            </p>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <CreditCard className="w-4 h-4 text-blue-400" />
              <span>UPI · Cards · Net Banking via Cashfree</span>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white mb-4">
              Shop Categories
            </h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="/category/electronics" className="hover:text-blue-400 transition">Electronics</Link></li>
              <li><Link href="/category/mobiles-tablets" className="hover:text-blue-400 transition">Mobiles & Tablets</Link></li>
              <li><Link href="/category/fashion" className="hover:text-blue-400 transition">Men & Women Fashion</Link></li>
              <li><Link href="/category/home-furniture" className="hover:text-blue-400 transition">Home & Furniture</Link></li>
              <li><Link href="/category/beauty-personal-care" className="hover:text-blue-400 transition">Beauty & Care</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white mb-4">
              Customer Care
            </h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="/sale" className="hover:text-amber-400 transition font-bold text-amber-300">🪔 Maha Sale Deals</Link></li>
              <li><Link href="/orders" className="hover:text-blue-400 transition">Track Your Order</Link></li>
              <li><Link href="/account" className="hover:text-blue-400 transition">Your Account</Link></li>
              <li><Link href="/cart" className="hover:text-blue-400 transition">Cart & Checkout</Link></li>
              <li><Link href="/wishlist" className="hover:text-blue-400 transition">Wishlist</Link></li>
              <li><Link href="/help" className="hover:text-blue-400 transition">Help Center / FAQs</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white mb-4">
              Business & Portal
            </h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="/sale-terms" className="hover:text-amber-300 transition font-semibold text-amber-400">Maha Sale Terms</Link></li>
              <li><Link href="/seller" className="hover:text-blue-400 transition font-medium text-amber-400">Sell on ShopZen</Link></li>
              <li><Link href="/admin" className="hover:text-blue-400 transition font-medium text-blue-400">Admin Console</Link></li>
              <li><Link href="/privacy" className="hover:text-blue-400 transition">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-blue-400 transition">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between text-xs text-gray-500 gap-4">
          <p>© {new Date().getFullYear()} ShopZen Marketplace Inc. All rights reserved.</p>
          <div className="flex items-center gap-1">
            <span>Crafted for high performance & reliability with</span>
            <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500 mx-1" />
          </div>
        </div>
      </div>
    </footer>
  );
}
