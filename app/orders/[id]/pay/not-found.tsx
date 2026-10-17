import Link from "next/link";
import { ShoppingBag, ArrowLeft } from "lucide-react";
import { Header } from "@/components/store/header";
import { Footer } from "@/components/store/footer";

export default function OrderPayNotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <ShoppingBag className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Order Not Found
            </h2>
            <p className="text-sm text-gray-500 mt-2">
              The order you are looking for does not exist or has been removed.
            </p>
          </div>

          <div className="pt-2">
            <Link
              href="/orders"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 text-xs shadow-xs transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to my orders</span>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
