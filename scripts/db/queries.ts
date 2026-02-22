import type { Client } from "pg";

type DatabaseInfoRow = {
  database_name: string;
  server_version: string;
};

export type TableRow = {
  schema_name: string;
  table_name: string;
  table_oid: number;
  table_comment: string | null;
};

export type ColumnRow = {
  schema_name: string;
  table_name: string;
  table_oid: number;
  ordinal_position: number;
  column_name: string;
  formatted_type: string;
  data_type: string | null;
  udt_name: string | null;
  is_nullable: boolean;
  column_default: string | null;
  is_identity: boolean;
  identity_generation: string | null;
  column_comment: string | null;
};

export type ConstraintRow = {
  constraint_oid: number;
  constraint_name: string;
  contype: "p" | "u" | "f" | "c";
  table_oid: number;
  referenced_table_oid: number | null;
  constrained_attnums: number[] | string | null;
  referenced_attnums: number[] | string | null;
  definition: string;
  schema_name: string;
  table_name: string;
  referenced_schema_name: string | null;
  referenced_table_name: string | null;
  confupdtype: string | null;
  confdeltype: string | null;
  confmatchtype: string | null;
  condeferrable: boolean;
  condeferred: boolean;
};

export type IndexRow = {
  schema_name: string;
  table_name: string;
  table_oid: number;
  index_name: string;
  is_unique: boolean;
  is_primary: boolean;
  access_method: string;
  predicate: string | null;
  definition: string;
  column_names: string[] | string | null;
};

export type EnumRow = {
  schema_name: string;
  enum_name: string;
  enum_value: string;
  enumsortorder: number;
};

export async function getDatabaseInfo(client: Client): Promise<{
  database: string;
  serverVersion: string;
}> {
  const res = await client.query<DatabaseInfoRow>(
    "select current_database() as database_name, version() as server_version",
  );
  return {
    database: res.rows[0]?.database_name ?? "unknown",
    serverVersion: res.rows[0]?.server_version ?? "unknown",
  };
}

export async function getSchemas(client: Client): Promise<string[]> {
  const res = await client.query<{ schema_name: string }>(`
    select n.nspname as schema_name
    from pg_namespace n
    where n.nspname not in ('pg_catalog', 'information_schema', 'pg_toast')
      and n.nspname not like 'pg_temp_%'
      and n.nspname not like 'pg_toast_temp_%'
    order by n.nspname
  `);
  return res.rows.map((row) => row.schema_name);
}

export async function getTables(client: Client, schemas: string[]): Promise<TableRow[]> {
  const res = await client.query<TableRow>(
    `
      select
        n.nspname as schema_name,
        c.relname as table_name,
        c.oid as table_oid,
        d.description as table_comment
      from pg_class c
      inner join pg_namespace n on n.oid = c.relnamespace
      left join pg_description d on d.objoid = c.oid and d.objsubid = 0
      where n.nspname = any($1::text[])
        and c.relkind in ('r', 'p')
      order by n.nspname, c.relname
    `,
    [schemas],
  );
  return res.rows;
}

export async function getColumns(client: Client, schemas: string[]): Promise<ColumnRow[]> {
  const res = await client.query<ColumnRow>(
    `
      select
        n.nspname as schema_name,
        c.relname as table_name,
        c.oid as table_oid,
        a.attnum as ordinal_position,
        a.attname as column_name,
        pg_catalog.format_type(a.atttypid, a.atttypmod) as formatted_type,
        ic.data_type as data_type,
        ic.udt_name as udt_name,
        (coalesce(ic.is_nullable, 'YES') = 'YES') as is_nullable,
        ic.column_default as column_default,
        (coalesce(ic.is_identity, 'NO') = 'YES') as is_identity,
        nullif(ic.identity_generation, '') as identity_generation,
        d.description as column_comment
      from pg_class c
      inner join pg_namespace n on n.oid = c.relnamespace
      inner join pg_attribute a
        on a.attrelid = c.oid
       and a.attnum > 0
       and not a.attisdropped
      left join information_schema.columns ic
        on ic.table_schema = n.nspname
       and ic.table_name = c.relname
       and ic.column_name = a.attname
      left join pg_description d
        on d.objoid = c.oid
       and d.objsubid = a.attnum
      where n.nspname = any($1::text[])
        and c.relkind in ('r', 'p')
      order by n.nspname, c.relname, a.attnum
    `,
    [schemas],
  );
  return res.rows;
}

