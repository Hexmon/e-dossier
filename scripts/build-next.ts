import { spawnSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import path from 'node:path';

const standalone = process.argv.includes('--standalone');
const env = {
  ...process.env,
  ...(standalone ? { NEXT_BUILD_STANDALONE: 'true' } : {}),
};

const nextDir = path.join(process.cwd(), '.next');
const staleBuildArtifacts = [
  'server',
  'static',
  'types',
  'app-build-manifest.json',
  'app-path-routes-manifest.json',
  'build-manifest.json',
  'package.json',
  'react-loadable-manifest.json',
  'trace',
];

for (const artifact of staleBuildArtifacts) {
  const target = path.join(nextDir, artifact);
  if (!existsSync(target)) continue;
  rmSync(target, { force: true, recursive: true });
}

const nextBin = require.resolve('next/dist/bin/next');
const result = spawnSync(process.execPath, [nextBin, 'build'], {
  stdio: 'inherit',
  env,
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
