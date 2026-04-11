// src\app\db\drizzle.config.ts
import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';
import { normalizeDatabaseUrl } from './connectionString';

export default defineConfig({
    dialect: 'postgresql',
    // was './src/db/schema/**/*.ts'
    schema: ['./src/app/db/schema/**/*.ts'],
    out: './drizzle',
    dbCredentials: { url: normalizeDatabaseUrl(process.env.DATABASE_URL)! },
    strict: true,
    verbose: true,
});
