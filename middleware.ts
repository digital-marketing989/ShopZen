import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

interface AuthUserRole {
  role?: string;
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Admin routes
  if (pathname.startsWith("/admin")) {
    if (!session) {
      return NextResponse.redirect(new URL("/auth/login?callbackUrl=/admin", req.url));
    }
    const role = (session.user as AuthUserRole)?.role;
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  // Seller routes
  if (pathname.startsWith("/seller")) {
    if (!session) {
      return NextResponse.redirect(new URL("/auth/login?callbackUrl=/seller", req.url));
    }
    const role = (session.user as AuthUserRole)?.role;
    if (role !== "SELLER" && role !== "ADMIN" && role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/seller/register", req.url));
    }
    return NextResponse.next();
  }

  // Protected customer routes
  if (
    pathname.startsWith("/account") ||
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/orders")
  ) {
    if (!session) {
      return NextResponse.redirect(
        new URL(`/auth/login?callbackUrl=${pathname}`, req.url)
      );
    }
    return NextResponse.next();
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
