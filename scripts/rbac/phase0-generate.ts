import fs from 'node:fs';
import path from 'node:path';
import XLSX from 'xlsx';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

type RoleColumn = {
  roleLabel: string;
  roleKey: string;
  readCol: number;
  writeCol: number | null;
  noteCol: number | null;
};

type MatrixRow = {
  rowNumber: number;
  moduleName: string | null;
  subModuleName: string | null;
  remark: string | null;
  fieldName: string | null;
  dataType: string | null;
  permissions: Record<
    string,
    {
      displayName: string;
      read: boolean | null;
      write: boolean | null;
      note: string | null;
    }
  >;
};

type ApiMethodInventory = {
  key: string;
  method: HttpMethod;
  path: string;
  file: string;
  category: string;
  middlewarePublic: boolean;
  isWriteMethod: boolean;
  fieldLevelCandidate: boolean;
  requestBodyLikely: boolean;
  requestBodySchemaHints: string[];
  guardHints: string[];
  wrapperHints: string[];
  hasNodeRuntimeExport: boolean;
};

type PageInventory = {
  route: string;
  file: string;
  category: string;
  isAdminBaseline: boolean;
};

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

const PUBLIC_ANY = [
  '/api/v1/auth/login',
  '/api/v1/auth/signup',
  '/api/v1/auth/logout',
  '/api/v1/admin/users/check-username',
  '/api/v1/health',
  '/api/v1/bootstrap/super-admin',
];

const PUBLIC_BY_METHOD: Record<string, string[]> = {
  GET: ['/api/v1/admin/appointments', '/api/v1/admin/positions', '/api/v1/platoons'],
};

function toPosix(p: string): string {
  return p.split(path.sep).join('/');
}

function normalizeRoleName(roleLabel: string): string {
  return roleLabel
    .trim()
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')
    .toUpperCase();
}

function valueToString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return null;
}

function valueToBooleanOrNull(value: unknown): boolean | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const lower = value.trim().toLowerCase();
    if (!lower) return null;
    if (['true', 'yes', 'y', '1', 'allow', 'allowed'].includes(lower)) return true;
    if (['false', 'no', 'n', '0', 'deny', 'denied'].includes(lower)) return false;
  }
  return null;
}

function matchPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(prefix + '/');
}

function isPublicByMiddleware(pathname: string, method: string): boolean {
  if (!pathname.startsWith('/api/v1/')) return true;

  if (PUBLIC_ANY.some((p) => matchPrefix(pathname, p))) return true;

  const allowForMethod = PUBLIC_BY_METHOD[method.toUpperCase()] ?? [];
  if (allowForMethod.some((p) => matchPrefix(pathname, p))) return true;

  return false;
}

function walkFiles(rootDir: string, include: (filePath: string) => boolean): string[] {
  const out: string[] = [];

  const walk = (dir: string) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && include(fullPath)) {
        out.push(fullPath);
      }
    }
  };

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
  const route = '/' + noSuffix;

  return route
    .replace(/\[\.\.\.([^\]]+)\]/g, ':$1*')
    .replace(/\[([^\]]+)\]/g, ':$1');
}

function methodVerb(method: HttpMethod): 'read' | 'create' | 'update' | 'delete' {
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return 'read';
  if (method === 'POST') return 'create';
  if (method === 'DELETE') return 'delete';
  return 'update';
}

function actionSegmentsFromRoute(routePath: string): string[] {
  const apiSegments = routePath
    .replace(/^\/api\/v1\/?/, '')
    .split('/')
    .filter(Boolean)
    .filter((segment) => !segment.startsWith(':'));

  if (apiSegments.length) return apiSegments;
  return ['root'];
}

