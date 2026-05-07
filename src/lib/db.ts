import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient, type Client } from "@libsql/client";

/**
 * NigWrite Database Connection
 *
 * Supports two modes:
 * 1. LOCAL DEV: Uses DATABASE_URL from .env (local SQLite file via standard Prisma)
 * 2. VERCEL/PRODUCTION: Uses STORAGE_URL + STORAGE_AUTH_TOKEN from Vercel Turso integration
 *    with the Prisma libsql driver adapter for Turso cloud database
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createTursoClient(): Client {
  const url = process.env.STORAGE_URL;
  const authToken = process.env.STORAGE_AUTH_TOKEN;

  if (!url) {
    throw new Error("STORAGE_URL environment variable is required for Turso");
  }

  return createClient({
    url,
    authToken: authToken || undefined,
  });
}

function createPrismaClient(): PrismaClient {
  // Check if we're on Vercel with Turso integration
  const storageUrl = process.env.STORAGE_URL;

  if (storageUrl) {
    // Production: Use Turso via libsql adapter
    const libsql = createTursoClient();
    const adapter = new PrismaLibSQL(libsql);

    return new PrismaClient({
      adapter,
      log:
        process.env.NODE_ENV === "development"
          ? ["query", "info", "warn", "error"]
          : ["error"],
    });
  }

  // Local development: Use standard SQLite
  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "info", "warn", "error"]
        : ["error"],
  });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
