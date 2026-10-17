// lib/auth.ts
// NextAuth configuration – email + password only.
// Phone login, SMS OTP, and demo fallback removed.

import NextAuth, { CredentialsSignin } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

// ──────────────────────────────────────────────────────────
// Custom error classes (extend CredentialsSignin so NextAuth
// exposes them via res.error without a 500)
// ──────────────────────────────────────────────────────────
export class EmailNotVerifiedError extends CredentialsSignin {
  code = "EMAIL_NOT_VERIFIED";
}

export class AccountBlockedError extends CredentialsSignin {
  code = "ACCOUNT_BLOCKED";
}

export class AccountInactiveError extends CredentialsSignin {
  code = "ACCOUNT_INACTIVE";
}

// ──────────────────────────────────────────────────────────
// In-memory 60s cache for JWT user existence checks
// ──────────────────────────────────────────────────────────
interface UserCacheEntry {
  exists: boolean;
  role?: string;
  isBlocked?: boolean;
  isActive?: boolean;
  timestamp: number;
}
const userValidationCache = new Map<string, UserCacheEntry>();

export function invalidateUserCache(userId: string) {
  userValidationCache.delete(userId);
}

export async function getCurrentUserOrThrow() {
  const session = await auth();
  if (!session?.user?.id) {
    const error: any = new Error("Unauthorized");
    error.statusCode = 401;
    error.code = "UNAUTHORIZED";
    throw error;
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      walletBalance: true,
      isActive: true,
      isBlocked: true,
    },
  });

  if (!user || user.isBlocked || !user.isActive) {
    userValidationCache.set(session.user.id, { exists: false, timestamp: Date.now() });
    const error: any = new Error("Your session expired, please sign in again");
    error.statusCode = 401;
    error.code = "SESSION_EXPIRED";
    throw error;
  }

  return user;
}

// ──────────────────────────────────────────────────────────
// NextAuth config
// ──────────────────────────────────────────────────────────
export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(db) as never,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const { email, password } = credentials as {
          email?: string;
          password?: string;
        };

        if (!email || !password) return null;

        const normalizedEmail = email.trim().toLowerCase();

        let user = null;
        try {
          user = await db.user.findUnique({
            where: { email: normalizedEmail },
            select: {
              id: true,
              email: true,
              name: true,
              image: true,
              role: true,
              password: true,
              emailVerified: true,
              isBlocked: true,
              isActive: true,
            },
          });
        } catch (dbErr) {
          console.error("[AUTH] DB query error during credentials login:", dbErr);
          return null;
        }

        if (!user || !user.password) return null;

        // Check account status BEFORE password to give consistent timing
        if (user.isBlocked) throw new AccountBlockedError();
        if (!user.isActive) throw new AccountInactiveError();

        // Constant-time password check
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) return null;

        // Block login for unverified emails
        if (!user.emailVerified) throw new EmailNotVerifiedError();

        // Update in-memory cache
        userValidationCache.set(user.id, {
          exists: true,
          role: user.role,
          isBlocked: false,
          isActive: true,
          timestamp: Date.now(),
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        };
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
      }

      if (trigger === "update" && session) {
        token.name = session.name;
        token.role = session.role;
      }

      // Authoritative user existence check with 60-second caching
      if (token.id) {
        const userId = token.id as string;
        const now = Date.now();
        const cached = userValidationCache.get(userId);

        let userState = cached && now - cached.timestamp < 60_000 ? cached : null;

        if (!userState) {
          try {
            const dbUser = await db.user.findUnique({
              where: { id: userId },
              select: { id: true, role: true, isBlocked: true, isActive: true },
            });
            if (dbUser) {
              userState = {
                exists: true,
                role: dbUser.role,
                isBlocked: dbUser.isBlocked,
                isActive: dbUser.isActive,
                timestamp: now,
              };
            } else {
              userState = {
                exists: false,
                timestamp: now,
              };
            }
            userValidationCache.set(userId, userState);
          } catch {
            // DB offline - fallback
          }
        }

        // If user no longer exists in DB (e.g. reset/re-seed) or is inactive/blocked, INVALIDATE TOKEN
        if (userState && (!userState.exists || userState.isBlocked || !userState.isActive)) {
          return null as never;
        }

        if (userState?.role) {
          token.role = userState.role;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (!token || !token.id) {
        return null as never;
      }
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          const existingUser = await db.user.findUnique({
            where: { email: user.email! },
          });
          if (!existingUser) return true;
          if (existingUser.isBlocked) return false;
        } catch {
          return true;
        }
      }
      return true;
    },
  },
  events: {
    async createUser({ user }) {
      // Google OAuth users are automatically email-verified
      if (user.id) {
        try {
          await db.user.update({
            where: { id: user.id },
            data: { role: "CUSTOMER", emailVerified: true },
          });
        } catch {
          // DB offline – ignore
        }
      }
    },
  },
});
