import { spawnSync } from 'node:child_process';

const standalone = process.argv.includes('--standalone');
const env = {
  ...process.env,
  ...(standalone ? { NEXT_BUILD_STANDALONE: 'true' } : {}),
};

const nextBin = require.resolve('next/dist/bin/next');
const result = spawnSync(process.execPath, [nextBin, 'build'], {
  stdio: 'inherit',
  env,
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
