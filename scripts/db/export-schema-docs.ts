#!/usr/bin/env tsx
import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { Client } from "pg";
import { normalizeDatabaseUrl } from "../../src/app/db/connectionString";

import {
  decodeConstraintAction,
  decodeConstraintMatchType,
  getColumns,
  getConstraints,
  getDatabaseInfo,
  getEnums,
  getIndexes,
  getSchemas,
  getTables,
  parsePgIntArray,
  parsePgTextArray,
  type ColumnRow,
  type ConstraintRow,
  type EnumRow,
  type IndexRow,
  type TableRow,
} from "./queries";
import { renderMarkdown } from "./render-markdown";
import { renderMermaid } from "./render-mermaid";
import type {
  CheckConstraintDoc,
  DbSchemaDoc,
  EnumDoc,
  ForeignKeyDoc,
  IndexDoc,
  RelationshipDoc,
  SchemaDoc,
  TableDoc,
  UniqueConstraintDoc,
} from "./types";

const OUTPUT_DIR = path.join(process.cwd(), "docs", "reference", "database", "generated");

type BuildContext = {
  schemas: string[];
  tables: TableRow[];
  columns: ColumnRow[];
  constraints: ConstraintRow[];
  indexes: IndexRow[];
  enums: EnumRow[];
};

type DumpResult =
  | { written: true; warning: null }
  | { written: false; warning: string };

function tableKey(schema: string, table: string): string {
  return `${schema}.${table}`;
}

function columnKey(schema: string, table: string, column: string): string {
  return `${schema}.${table}.${column}`;
}

function cmpText(a: string, b: string): number {
  return a.localeCompare(b);
}

function resolveColumnsByAttnum(
  attnums: number[],
  attnumMap: Map<number, string> | undefined,
): string[] {
  if (!attnumMap) return [];
  return attnums
    .map((attnum) => attnumMap.get(attnum) ?? "")
    .filter((column) => column.length > 0);
}

