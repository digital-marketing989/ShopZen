import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

interface AuthUserRole {
  role?: string;
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Admin routes: require admin role, otherwise redirect to home
  if (pathname.startsWith("/admin")) {
    const role = (session?.user as AuthUserRole)?.role;
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  // Seller routes
  if (pathname.startsWith("/seller")) {
    const role = (session?.user as AuthUserRole)?.role;
    if (role !== "SELLER" && role !== "ADMIN" && role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  // All store, cart, checkout, orders and account pages open directly without login
  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
