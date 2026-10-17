import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { Providers } from "@/components/providers";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "ShopZen — Shop Everything, Everywhere",
    template: "%s | ShopZen",
  },
  description:
    "ShopZen is India's leading multi-vendor marketplace. Shop from millions of products across electronics, fashion, home, sports, and more.",
  keywords: ["online shopping", "marketplace", "electronics", "fashion", "deals"],
  authors: [{ name: "ShopZen" }],
  creator: "ShopZen",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "ShopZen",
    title: "ShopZen — Shop Everything, Everywhere",
    description: "India's leading multi-vendor marketplace",
  },
  twitter: {
    card: "summary_large_image",
    title: "ShopZen",
    description: "India's leading multi-vendor marketplace",
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#1a56db",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>
          {children}
          <Toaster
            position="top-right"
            richColors
            closeButton
            expand={false}
            duration={3000}
          />
        </Providers>
      </body>
    </html>
  );
}
