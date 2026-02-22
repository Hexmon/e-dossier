import type { DbSchemaDoc, TableDoc } from "./types";

function toEntityName(schema: string, table: string): string {
  return `${schema}__${table}`.replace(/[^a-zA-Z0-9_]/g, "_");
}

function toMermaidType(value: string | null): string {
  if (!value || value.trim().length === 0) return "unknown";
  return value
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "") || "unknown";
}

function getPrimaryKeyColumnSet(table: TableDoc): Set<string> {
  return new Set(table.primaryKey?.columns ?? []);
}

export function renderMermaid(doc: DbSchemaDoc): string {
  const lines: string[] = ["erDiagram"];
  const tableAliasMap = new Map<string, string>();

  for (const schema of doc.schemas) {
    for (const table of schema.tables) {
      const fqTable = `${schema.name}.${table.name}`;
      const alias = toEntityName(schema.name, table.name);
      tableAliasMap.set(fqTable, alias);

      lines.push(`  %% ${fqTable}`);
      lines.push(`  ${alias} {`);
      const primaryKeyColumns = getPrimaryKeyColumnSet(table);
      for (const column of table.columns) {
        const pkSuffix = primaryKeyColumns.has(column.name) ? " PK" : "";
        lines.push(`    ${toMermaidType(column.formattedType || column.dataType)} ${column.name}${pkSuffix}`);
      }
      lines.push("  }");
    }
  }

  if (doc.relationships.length > 0) {
    lines.push("");
    for (const rel of doc.relationships) {
      const fromAlias = tableAliasMap.get(`${rel.fromSchema}.${rel.fromTable}`);
      const toAlias = tableAliasMap.get(`${rel.toSchema}.${rel.toTable}`);
      if (!fromAlias || !toAlias) continue;

      const connector = rel.allColumnsNotNull ? "}|--||" : "}o--||";
      const label = rel.constraintName.replace(/"/g, "'");
      lines.push(`  ${fromAlias} ${connector} ${toAlias} : "${label}"`);
    }
  }

  return `${lines.join("\n").trim()}\n`;
}
