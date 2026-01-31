/// <reference types="vitest/globals" />
import 'dotenv/config';

if (!process.env.NODE_ENV) {
  (process.env as any).NODE_ENV = 'test';
}

