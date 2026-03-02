export type ColumnDoc = {
  name: string;
  ordinal: number;
  dataType: string | null;
  udtName: string | null;
  formattedType: string;
  nullable: boolean;
  default: string | null;
  isIdentity: boolean;
  identityGeneration: string | null;
  comment: string | null;
};

export type PrimaryKeyDoc = {
  name: string;
  columns: string[];
};

export type UniqueConstraintDoc = {
  name: string;
  columns: string[];
  definition: string;
};

export type CheckConstraintDoc = {
  name: string;
  definition: string;
};

export type ForeignKeyDoc = {
  name: string;
  columns: string[];
  referencedSchema: string;
  referencedTable: string;
  referencedColumns: string[];
  onUpdate: string;
  onDelete: string;
  matchType: string;
  deferrable: boolean;
  initiallyDeferred: boolean;
};

export type IndexDoc = {
  name: string;
  unique: boolean;
  primary: boolean;
  method: string;
  columns: string[];
  predicate: string | null;
  definition: string;
};

export type TableDoc = {
  schema: string;
  name: string;
  type: "BASE TABLE";
  comment: string | null;
  columns: ColumnDoc[];
  primaryKey: PrimaryKeyDoc | null;
  uniqueConstraints: UniqueConstraintDoc[];
  checkConstraints: CheckConstraintDoc[];
  foreignKeys: ForeignKeyDoc[];
  indexes: IndexDoc[];
};

export type EnumDoc = {
  schema: string;
  name: string;
  values: string[];
};

export type SchemaDoc = {
  name: string;
  tables: TableDoc[];
  enums: EnumDoc[];
};

export type RelationshipDoc = {
  constraintName: string;
  fromSchema: string;
  fromTable: string;
  fromColumns: string[];
  toSchema: string;
  toTable: string;
  toColumns: string[];
  onUpdate: string;
  onDelete: string;
  matchType: string;
  allColumnsNotNull: boolean;
};

export type DbSchemaDoc = {
  generatedAt: string;
  database: string;
  serverVersion: string;
  schemas: SchemaDoc[];
  relationships: RelationshipDoc[];
};