function buildSchemaDoc(
  dbInfo: { database: string; serverVersion: string },
  input: BuildContext,
): DbSchemaDoc {
  const tableByOid = new Map<number, TableDoc>();
  const tableByName = new Map<string, TableDoc>();
  const columnNamesByTableOid = new Map<number, Map<number, string>>();
  const nullableByColumn = new Map<string, boolean>();

  for (const row of input.tables) {
    const table: TableDoc = {
      schema: row.schema_name,
      name: row.table_name,
      type: "BASE TABLE",
      comment: row.table_comment ?? null,
      columns: [],
      primaryKey: null,
      uniqueConstraints: [],
      checkConstraints: [],
      foreignKeys: [],
      indexes: [],
    };
    tableByOid.set(row.table_oid, table);
    tableByName.set(tableKey(row.schema_name, row.table_name), table);
    columnNamesByTableOid.set(row.table_oid, new Map<number, string>());
  }

  for (const row of input.columns) {
    const table = tableByOid.get(row.table_oid);
    if (!table) continue;
    table.columns.push({
      name: row.column_name,
      ordinal: row.ordinal_position,
      dataType: row.data_type,
      udtName: row.udt_name,
      formattedType: row.formatted_type,
      nullable: row.is_nullable,
      default: row.column_default,
      isIdentity: row.is_identity,
      identityGeneration: row.identity_generation,
      comment: row.column_comment ?? null,
    });
    const attnumMap = columnNamesByTableOid.get(row.table_oid);
    if (attnumMap) {
      attnumMap.set(row.ordinal_position, row.column_name);
    }
    nullableByColumn.set(
      columnKey(table.schema, table.name, row.column_name),
      row.is_nullable,
    );
  }

  const relationships: RelationshipDoc[] = [];

  for (const row of input.constraints) {
    const table = tableByOid.get(row.table_oid);
    if (!table) continue;

    const localAttnums = parsePgIntArray(row.constrained_attnums);
    const localColumns = resolveColumnsByAttnum(
      localAttnums,
      columnNamesByTableOid.get(row.table_oid),
    );

    if (row.contype === "p") {
      table.primaryKey = {
        name: row.constraint_name,
        columns: localColumns,
      };
      continue;
    }

    if (row.contype === "u") {
      const uniqueConstraint: UniqueConstraintDoc = {
        name: row.constraint_name,
        columns: localColumns,
        definition: row.definition,
      };
      table.uniqueConstraints.push(uniqueConstraint);
      continue;
    }

    if (row.contype === "c") {
      const checkConstraint: CheckConstraintDoc = {
        name: row.constraint_name,
        definition: row.definition,
      };
      table.checkConstraints.push(checkConstraint);
      continue;
    }

    if (row.contype === "f") {
      const referencedTableOid = row.referenced_table_oid ?? undefined;
      const referencedAttnums = parsePgIntArray(row.referenced_attnums);
      const referencedColumns = resolveColumnsByAttnum(
        referencedAttnums,
        referencedTableOid
          ? columnNamesByTableOid.get(referencedTableOid)
          : undefined,
      );

      const foreignKey: ForeignKeyDoc = {
        name: row.constraint_name,
        columns: localColumns,
        referencedSchema: row.referenced_schema_name ?? "unknown",
        referencedTable: row.referenced_table_name ?? "unknown",
        referencedColumns,
        onUpdate: decodeConstraintAction(row.confupdtype),
        onDelete: decodeConstraintAction(row.confdeltype),
        matchType: decodeConstraintMatchType(row.confmatchtype),
        deferrable: row.condeferrable,
        initiallyDeferred: row.condeferred,
      };

      table.foreignKeys.push(foreignKey);
      relationships.push({
        constraintName: foreignKey.name,
        fromSchema: table.schema,
        fromTable: table.name,
        fromColumns: foreignKey.columns,
        toSchema: foreignKey.referencedSchema,
        toTable: foreignKey.referencedTable,
        toColumns: foreignKey.referencedColumns,
        onUpdate: foreignKey.onUpdate,
        onDelete: foreignKey.onDelete,
        matchType: foreignKey.matchType,
        allColumnsNotNull:
          foreignKey.columns.length > 0 &&
          foreignKey.columns.every(
            (column) =>
              nullableByColumn.get(columnKey(table.schema, table.name, column)) ===
              false,
          ),
      });
    }
  }

  for (const row of input.indexes) {
    const table = tableByOid.get(row.table_oid);
    if (!table) continue;

    const indexColumns = parsePgTextArray(row.column_names);
    const index: IndexDoc = {
      name: row.index_name,
      unique: row.is_unique,
      primary: row.is_primary,
      method: row.access_method,
      columns: indexColumns,
      predicate: row.predicate,
      definition: row.definition,
    };
    table.indexes.push(index);
  }

  const enumBySchemaName = new Map<string, Map<string, EnumDoc>>();
  for (const row of input.enums) {
    const byName =
      enumBySchemaName.get(row.schema_name) ?? new Map<string, EnumDoc>();
    if (!enumBySchemaName.has(row.schema_name)) {
      enumBySchemaName.set(row.schema_name, byName);
    }

    const existing = byName.get(row.enum_name);
    if (existing) {
      existing.values.push(row.enum_value);
    } else {
      byName.set(row.enum_name, {
        schema: row.schema_name,
        name: row.enum_name,
        values: [row.enum_value],
      });
    }
  }

  for (const table of tableByOid.values()) {
    table.columns.sort((a, b) => a.ordinal - b.ordinal);
    table.uniqueConstraints.sort((a, b) => cmpText(a.name, b.name));
    table.checkConstraints.sort((a, b) => cmpText(a.name, b.name));
    table.foreignKeys.sort((a, b) => cmpText(a.name, b.name));
    table.indexes.sort((a, b) => cmpText(a.name, b.name));
  }

  relationships.sort((a, b) => {
    return (
      cmpText(a.fromSchema, b.fromSchema) ||
      cmpText(a.fromTable, b.fromTable) ||
      cmpText(a.constraintName, b.constraintName)
    );
  });

  const schemaDocs: SchemaDoc[] = input.schemas
    .slice()
    .sort(cmpText)
    .map((schemaName) => {
      const tables = [...tableByName.values()]
        .filter((table) => table.schema === schemaName)
        .sort((a, b) => cmpText(a.name, b.name));

      const enums = [...(enumBySchemaName.get(schemaName)?.values() ?? [])].sort(
        (a, b) => cmpText(a.name, b.name),
      );
      for (const enumDoc of enums) {
        enumDoc.values.sort(cmpText);
      }

      return {
        name: schemaName,
        tables,
        enums,
      };
    });

  return {
    generatedAt: new Date().toISOString(),
    database: dbInfo.database,
    serverVersion: dbInfo.serverVersion,
    schemas: schemaDocs,
    relationships,
  };
}

