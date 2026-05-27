import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

import { describe, expect, it } from "vitest";
import { PUBLIC_API_REGISTRY, isPublicApiPath } from "@/app/lib/access-control-policy";
import { resolveApiAction } from "@/app/lib/acx/action-map";

const METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"]);
const ROUTE_WRAPPERS = new Set(["withAuditRoute", "withAuthz"]);

function listRouteFiles() {
  const apiRoot = path.join(process.cwd(), "src", "app", "api", "v1");
  const routeFiles: string[] = [];

  function walk(directory: string) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(entryPath);
        continue;
      }
      if (entry.isFile() && entry.name === "route.ts") {
        routeFiles.push(path.relative(process.cwd(), entryPath).replace(/\\/g, "/"));
      }
    }
  }

  walk(apiRoot);
  return routeFiles.sort();
}

function routePathFromFile(file: string) {
  return file
    .replace(/^src\/app/, "")
    .replace(/\/route\.ts$/, "")
    .replace(/\[\.\.\.([^\]]+)\]/g, "$1")
    .replace(/\[([^\]]+)\]/g, "sample");
}

function hasExportModifier(node: ts.Node) {
  return Boolean(
    ts.canHaveModifiers(node) &&
      ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
  );
}

function isRouteMethodName(name: string | undefined): name is string {
  return Boolean(name && METHODS.has(name));
}

function callExpressionName(expression: ts.Expression): string | null {
  if (ts.isIdentifier(expression)) return expression.text;
  if (ts.isPropertyAccessExpression(expression)) return expression.name.text;
  return null;
}

function expressionHasRouteWrapper(expression: ts.Expression | undefined): boolean {
  if (!expression) return false;
  let wrapped = false;

  function visit(node: ts.Node) {
    if (wrapped) return;
    if (ts.isCallExpression(node)) {
      const name = callExpressionName(node.expression);
      if (name && ROUTE_WRAPPERS.has(name)) {
        wrapped = true;
        return;
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(expression);
  return wrapped;
}

function exportedRouteHandlers(file: string) {
  const source = readFileSync(file, "utf8");
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const handlers: Array<{ method: string; wrapped: boolean; kind: string }> = [];

  for (const statement of sourceFile.statements) {
    if (
      ts.isFunctionDeclaration(statement) &&
      hasExportModifier(statement) &&
      isRouteMethodName(statement.name?.text)
    ) {
      handlers.push({
        method: statement.name.text,
        wrapped: false,
        kind: "export function",
      });
    }

    if (ts.isVariableStatement(statement) && hasExportModifier(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name) || !isRouteMethodName(declaration.name.text)) {
          continue;
        }
        handlers.push({
          method: declaration.name.text,
          wrapped: expressionHasRouteWrapper(declaration.initializer),
          kind: "export const",
        });
      }
    }
  }

  return handlers;
}

describe("API route safety coverage", () => {
  it("wraps every v1 route handler export with withAuditRoute or withAuthz", () => {
    const files = listRouteFiles();
    const failures: string[] = [];

    for (const file of files) {
      const handlers = exportedRouteHandlers(file);
      for (const handler of handlers) {
        if (!handler.wrapped) {
          failures.push(`${file}: ${handler.kind} ${handler.method} is not wrapped`);
        }
      }

      if (handlers.length === 0) {
        failures.push(`${file}: no route handler export found`);
      }
    }

    expect(failures).toEqual([]);
  }, 30_000);

  it("has action-map coverage for every protected v1 route method", () => {
    const failures: string[] = [];

    for (const file of listRouteFiles()) {
      const pathname = routePathFromFile(file);
      for (const { method } of exportedRouteHandlers(file)) {
        if (isPublicApiPath(pathname, method)) continue;
        if (!resolveApiAction(method, pathname)) {
          failures.push(`${file}: ${method} ${pathname} has no action-map entry`);
        }
      }
    }

    expect(failures).toEqual([]);
  }, 30_000);

  it("keeps the anonymous public API registry exact and reviewed", () => {
    expect(PUBLIC_API_REGISTRY).toEqual([
      { method: "ANY", path: "/api/v1/auth/login", exact: true },
      { method: "ANY", path: "/api/v1/auth/signup", exact: true },
      { method: "ANY", path: "/api/v1/auth/logout", exact: true },
      { method: "ANY", path: "/api/v1/health", exact: true },
      { method: "ANY", path: "/api/v1/bootstrap/super-admin", exact: true },
      { method: "GET", path: "/api/v1/admin/appointments", exact: true },
      { method: "GET", path: "/api/v1/admin/positions", exact: true },
      { method: "GET", path: "/api/v1/admin/users", exact: true },
      { method: "GET", path: "/api/v1/admin/training-camps" },
      { method: "GET", path: "/api/v1/admin/interview/pending/ticker-setting", exact: true },
      { method: "GET", path: "/api/v1/platoons" },
      { method: "GET", path: "/api/v1/site-settings" },
      { method: "GET", path: "/api/v1/setup/status", exact: true },
    ]);
    expect(isPublicApiPath("/api/v1/platoons", "GET")).toBe(true);
    expect(isPublicApiPath("/api/v1/platoons/ARJUN", "GET")).toBe(true);
    expect(isPublicApiPath("/api/v1/platoons/ARJUN/commander-history", "GET")).toBe(true);
    expect(isPublicApiPath("/api/v1/platoons", "POST")).toBe(false);
    expect(isPublicApiPath("/api/v1/admin/appointments", "GET")).toBe(true);
    expect(isPublicApiPath("/api/v1/admin/appointments/appointment-1", "GET")).toBe(false);
    expect(isPublicApiPath("/api/v1/admin/appointments", "POST")).toBe(false);
    expect(isPublicApiPath("/api/v1/admin/positions", "GET")).toBe(true);
    expect(isPublicApiPath("/api/v1/admin/positions", "POST")).toBe(false);
    expect(isPublicApiPath("/api/v1/admin/users", "GET")).toBe(true);
    expect(isPublicApiPath("/api/v1/admin/users", "POST")).toBe(false);
    expect(isPublicApiPath("/api/v1/admin/users/check-username", "GET")).toBe(false);
    expect(isPublicApiPath("/api/v1/admin/training-camps", "GET")).toBe(true);
    expect(isPublicApiPath("/api/v1/admin/training-camps/camp-1/activities", "GET")).toBe(true);
    expect(isPublicApiPath("/api/v1/admin/training-camps", "POST")).toBe(false);
    expect(isPublicApiPath("/api/v1/admin/interview/pending/ticker-setting", "GET")).toBe(true);
    expect(isPublicApiPath("/api/v1/admin/interview/pending/ticker-setting", "POST")).toBe(false);
    expect(isPublicApiPath("/api/v1/admin/interview/pending", "GET")).toBe(false);
    expect(isPublicApiPath("/api/v1/site-settings/awards", "GET")).toBe(true);
  });
});
