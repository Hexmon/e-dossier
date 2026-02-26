import type { DbSchemaDoc, TableDoc } from "./types";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeCell(value: string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "-";
  return value
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, " ")
    .trim();
}

function renderColumnsTable(table: TableDoc): string {
  if (table.columns.length === 0) {
    return "_No columns found._\n";
  }

  const lines = [
    "| Column | Type | Nullable | Default | Identity | Comment |",
    "|---|---|---|---|---|---|",
  ];

  for (const column of table.columns) {
    const identity = column.isIdentity
      ? column.identityGeneration
        ? `YES (${column.identityGeneration})`
        : "YES"
      : "NO";

    lines.push(
      `| ${escapeCell(column.name)} | ${escapeCell(column.formattedType)} | ${column.nullable ? "YES" : "NO"} | ${escapeCell(column.default)} | ${identity} | ${escapeCell(column.comment)} |`,
    );
  }

  return `${lines.join("\n")}\n`;
}

function renderColumnList(columns: string[]): string {
  if (columns.length === 0) return "_None_";
  return columns.map((column) => `\`${column}\``).join(", ");
}

export function renderMarkdown(doc: DbSchemaDoc): string {
  const lines: string[] = [];

  lines.push("# Database Data Dictionary");
  lines.push("");
  lines.push(`Generated at: \`${doc.generatedAt}\``);
  lines.push(`Database: \`${doc.database}\``);
  lines.push(`Server version: \`${doc.serverVersion}\``);
  lines.push("");

  lines.push("## Table of Contents");
  lines.push("");
  for (const schema of doc.schemas) {
    const schemaAnchor = `schema-${slugify(schema.name)}`;
    lines.push(`- [Schema \`${schema.name}\`](#${schemaAnchor})`);
    for (const table of schema.tables) {
      const tableAnchor = `table-${slugify(schema.name)}-${slugify(table.name)}`;
      lines.push(`  - [\`${schema.name}.${table.name}\`](#${tableAnchor})`);
    }
  }
  lines.push("");

  for (const schema of doc.schemas) {
    lines.push(`## Schema: \`${schema.name}\``);
    lines.push(`<a id="schema-${slugify(schema.name)}"></a>`);
    lines.push("");

    if (schema.tables.length === 0) {
      lines.push("_No base tables found in this schema._");
      lines.push("");
    }

    for (const table of schema.tables) {
      lines.push(`### Table: \`${schema.name}.${table.name}\``);
      lines.push(`<a id="table-${slugify(schema.name)}-${slugify(table.name)}"></a>`);
      lines.push("");
      lines.push(`Type: \`${table.type}\``);
      lines.push("");
      lines.push(`Comment: ${table.comment ? escapeCell(table.comment) : "_None_"}`);
      lines.push("");

      lines.push("#### Columns");
      lines.push("");
      lines.push(renderColumnsTable(table).trimEnd());
      lines.push("");

      lines.push("#### Primary Key");
      lines.push("");
      if (table.primaryKey) {
        lines.push(`- Name: \`${table.primaryKey.name}\``);
        lines.push(`- Columns: ${renderColumnList(table.primaryKey.columns)}`);
      } else {
        lines.push("_None_");
      }
      lines.push("");

      lines.push("#### Unique Constraints");
      lines.push("");
      if (table.uniqueConstraints.length === 0) {
        lines.push("_None_");
      } else {
        for (const unique of table.uniqueConstraints) {
          lines.push(`- \`${unique.name}\` (${renderColumnList(unique.columns)})`);
        }
      }
      lines.push("");

      lines.push("#### Check Constraints");
      lines.push("");
      if (table.checkConstraints.length === 0) {
        lines.push("_None_");
      } else {
        for (const check of table.checkConstraints) {
          lines.push(`- \`${check.name}\`: \`${escapeCell(check.definition)}\``);
        }
      }
      lines.push("");

      lines.push("#### Foreign Keys");
      lines.push("");
      if (table.foreignKeys.length === 0) {
        lines.push("_None_");
      } else {
        for (const fk of table.foreignKeys) {
          lines.push(
            `- \`${fk.name}\`: (${renderColumnList(fk.columns)}) -> \`${fk.referencedSchema}.${fk.referencedTable}\` (${renderColumnList(fk.referencedColumns)}) [on update: ${fk.onUpdate}, on delete: ${fk.onDelete}]`,
          );
        }
      }
      lines.push("");

      lines.push("#### Indexes");
      lines.push("");
      if (table.indexes.length === 0) {
        lines.push("_None_");
      } else {
        for (const index of table.indexes) {
          const flags: string[] = [];
          if (index.unique) flags.push("UNIQUE");
          if (index.primary) flags.push("PRIMARY");
          lines.push(
            `- \`${index.name}\`${flags.length ? ` (${flags.join(", ")})` : ""} using \`${index.method}\` on ${index.columns.length ? renderColumnList(index.columns) : "_expression_"}${index.predicate ? ` where \`${escapeCell(index.predicate)}\`` : ""}`,
          );
        }
      }
      lines.push("");
    }

    lines.push("### Enums");
    lines.push("");
    if (schema.enums.length === 0) {
      lines.push("_None_");
    } else {
      for (const enumType of schema.enums) {
        const values = enumType.values.map((value) => `\`${value}\``).join(", ");
        lines.push(`- \`${schema.name}.${enumType.name}\`: ${values}`);
      }
    }
    lines.push("");
  }

  lines.push("## Relationships Summary");
  lines.push("");
  if (doc.relationships.length === 0) {
    lines.push("_No foreign key relationships found._");
    lines.push("");
  } else {
    for (const rel of doc.relationships) {
      lines.push(
        `- \`${rel.fromSchema}.${rel.fromTable}\` (${renderColumnList(rel.fromColumns)}) -> \`${rel.toSchema}.${rel.toTable}\` (${renderColumnList(rel.toColumns)}) [on update: ${rel.onUpdate}, on delete: ${rel.onDelete}]`,
      );
    }
    lines.push("");
  }

  return `${lines.join("\n").trim()}\n`;
}
