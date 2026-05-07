/**
 * NigWrite Turso Database Migration Script
 *
 * Pushes the Prisma schema to a Turso cloud database.
 * Designed to run as a build step on Vercel or manually.
 *
 * Usage:
 *   node scripts/migrate-turso.js
 *
 * Required env vars (set by Vercel Turso integration):
 *   STORAGE_URL - Turso database URL (e.g., libsql://nigwrite-xxx.turso.io)
 *   STORAGE_AUTH_TOKEN - Turso auth token
 */

import { createClient } from "@libsql/client";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function migrate() {
  const url = process.env.STORAGE_URL;
  const authToken = process.env.STORAGE_AUTH_TOKEN;

  if (!url) {
    console.log("⏭️  STORAGE_URL not set — skipping Turso migration (local dev mode)");
    process.exit(0);
  }

  console.log("🔧 Connecting to Turso...");

  const client = createClient({
    url,
    authToken: authToken || undefined,
  });

  // Read the migration SQL
  const sqlPath = join(__dirname, "migration.sql");
  const migrationSql = readFileSync(sqlPath, "utf-8");

  // Split into individual statements and reorder for FK constraints
  // Tables must be created before tables that reference them
  const createOrder = [
    "DeveloperMeta",
    "Institution",
    "User",
    "Document",
    "ScanReport",
    "FlaggedSegment",
    "SourceDocument",
    "Fingerprint",
    "Course",
    "Assignment",
    "Submission",
    "Notification",
    "Rubric",
    "RubricCriteria",
    "RubricLevel",
    "InlineComment",
    "QuickMark",
    "VoiceComment",
    "RubricScore",
    "Enrollment",
    "AuditLog",
    "SystemSettings",
    "PeerReview",
    "PeerReviewCriteriaScore",
    "ReportShare",
    "ApiKey",
    "Webhook",
  ];

  // Parse CREATE TABLE statements
  const statements = migrationSql
    .split("\n\n")
    .map((block) => block.trim())
    .filter((block) => block.length > 0 && !block.startsWith("--"));

  // Separate CREATE TABLE and CREATE INDEX statements
  const tableStatements = {};
  const indexStatements = [];

  for (const stmt of statements) {
    if (stmt.startsWith("CREATE TABLE")) {
      // Extract table name
      const match = stmt.match(/CREATE TABLE "(\w+)"/);
      if (match) {
        tableStatements[match[1]] = stmt;
      }
    } else if (stmt.startsWith("CREATE")) {
      indexStatements.push(stmt);
    }
  }

  console.log("🚀 Running migration on Turso...");

  // Create tables in correct order with IF NOT EXISTS
  for (const tableName of createOrder) {
    const stmt = tableStatements[tableName];
    if (stmt) {
      // Replace CREATE TABLE with CREATE TABLE IF NOT EXISTS
      const safeStmt = stmt.replace(
        "CREATE TABLE",
        "CREATE TABLE IF NOT EXISTS"
      );
      try {
        await client.execute(safeStmt);
        console.log(`  ✅ ${tableName}`);
      } catch (err) {
        console.error(`  ❌ ${tableName}: ${err.message}`);
      }
    }
  }

  // Create indexes with IF NOT EXISTS
  for (const stmt of indexStatements) {
    const safeStmt = stmt
      .replace("CREATE UNIQUE INDEX", "CREATE UNIQUE INDEX IF NOT EXISTS")
      .replace("CREATE INDEX", "CREATE INDEX IF NOT EXISTS");
    try {
      await client.execute(safeStmt);
    } catch (err) {
      console.log(`  ⚠️  Index skipped: ${err.message}`);
    }
  }

  // Enable foreign keys
  await client.execute("PRAGMA foreign_keys = ON;");

  console.log("✨ Migration complete!");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
