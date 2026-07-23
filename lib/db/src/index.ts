import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const databaseUrl = new URL(process.env.DATABASE_URL);

// Supabase direct database hosts are IPv6-only. Vercel Functions need the
// IPv4-compatible pooler, so transparently normalize direct project URLs.
if (databaseUrl.hostname.startsWith("db.")) {
  const projectRef = databaseUrl.hostname.split(".")[1];
  databaseUrl.hostname =
    process.env.SUPABASE_DB_POOLER_HOST ??
    "aws-0-eu-west-3.pooler.supabase.com";
  databaseUrl.port = process.env.SUPABASE_DB_POOLER_PORT ?? "5432";
  databaseUrl.username = `postgres.${projectRef}`;
}

export const pool = new Pool({ connectionString: databaseUrl.toString() });
export const db = drizzle(pool, { schema });

export * from "./schema";
