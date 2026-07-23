import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { adminUsersTable, db, pool } from "@workspace/db";
import { logger } from "./logger";

export async function ensureAdminAuthSetup(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email text NOT NULL UNIQUE,
      password_hash text NOT NULL,
      is_active boolean NOT NULL DEFAULT true,
      last_login_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS otp_requests (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email text NOT NULL,
      otp_hash text NOT NULL,
      reset_token text,
      used boolean NOT NULL DEFAULT false,
      expires_at timestamptz NOT NULL,
      attempts_count integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await pool.query("CREATE INDEX IF NOT EXISTS otp_requests_email_created_idx ON otp_requests (email, created_at DESC)");
  await pool.query("CREATE UNIQUE INDEX IF NOT EXISTS otp_requests_reset_token_idx ON otp_requests (reset_token) WHERE reset_token IS NOT NULL");

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    logger.warn("ADMIN_EMAIL or ADMIN_PASSWORD is missing; admin bootstrap was skipped");
    return;
  }

  const [existing] = await db.select({ id: adminUsersTable.id }).from(adminUsersTable).where(eq(adminUsersTable.email, email)).limit(1);
  if (!existing) {
    const passwordHash = await bcrypt.hash(password, 12);
    await db.insert(adminUsersTable).values({ email, passwordHash, isActive: true });
    logger.info("Initial admin account created");
  }
}
