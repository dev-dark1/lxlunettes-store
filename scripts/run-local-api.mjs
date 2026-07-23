import { loadEnvFile } from 'node:process';

loadEnvFile(new URL('../.env', import.meta.url));

process.env.PORT = process.env.API_PORT || '5173';

// Supabase direct database hosts are IPv6-only. Use the session pooler for
// local environments that do not have IPv6 connectivity.
if (process.env.DATABASE_URL) {
  const databaseUrl = new URL(process.env.DATABASE_URL);
  if (databaseUrl.hostname.startsWith('db.')) {
    const projectRef = databaseUrl.hostname.split('.')[1];
    databaseUrl.hostname = process.env.SUPABASE_DB_POOLER_HOST || 'aws-0-eu-west-3.pooler.supabase.com';
    databaseUrl.port = '5432';
    databaseUrl.username = `postgres.${projectRef}`;
    process.env.DATABASE_URL = databaseUrl.toString();
  }
}

await import('../artifacts/api-server/dist/index.mjs');
