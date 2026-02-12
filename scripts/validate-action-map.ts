import fs from 'node:fs';
import path from 'node:path';
import { API_ACTION_MAP, PAGE_ACTION_MAP, type HttpMethod } from '../src/app/lib/acx/action-map';

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

function toPosix(value: string): string {
  return value.split(path.sep).join('/');
}

function walkFiles(rootDir: string, include: (filePath: string) => boolean): string[] {
  const out: string[] = [];

  function walk(dir: string): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && include(fullPath)) {
        out.push(fullPath);
      }
    }
  }

  if (fs.existsSync(rootDir)) walk(rootDir);
  return out.sort((a, b) => toPosix(a).localeCompare(toPosix(b)));
}

function routeTemplateFromFile(filePath: string): string {
  const rel = toPosix(path.relative(process.cwd(), filePath));
  const noPrefix = rel.replace(/^src\/app/, '');
  const noSuffix = noPrefix.replace(/\/route\.ts$/, '');

  return noSuffix
    .replace(/\[\.\.\.([^\]]+)\]/g, ':$1*')
    .replace(/\[([^\]]+)\]/g, ':$1');
}

function pageRouteFromFile(filePath: string): string {
  const rel = toPosix(path.relative(process.cwd(), filePath));
  const noPrefix = rel.replace(/^src\/app\//, '');
  const noSuffix = noPrefix.replace(/\/page\.tsx$/, '');

  return ('/' + noSuffix)
    .replace(/\[\.\.\.([^\]]+)\]/g, ':$1*')
    .replace(/\[([^\]]+)\]/g, ':$1');
}

function readExportedMethods(filePath: string): HttpMethod[] {
  const source = fs.readFileSync(filePath, 'utf8');
  return HTTP_METHODS.filter((method) => {
    const pattern = new RegExp(`export\\s+const\\s+${method}\\s*=`);
    return pattern.test(source);
  });
}

function printList(title: string, rows: string[]): void {
  console.error(`\n${title}`);
  for (const row of rows) {
    console.error(`  - ${row}`);
  }
}

function main(): void {
  const apiRouteFiles = walkFiles(path.join(process.cwd(), 'src/app/api/v1'), (filePath) =>
    filePath.endsWith('/route.ts')
  );
  const dashboardPageFiles = walkFiles(path.join(process.cwd(), 'src/app/dashboard'), (filePath) =>
    filePath.endsWith('/page.tsx')
  );

  const discoveredApiKeys: string[] = [];
  for (const filePath of apiRouteFiles) {
    const routePath = routeTemplateFromFile(filePath);
    const methods = readExportedMethods(filePath);
    for (const method of methods) {
      discoveredApiKeys.push(`${method} ${routePath}`);
    }
  }

  const apiMapKeys = API_ACTION_MAP
    .filter((entry) => entry.path.startsWith('/api/v1/'))
    .map((entry) => `${entry.method} ${entry.path}`);
  const discoveredPageRoutes = dashboardPageFiles.map((filePath) => pageRouteFromFile(filePath));
  const pageMapRoutes = PAGE_ACTION_MAP
    .filter((entry) => entry.route.startsWith('/dashboard'))
    .map((entry) => entry.route);

  const discoveredApiSet = new Set(discoveredApiKeys);
  const apiMapSet = new Set(apiMapKeys);
  const discoveredPageSet = new Set(discoveredPageRoutes);
  const pageMapSet = new Set(pageMapRoutes);

  const missingApiMappings = [...discoveredApiSet].filter((key) => !apiMapSet.has(key)).sort();
  const staleApiMappings = [...apiMapSet].filter((key) => !discoveredApiSet.has(key)).sort();
  const missingPageMappings = [...discoveredPageSet].filter((route) => !pageMapSet.has(route)).sort();
  const stalePageMappings = [...pageMapSet].filter((route) => !discoveredPageSet.has(route)).sort();

  const hasErrors =
    missingApiMappings.length > 0 ||
    staleApiMappings.length > 0 ||
    missingPageMappings.length > 0 ||
    stalePageMappings.length > 0;

  if (hasErrors) {
    console.error('Action map coverage check failed.');
    if (missingApiMappings.length) printList('Missing API action-map entries (method path):', missingApiMappings);
    if (staleApiMappings.length) printList('Stale API action-map entries (method path):', staleApiMappings);
    if (missingPageMappings.length) printList('Missing page action-map entries (route):', missingPageMappings);
    if (stalePageMappings.length) printList('Stale page action-map entries (route):', stalePageMappings);
    process.exit(1);
  }

  console.log(
    `Action map coverage check passed: ${discoveredApiKeys.length} API method mappings, ${discoveredPageRoutes.length} page mappings.`
  );
}

main();