function pageActionSegments(pageRoute: string): string[] {
  const segments = pageRoute
    .replace(/^\//, '')
    .split('/')
    .filter(Boolean)
    .filter((segment) => !segment.startsWith(':'));

  if (segments.length) return segments;
  return ['root'];
}

function makeApiAction(method: HttpMethod, routePath: string): { action: string; resourceType: string } {
  const segments = actionSegmentsFromRoute(routePath);
  const resourceType = segments.join(':');
  const action = `${resourceType}:${methodVerb(method)}`;
  return { action, resourceType };
}

function makePageAction(routePath: string): { action: string; resourceType: string } {
  const segments = pageActionSegments(routePath);
  const pageResource = `page:${segments.join(':')}`;
  return {
    action: `${pageResource}:view`,
    resourceType: pageResource,
  };
}

function parsePermissionWorkbook(workbookPath: string) {
  const workbook = XLSX.readFile(workbookPath, { cellDates: true });
  if (!workbook.SheetNames.length) {
    throw new Error('Workbook has no sheets');
  }

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(sheet, {
    header: 1,
    defval: null,
    blankrows: false,
  });

  if (rows.length < 3) {
    throw new Error('Workbook does not contain expected header + permission rows');
  }

  const headerRow = rows[0] ?? [];
  const modeRow = rows[1] ?? [];

  const lowerHeader = headerRow.map((value) => valueToString(value)?.toLowerCase() ?? '');

  const moduleCol = lowerHeader.findIndex((v) => v.includes('module'));
  const subModuleCol = lowerHeader.findIndex((v) => v.includes('sub module'));
  const remarkCol = lowerHeader.findIndex((v) => v.includes('remark'));
  const fieldCol = lowerHeader.findIndex((v) => v.includes('field'));
  const dataTypeCol = lowerHeader.findIndex((v) => v.includes('data type'));

  const anchorCol = Math.max(moduleCol, subModuleCol, remarkCol, fieldCol, dataTypeCol);

  const roleColumns: RoleColumn[] = [];
  for (let col = anchorCol + 1; col < headerRow.length; col += 1) {
    const roleLabel = valueToString(headerRow[col]);
    if (!roleLabel) continue;

    const normalizedHeader = roleLabel.toLowerCase();
    if (normalizedHeader === 'note') continue;

    const modeAtCol = valueToString(modeRow[col])?.toLowerCase() ?? '';
    const modeAtNext = valueToString(modeRow[col + 1])?.toLowerCase() ?? '';

    // Typical matrix format: RoleName | (blank) with row2 = Read | Write
    const readCol = modeAtCol === 'read' ? col : col;
    const writeCol = modeAtNext === 'write' ? col + 1 : null;

    let noteCol: number | null = null;
    if (valueToString(headerRow[col + 2])?.toLowerCase() === 'note') noteCol = col + 2;

    roleColumns.push({
      roleLabel,
      roleKey: normalizeRoleName(roleLabel),
      readCol,
      writeCol,
      noteCol,
    });
  }

  const matrixRows: MatrixRow[] = [];
  let currentModule: string | null = null;
  let currentSubmodule: string | null = null;

  for (let i = 2; i < rows.length; i += 1) {
    const row = rows[i] ?? [];

    const moduleNameRaw = valueToString(row[moduleCol]);
    const subModuleNameRaw = valueToString(row[subModuleCol]);
    const remark = valueToString(row[remarkCol]);
    const fieldName = valueToString(row[fieldCol]);
    const dataType = valueToString(row[dataTypeCol]);

    if (moduleNameRaw) currentModule = moduleNameRaw;
    if (subModuleNameRaw) currentSubmodule = subModuleNameRaw;

    const moduleName = moduleNameRaw ?? currentModule;
    const subModuleName = subModuleNameRaw ?? currentSubmodule;

    if (!moduleName && !subModuleName && !fieldName) continue;

    const permissions: MatrixRow['permissions'] = {};
    for (const role of roleColumns) {
      permissions[role.roleKey] = {
        displayName: role.roleLabel,
        read: valueToBooleanOrNull(row[role.readCol]),
        write: role.writeCol !== null ? valueToBooleanOrNull(row[role.writeCol]) : null,
        note: role.noteCol !== null ? valueToString(row[role.noteCol]) : null,
      };
    }

    matrixRows.push({
      rowNumber: i + 1,
      moduleName,
      subModuleName,
      remark,
      fieldName,
      dataType,
      permissions,
    });
  }

  const modules = new Map<string, { moduleName: string; subModules: Map<string, MatrixRow[]> }>();

  for (const row of matrixRows) {
    const moduleName = row.moduleName ?? 'UNSPECIFIED_MODULE';
    const subModuleName = row.subModuleName ?? 'UNSPECIFIED_SUBMODULE';

    if (!modules.has(moduleName)) {
      modules.set(moduleName, { moduleName, subModules: new Map() });
    }
    const moduleNode = modules.get(moduleName)!;

    if (!moduleNode.subModules.has(subModuleName)) {
      moduleNode.subModules.set(subModuleName, []);
    }

    moduleNode.subModules.get(subModuleName)!.push(row);
  }

  const moduleSummary = Array.from(modules.values()).map((moduleNode) => ({
    moduleName: moduleNode.moduleName,
    subModules: Array.from(moduleNode.subModules.entries()).map(([name, fields]) => ({
      subModuleName: name,
      fieldCount: fields.length,
      fieldNames: fields.map((f) => f.fieldName).filter(Boolean),
    })),
  }));

  const roleSummary = roleColumns.map((role) => {
    let readAllowCount = 0;
    let writeAllowCount = 0;

    for (const row of matrixRows) {
      const perm = row.permissions[role.roleKey];
      if (!perm) continue;
      if (perm.read === true) readAllowCount += 1;
      if (perm.write === true) writeAllowCount += 1;
    }

    return {
      roleKey: role.roleKey,
      displayName: role.roleLabel,
      readAllowCount,
      writeAllowCount,
    };
  });

  return {
    source: {
      workbookPath: workbookPath,
      parsedAt: new Date().toISOString(),
      sheetName,
      sheetCount: workbook.SheetNames.length,
      totalRows: rows.length,
      headerRowNumber: 1,
      modeRowNumber: 2,
      dataStartsAtRowNumber: 3,
    },
    normalization: {
      roleKeyFormat: 'UPPER_SNAKE_CASE',
      inheritedModuleAndSubmoduleOnBlankRows: true,
      booleansDetectedFrom: ['boolean', 'number(0/1)', 'string(true/false/yes/no/allow/deny)'],
    },
    columns: {
      moduleCol,
      subModuleCol,
      remarkCol,
      fieldCol,
      dataTypeCol,
      roleColumns,
    },
    roles: roleSummary,
    moduleSummary,
    entries: matrixRows,
  };
}

function buildApiInventory(): {
  generatedAt: string;
  filesScanned: number;
  methodEntries: ApiMethodInventory[];
} {
  const files = walkFiles(path.join(process.cwd(), 'src/app/api/v1'), (filePath) => filePath.endsWith('/route.ts'));

  const methodEntries: ApiMethodInventory[] = [];

  for (const file of files) {
    const relFile = toPosix(path.relative(process.cwd(), file));
    const content = fs.readFileSync(file, 'utf8');
    const routePath = routeTemplateFromFile(file);
    const category = routePath.split('/').filter(Boolean)[2] ?? 'misc';

    const methods = new Set<HttpMethod>();
    for (const method of HTTP_METHODS) {
      const pattern = new RegExp(`\\bexport\\s+(?:const|async\\s+function)\\s+${method}\\b`, 'g');
      if (pattern.test(content)) methods.add(method);
    }

    const schemaHints = Array.from(
      new Set(Array.from(content.matchAll(/([A-Za-z0-9_]+(?:Schema|schema))\s*\.\s*(?:parse|safeParse)\s*\(/g)).map((m) => m[1]))
    ).sort();

    const guardCatalog = [
      'requireAuth',
      'requireAdmin',
      'mustBeAuthed',
      'mustBeAdmin',
      'authorizeOcAccess',
      'enforceScope',
      'verifyAccessToken',
    ];
    const guardHints = guardCatalog.filter((hint) => content.includes(hint));

    const wrapperCatalog = ['withAuditRoute', 'withRouteLogging'];
    const wrapperHints = wrapperCatalog.filter((hint) => content.includes(hint));

    const hasNodeRuntimeExport = /export\s+const\s+runtime\s*=\s*['"]nodejs['"]/.test(content);

    for (const method of methods) {
      const isWriteMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
      const fieldLevelCandidate = method === 'PATCH' || method === 'PUT';
      const requestBodyLikely = /\.json\s*\(/.test(content) && isWriteMethod;

      methodEntries.push({
        key: `${method} ${routePath}`,
        method,
        path: routePath,
        file: relFile,
        category,
        middlewarePublic: isPublicByMiddleware(routePath, method),
        isWriteMethod,
        fieldLevelCandidate,
        requestBodyLikely,
        requestBodySchemaHints: schemaHints,
        guardHints,
        wrapperHints,
        hasNodeRuntimeExport,
      });
    }
  }

  methodEntries.sort((a, b) => a.key.localeCompare(b.key) || a.file.localeCompare(b.file));

  return {
    generatedAt: new Date().toISOString(),
    filesScanned: files.length,
    methodEntries,
  };
}

function buildPageInventory(): {
  generatedAt: string;
  filesScanned: number;
  pages: PageInventory[];
} {
  const files = walkFiles(path.join(process.cwd(), 'src/app/dashboard'), (filePath) => filePath.endsWith('/page.tsx'));

  const pages: PageInventory[] = files.map((file) => {
    const relFile = toPosix(path.relative(process.cwd(), file));
    const route = pageRouteFromFile(file);

    const segments = route.split('/').filter(Boolean);
    const category = segments[1] ?? 'dashboard';
    const isAdminBaseline = route.startsWith('/dashboard/genmgmt') || route === '/dashboard/manage-marks';

    return {
      route,
      file: relFile,
      category,
      isAdminBaseline,
    };
  });

  pages.sort((a, b) => a.route.localeCompare(b.route));

  return {
    generatedAt: new Date().toISOString(),
    filesScanned: files.length,
    pages,
  };
}

function generateActionMapSource(apiInventory: { methodEntries: ApiMethodInventory[] }, pageInventory: { pages: PageInventory[] }): string {
  const apiEntries = apiInventory.methodEntries.map((entry) => {
    const { action, resourceType } = makeApiAction(entry.method, entry.path);
    const obj = {
      method: entry.method,
      path: entry.path,
      action,
      resourceType,
      category: entry.category,
      fieldLevelCandidate: entry.fieldLevelCandidate,
      adminBaseline: entry.path.startsWith('/api/v1/admin/'),
    };
    return obj;
  });

  const pageEntries = pageInventory.pages.map((entry) => {
    const { action, resourceType } = makePageAction(entry.route);
    return {
      route: entry.route,
      action,
      resourceType,
      category: entry.category,
      adminBaseline: entry.isAdminBaseline,
    };
  });

  const body = `export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export type ApiActionEntry = {
  method: HttpMethod;
  path: string;
  action: string;
  resourceType: string;
  category: string;
  fieldLevelCandidate: boolean;
  adminBaseline: boolean;
};

export type PageActionEntry = {
  route: string;
  action: string;
  resourceType: string;
  category: string;
  adminBaseline: boolean;
};

export const API_ACTION_MAP: ApiActionEntry[] = ${JSON.stringify(apiEntries, null, 2)};

export const PAGE_ACTION_MAP: PageActionEntry[] = ${JSON.stringify(pageEntries, null, 2)};

function templateToRegExp(pathTemplate: string): RegExp {
  const escaped = Array.from(pathTemplate)
    .map((ch) => ('.+*?^$()[]{}|\\\\'.includes(ch) ? '\\\\' + ch : ch))
    .join('');
  const withSplat = escaped.replace(/:[A-Za-z0-9_]+\\*/g, '.+');
  const withParams = withSplat.replace(/:[A-Za-z0-9_]+/g, '[^/]+');
  return new RegExp('^' + withParams + '$');
}

const API_ACTION_INDEX = API_ACTION_MAP.map((entry) => ({
  ...entry,
  pattern: templateToRegExp(entry.path),
}));

const PAGE_ACTION_INDEX = PAGE_ACTION_MAP.map((entry) => ({
  ...entry,
  pattern: templateToRegExp(entry.route),
}));

export function resolveApiAction(method: string, pathname: string): ApiActionEntry | null {
  const upperMethod = method.toUpperCase() as HttpMethod;
  for (const entry of API_ACTION_INDEX) {
    if (entry.method !== upperMethod) continue;
    if (entry.pattern.test(pathname)) return entry;
  }
  return null;
}

export function resolvePageAction(pathname: string): PageActionEntry | null {
  for (const entry of PAGE_ACTION_INDEX) {
    if (entry.pattern.test(pathname)) return entry;
  }
  return null;
}
`;

  return body;
}

function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(filePath: string, data: unknown): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function main(): void {
  const excelPathArg = process.argv[2];
  const defaultExcelPath = '/Users/anuragkumar/Downloads/E Dossier.xlsx';
  const workbookPath = excelPathArg ? path.resolve(excelPathArg) : defaultExcelPath;

  if (!fs.existsSync(workbookPath)) {
    throw new Error(`Excel file not found: ${workbookPath}`);
  }

  const docsRbacDir = path.join(process.cwd(), 'docs/rbac');
  ensureDir(docsRbacDir);

  const parsedMatrix = parsePermissionWorkbook(workbookPath);
  writeJson(path.join(docsRbacDir, 'permission-matrix.parsed.json'), parsedMatrix);

  const apiInventory = buildApiInventory();
  writeJson(path.join(docsRbacDir, 'surface-inventory.apis.json'), apiInventory);

  const pageInventory = buildPageInventory();
  writeJson(path.join(docsRbacDir, 'surface-inventory.pages.json'), pageInventory);

  const actionMapSource = generateActionMapSource(apiInventory, pageInventory);
  ensureDir(path.join(process.cwd(), 'src/app/lib/acx'));
  fs.writeFileSync(path.join(process.cwd(), 'src/app/lib/acx/action-map.ts'), actionMapSource, 'utf8');

  const summary = {
    workbookPath,
    roles: parsedMatrix.roles.length,
    matrixEntries: parsedMatrix.entries.length,
    apiMethodEntries: apiInventory.methodEntries.length,
    pageEntries: pageInventory.pages.length,
  };

  process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
}

main();
