import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getPrismaClient(): PrismaClient {
  let dbUrl = process.env.DATABASE_URL;

  // On Vercel serverless lambdas, the root filesystem is read-only.
  // If using SQLite file: URL, copy the database to /tmp so write operations succeed.
  if (process.env.VERCEL && (!dbUrl || dbUrl.startsWith("file:"))) {
    try {
      const tmpDb = path.join("/tmp", "dev.db");
      if (!fs.existsSync(tmpDb)) {
        const candidates = [
          path.join(process.cwd(), "prisma", "dev.db"),
          path.join(process.cwd(), "dev.db"),
        ];
        for (const candidate of candidates) {
          if (fs.existsSync(candidate)) {
            fs.copyFileSync(candidate, tmpDb);
            break;
          }
        }
      }
      dbUrl = `file:${tmpDb}`;
    } catch (err) {
      console.warn("Could not copy SQLite database to /tmp:", err);
    }
  }

  return new PrismaClient({
    datasources: dbUrl ? { db: { url: dbUrl } } : undefined,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const db = globalForPrisma.prisma ?? getPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
