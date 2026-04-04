import fs from 'node:fs';
import path from 'node:path';
import {
  discoverApiRouteFiles,
  expandRouteFilesToMethods,
  toPosix,
} from './lib/api-route-inventory';
import { getApiCoverageGroups, getApiCoverageMethodMap } from '../tests/api/coverage.manifest';

function printList(title: string, rows: string[]) {
  console.error(`\n${title}`);
  for (const row of rows) {
    console.error(`  - ${row}`);
  }
}

function main() {
  const discoveredRouteFiles = discoverApiRouteFiles(path.join(process.cwd(), 'src/app/api/v1'));
  const discoveredMethods = expandRouteFilesToMethods(discoveredRouteFiles);
  const discoveredMethodKeys = new Set(
    discoveredMethods.map((entry) => `${entry.method} ${entry.routePath}`),
  );

  const coverageGroups = getApiCoverageGroups();
  const missingTestFiles = coverageGroups
    .map((group) => toPosix(group.testFile))
    .filter((testFile, index, all) => all.indexOf(testFile) === index)
    .filter((testFile) => !fs.existsSync(path.join(process.cwd(), testFile)))
    .sort();

  const missingRouteFiles = coverageGroups
    .flatMap((group) =>
      group.routeFiles
        .map((routeFile) => toPosix(routeFile))
        .filter((routeFile) => !fs.existsSync(path.join(process.cwd(), routeFile))),
    )
    .sort();

  const coveredMethodMap = getApiCoverageMethodMap();
  const coveredMethodKeys = new Set(coveredMethodMap.keys());

  const missingCoverage = [...discoveredMethodKeys].filter((key) => !coveredMethodKeys.has(key)).sort();
  const staleCoverage = [...coveredMethodKeys].filter((key) => !discoveredMethodKeys.has(key)).sort();

  const duplicateCoverage = [...coveredMethodMap.entries()]
    .filter(([, testFiles]) => new Set(testFiles).size !== testFiles.length)
    .map(([methodKey, testFiles]) => `${methodKey} -> ${testFiles.join(', ')}`)
    .sort();

  const hasErrors =
    missingTestFiles.length > 0 ||
    missingRouteFiles.length > 0 ||
    missingCoverage.length > 0 ||
    staleCoverage.length > 0 ||
    duplicateCoverage.length > 0;

  if (hasErrors) {
    console.error('API test coverage check failed.');
    if (missingTestFiles.length) printList('Missing test files referenced by coverage manifest:', missingTestFiles);
    if (missingRouteFiles.length) printList('Missing route files referenced by coverage manifest:', missingRouteFiles);
    if (missingCoverage.length) printList('API methods without tests/api coverage entries:', missingCoverage);
    if (staleCoverage.length) printList('Stale coverage entries (method route no longer exists):', staleCoverage);
    if (duplicateCoverage.length) printList('Duplicate manifest entries for the same test file:', duplicateCoverage);
    process.exit(1);
  }

  console.log(
    `API test coverage check passed: ${coveredMethodKeys.size}/${discoveredMethodKeys.size} API methods mapped across ${coverageGroups.length} tests.`,
  );
}

main();
