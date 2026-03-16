import fs from 'node:fs';
import path from 'node:path';

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const;

export type HttpMethod = (typeof HTTP_METHODS)[number];

export type ApiCoverageGroup = {
  testFile: string;
  routeFiles: string[];
};

export type ApiRouteMethod = {
  method: HttpMethod;
  routeFile: string;
  routePath: string;
};

export function toPosix(value: string): string {
  return value.split(path.sep).join('/');
}

export function walkFiles(rootDir: string, include: (filePath: string) => boolean): string[] {
  const out: string[] = [];

  function walk(currentDir: string): void {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && include(fullPath)) {
        out.push(toPosix(fullPath));
      }
    }
  }

  if (fs.existsSync(rootDir)) {
    walk(rootDir);
  }

  return out.sort((left, right) => left.localeCompare(right));
}

export function discoverApiRouteFiles(rootDir = path.join(process.cwd(), 'src/app/api/v1')): string[] {
  return walkFiles(rootDir, (filePath) => toPosix(filePath).endsWith('/route.ts')).map((filePath) =>
    toPosix(path.relative(process.cwd(), filePath)),
  );
}

export function discoverApiTestFiles(rootDir = path.join(process.cwd(), 'tests/api')): string[] {
  return walkFiles(rootDir, (filePath) => /\.test\.(ts|tsx)$/.test(toPosix(filePath))).map((filePath) =>
    toPosix(path.relative(process.cwd(), filePath)),
  );
}

export function routeTemplateFromFile(filePath: string): string {
  const absoluteFilePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  const rel = toPosix(path.relative(process.cwd(), absoluteFilePath));
  const noPrefix = rel.replace(/^src\/app/, '');
  const noSuffix = noPrefix.replace(/\/route\.ts$/, '');

  return noSuffix;
}

export function routePathFromFile(filePath: string): string {
  return routeTemplateFromFile(filePath)
    .replace(/\[\.\.\.([^\]]+)\]/g, ':$1*')
    .replace(/\[([^\]]+)\]/g, ':$1');
}

export function routeImportPathFromFile(filePath: string): string {
  const absoluteFilePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  const rel = toPosix(path.relative(path.join(process.cwd(), 'src'), absoluteFilePath));
  return `@/${rel.replace(/\.ts$/, '')}`;
}

export function readExportedMethods(filePath: string): HttpMethod[] {
  const source = fs.readFileSync(filePath, 'utf8');
  return HTTP_METHODS.filter((method) => {
    const pattern = new RegExp(`export\\s+const\\s+${method}\\s*=`);
    return pattern.test(source);
  });
}

export function expandRouteFilesToMethods(routeFiles: string[]): ApiRouteMethod[] {
  return routeFiles.flatMap((routeFile) => {
    const routePath = routePathFromFile(routeFile);
    return readExportedMethods(routeFile).map((method) => ({
      method,
      routeFile,
      routePath,
    }));
  });
}

export function extractImportedRouteFilesFromTest(testFile: string): string[] {
  const source = fs.readFileSync(path.join(process.cwd(), testFile), 'utf8');
  const importedRouteFiles = new Set<string>();

  for (const match of source.matchAll(/from\s+['"](@\/app\/api\/[^'"]+\/route)['"]/g)) {
    const routeImportPath = match[1];
    const rel = routeImportPath.replace(/^@\//, 'src/');
    importedRouteFiles.add(toPosix(`${rel}.ts`));
  }

  return [...importedRouteFiles].sort((left, right) => left.localeCompare(right));
}

export function discoverDirectApiCoverageFromTests(
  rootDir = path.join(process.cwd(), 'tests/api'),
  excludeTestFiles: string[] = [],
): ApiCoverageGroup[] {
  const exclude = new Set(excludeTestFiles.map((filePath) => toPosix(filePath)));

  return discoverApiTestFiles(rootDir)
    .map((testFile) => {
      const routeFiles = extractImportedRouteFilesFromTest(testFile);
      return {
        testFile: toPosix(testFile),
        routeFiles,
      };
    })
    .filter((group) => group.routeFiles.length > 0 && !exclude.has(group.testFile))
    .sort((left, right) => left.testFile.localeCompare(right.testFile));
}