export async function getConstraints(client: Client, schemas: string[]): Promise<ConstraintRow[]> {
  const res = await client.query<ConstraintRow>(
    `
      select
        con.oid as constraint_oid,
        con.conname as constraint_name,
        con.contype as contype,
        con.conrelid as table_oid,
        nullif(con.confrelid, 0) as referenced_table_oid,
        con.conkey as constrained_attnums,
        con.confkey as referenced_attnums,
        pg_get_constraintdef(con.oid, true) as definition,
        n.nspname as schema_name,
        c.relname as table_name,
        rn.nspname as referenced_schema_name,
        rc.relname as referenced_table_name,
        con.confupdtype as confupdtype,
        con.confdeltype as confdeltype,
        con.confmatchtype as confmatchtype,
        con.condeferrable as condeferrable,
        con.condeferred as condeferred
      from pg_constraint con
      inner join pg_class c on c.oid = con.conrelid
      inner join pg_namespace n on n.oid = c.relnamespace
      left join pg_class rc on rc.oid = con.confrelid
      left join pg_namespace rn on rn.oid = rc.relnamespace
      where n.nspname = any($1::text[])
        and con.contype in ('p', 'u', 'f', 'c')
      order by n.nspname, c.relname, con.contype, con.conname
    `,
    [schemas],
  );
  return res.rows;
}

export async function getIndexes(client: Client, schemas: string[]): Promise<IndexRow[]> {
  const res = await client.query<IndexRow>(
    `
      select
        ns.nspname as schema_name,
        tbl.relname as table_name,
        i.indrelid as table_oid,
        idx.relname as index_name,
        i.indisunique as is_unique,
        i.indisprimary as is_primary,
        am.amname as access_method,
        pg_get_expr(i.indpred, i.indrelid, true) as predicate,
        pg_get_indexdef(i.indexrelid, 0, true) as definition,
        array_remove(array_agg(att.attname order by ord.n), null) as column_names
      from pg_index i
      inner join pg_class tbl on tbl.oid = i.indrelid
      inner join pg_namespace ns on ns.oid = tbl.relnamespace
      inner join pg_class idx on idx.oid = i.indexrelid
      inner join pg_am am on am.oid = idx.relam
      left join lateral unnest(i.indkey) with ordinality as ord(attnum, n) on true
      left join pg_attribute att
        on att.attrelid = tbl.oid
       and att.attnum = ord.attnum
       and att.attnum > 0
      where ns.nspname = any($1::text[])
      group by
        ns.nspname,
        tbl.relname,
        i.indrelid,
        idx.relname,
        i.indisunique,
        i.indisprimary,
        am.amname,
        i.indpred,
        i.indexrelid
      order by ns.nspname, tbl.relname, idx.relname
    `,
    [schemas],
  );
  return res.rows;
}

export async function getEnums(client: Client, schemas: string[]): Promise<EnumRow[]> {
  const res = await client.query<EnumRow>(
    `
      select
        ns.nspname as schema_name,
        t.typname as enum_name,
        e.enumlabel as enum_value,
        e.enumsortorder as enumsortorder
      from pg_type t
      inner join pg_enum e on e.enumtypid = t.oid
      inner join pg_namespace ns on ns.oid = t.typnamespace
      where ns.nspname = any($1::text[])
      order by ns.nspname, t.typname, e.enumsortorder
    `,
    [schemas],
  );
  return res.rows;
}

export function parsePgTextArray(value: string[] | string | null): string[] {
  if (value === null) return [];
  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }
  const trimmed = value.trim();
  if (trimmed.length < 2 || !trimmed.startsWith("{") || !trimmed.endsWith("}")) {
    return [];
  }
  const content = trimmed.slice(1, -1);
  if (!content) return [];
  return content
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parsePgIntArray(value: number[] | string | null): number[] {
  if (value === null) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => Number(item))
      .filter((item) => Number.isFinite(item));
  }
  return parsePgTextArray(value)
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item));
}

export function decodeConstraintAction(code: string | null): string {
  switch (code) {
    case "a":
      return "NO ACTION";
    case "r":
      return "RESTRICT";
    case "c":
      return "CASCADE";
    case "n":
      return "SET NULL";
    case "d":
      return "SET DEFAULT";
    default:
      return "UNKNOWN";
  }
}

export function decodeConstraintMatchType(code: string | null): string {
  switch (code) {
    case "s":
      return "SIMPLE";
    case "f":
      return "FULL";
    case "p":
      return "PARTIAL";
    default:
      return "UNKNOWN";
  }
}