async function writeSchemaSql(
  outputPath: string,
  databaseUrl: string,
): Promise<DumpResult> {
  const versionProbe = spawnSync("pg_dump", ["--version"], {
    encoding: "utf8",
  });

  if (versionProbe.error || versionProbe.status !== 0) {
    return {
      written: false,
      warning:
        "pg_dump is not available on PATH. Skipping docs/reference/database/generated/schema.sql generation.",
    };
  }

  const dump = spawnSync(
    "pg_dump",
    ["-s", "--no-owner", "--no-privileges", `--dbname=${databaseUrl}`],
    {
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 100,
    },
  );

  if (dump.error) {
    return {
      written: false,
      warning: `pg_dump execution failed: ${dump.error.message}`,
    };
  }

  if (dump.status !== 0) {
    return {
      written: false,
      warning: `pg_dump exited with status ${dump.status}: ${(dump.stderr || "").trim() || "no stderr output"}`,
    };
  }

  await writeFile(outputPath, dump.stdout ?? "", "utf8");
  return { written: true, warning: null };
}

async function main() {
  const startTimeMs = Date.now();
  const databaseUrl = normalizeDatabaseUrl(process.env.DATABASE_URL);

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set.");
  }

  console.log("Connecting to database...");
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  let schemaDoc: DbSchemaDoc;
  try {
    console.log("Introspecting schemas...");
    const dbInfo = await getDatabaseInfo(client);
    const schemas = await getSchemas(client);
    console.log(`Found ${schemas.length} non-system schema(s).`);

    const [tables, columns, constraints, indexes, enums] =
      schemas.length === 0
        ? [[], [], [], [], []]
        : await Promise.all([
            getTables(client, schemas),
            getColumns(client, schemas),
            getConstraints(client, schemas),
            getIndexes(client, schemas),
            getEnums(client, schemas),
          ]);

    console.log("Building documentation model...");
    schemaDoc = buildSchemaDoc(dbInfo, {
      schemas,
      tables,
      columns,
      constraints,
      indexes,
      enums,
    });
  } finally {
    await client.end();
  }

  await mkdir(OUTPUT_DIR, { recursive: true });

  const schemaJsonPath = path.join(OUTPUT_DIR, "schema.json");
  const dictionaryPath = path.join(OUTPUT_DIR, "data-dictionary.md");
  const erdPath = path.join(OUTPUT_DIR, "erd.mmd");
  const schemaSqlPath = path.join(OUTPUT_DIR, "schema.sql");

  console.log(`Writing ${path.relative(process.cwd(), schemaJsonPath)}`);
  await writeFile(schemaJsonPath, `${JSON.stringify(schemaDoc, null, 2)}\n`, "utf8");

  console.log(`Writing ${path.relative(process.cwd(), dictionaryPath)}`);
  await writeFile(dictionaryPath, renderMarkdown(schemaDoc), "utf8");

  console.log(`Writing ${path.relative(process.cwd(), erdPath)}`);
  await writeFile(erdPath, renderMermaid(schemaDoc), "utf8");

  console.log("Generating schema.sql via pg_dump...");
  const dumpResult = await writeSchemaSql(schemaSqlPath, databaseUrl);
  if (dumpResult.warning) {
    console.warn(`Warning: ${dumpResult.warning}`);
  } else {
    console.log(`Writing ${path.relative(process.cwd(), schemaSqlPath)}`);
  }

  const elapsedMs = Date.now() - startTimeMs;
  console.log("Done.");
  console.log(
    `Generated: ${path.relative(process.cwd(), schemaJsonPath)}, ${path.relative(process.cwd(), dictionaryPath)}, ${path.relative(process.cwd(), erdPath)}${dumpResult.written ? `, ${path.relative(process.cwd(), schemaSqlPath)}` : ""}`,
  );
  console.log(`Completed in ${elapsedMs}ms.`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`db:docs failed: ${message}`);
  process.exit(1);
});
