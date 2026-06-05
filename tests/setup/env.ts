/// <reference types="vitest/globals" />
import 'dotenv/config';

if (!process.env.NODE_ENV) {
  (process.env as any).NODE_ENV = 'test';
}

process.env.AUTHZ_V2_ENABLED = 'false';
process.env.NEXT_PUBLIC_AUTHZ_V2_ENABLED = 'false';
