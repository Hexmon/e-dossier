// src\app\db\client.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { normalizeDatabaseUrl } from '@/app/db/connectionString';

const { Pool } = pg;
const pool = new Pool({
  connectionString: normalizeDatabaseUrl(process.env.DATABASE_URL),
  ssl: process.env.DATABASE_SSL_ENABLED === 'true'
    ? {
        rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false',
        ca: process.env.DATABASE_SSL_CA || undefined,
      }
    : false,
});

export const db = drizzle(pool);
