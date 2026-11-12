export type SqlDialect = 'mysql' | 'pgsql';

export type Cardinality = 'one-to-one' | 'one-to-many' | 'many-to-many';

export type ReferentialAction = 'RESTRICT' | 'CASCADE' | 'SET NULL' | 'NO ACTION';

export type LineRouting = 'orthogonal' | 'bezier';

export type ThemeMode = 'light' | 'dark';

export interface ColumnConstraint {
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  isUnique?: boolean;
  isNullable?: boolean;
  isAutoIncrement?: boolean;
  defaultValue?: string;
  checkExpression?: string;
}

export type IndexType = 'PRIMARY' | 'UNIQUE' | 'INDEX' | 'FULLTEXT' | 'SPATIAL';

export interface TableIndex {
  id: string;
  name: string;
  type: IndexType;
  columns: string[]; // column names or IDs
}

export interface Column {
  id: string;
  name: string;
  type: string;
  lengthOrPrecision?: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  isUnique: boolean;
  isNullable: boolean;
  isAutoIncrement: boolean;
  defaultValue?: string;
  comment?: string;
  color?: string; // custom highlight
}

export interface Table {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string; // Header / accent color
  columns: Column[];
  indexes: TableIndex[];
  notes?: string;
}

export interface Point {
  x: number;
  y: number;
}

export interface Relation {
  id: string;
  sourceTableId: string;
  sourceColumnId: string;
  targetTableId: string;
  targetColumnId: string;
  cardinality: Cardinality;
  routing?: LineRouting; // 'orthogonal' or 'bezier'
  bendOffset?: number; // horizontal or corridor offset in px
  waypoints?: Point[]; // custom draw.io-style intermediate waypoints
  name?: string;
  onDelete?: ReferentialAction;
  onUpdate?: ReferentialAction;
  color?: string;
}

export interface Worksheet {
  id: string;
  name: string; // e.g. "unnamed_1"
  dialect: SqlDialect;
  tables: Table[];
  relations: Relation[];
  createdAt: number;
  updatedAt: number;
  zoom?: number;
  panX?: number;
  panY?: number;
}

export const MYSQL_DATA_TYPES = [
  'INT',
  'BIGINT',
  'TINYINT',
  'SMALLINT',
  'VARCHAR(255)',
  'VARCHAR(100)',
  'CHAR(36)',
  'TEXT',
  'LONGTEXT',
  'DECIMAL(10,2)',
  'FLOAT',
  'DOUBLE',
  'BOOLEAN',
  'DATE',
  'DATETIME',
  'TIMESTAMP',
  'TIME',
  'JSON',
  'ENUM',
  'BLOB',
];

export const PGSQL_DATA_TYPES = [
  'INTEGER',
  'BIGINT',
  'SMALLINT',
  'SERIAL',
  'BIGSERIAL',
  'VARCHAR(255)',
  'VARCHAR(100)',
  'CHAR(36)',
  'TEXT',
  'NUMERIC(10,2)',
  'REAL',
  'DOUBLE PRECISION',
  'BOOLEAN',
  'DATE',
  'TIMESTAMP',
  'TIMESTAMPTZ',
  'TIME',
  'JSONB',
  'JSON',
  'UUID',
  'BYTEA',
  'ARRAY',
];

export const TABLE_COLORS = [
  { name: 'Sky Blue', bg: '#0284c7', border: '#38bdf8', headerBg: '#0369a1', light: '#e0f2fe' },
  { name: 'Emerald', bg: '#059669', border: '#34d399', headerBg: '#047857', light: '#d1fae5' },
  { name: 'Violet', bg: '#7c3aed', border: '#a78bfa', headerBg: '#6d28d9', light: '#ede9fe' },
  { name: 'Amber', bg: '#d97706', border: '#fbbf24', headerBg: '#b45309', light: '#fef3c7' },
  { name: 'Rose', bg: '#e11d48', border: '#fb7185', headerBg: '#be123c', light: '#ffe4e6' },
  { name: 'Teal', bg: '#0d9488', border: '#2dd4bf', headerBg: '#0f766e', light: '#ccfbf1' },
  { name: 'Indigo', bg: '#4f46e5', border: '#818cf8', headerBg: '#4338ca', light: '#e0e7ff' },
  { name: 'Slate', bg: '#475569', border: '#94a3b8', headerBg: '#334155', light: '#f1f5f9' },
];

export const RELATION_COLORS = [
  '#2563eb', // blue
  '#059669', // emerald
  '#7c3aed', // purple
  '#d97706', // amber
  '#db2777', // pink
  '#0891b2', // cyan
  '#dc2626', // red
  '#475569', // slate
];
