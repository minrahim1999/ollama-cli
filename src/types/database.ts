/**
 * Database tools type definitions
 */

export type DatabaseType = 'sqlite' | 'mysql' | 'postgresql';

export interface DatabaseConnection {
  type: DatabaseType;
  host?: string | undefined;
  port?: number | undefined;
  database: string;
  user?: string | undefined;
  password?: string | undefined;
  file?: string | undefined; // For SQLite
}

export interface QueryResult {
  rows: Record<string, unknown>[];
  rowCount: number;
  fields: FieldInfo[];
  executionTime: number;
}

export interface FieldInfo {
  name: string;
  type: string;
  nullable: boolean;
}

export interface TableInfo {
  name: string;
  type: 'table' | 'view';
  columns: ColumnInfo[];
  indexes: IndexInfo[];
  rowCount?: number | undefined;
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string | undefined;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  references?: string | undefined;
}

export interface IndexInfo {
  name: string;
  columns: string[];
  unique: boolean;
}

export interface SchemaInfo {
  database: string;
  tables: TableInfo[];
  views: string[];
  totalTables: number;
}
