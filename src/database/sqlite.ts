/**
 * SQLite database client
 * Lightweight, file-based SQL database support
 */

import Database from 'better-sqlite3';
import type { QueryResult, TableInfo, ColumnInfo, SchemaInfo, FieldInfo } from '../types/database.js';

export class SQLiteClient {
  private db: Database.Database;

  constructor(filePath: string) {
    this.db = new Database(filePath);
  }

  /**
   * Execute a SQL query
   */
  query(sql: string, params: unknown[] = []): QueryResult {
    const startTime = Date.now();

    try {
      const stmt = this.db.prepare(sql);
      const isSelect = sql.trim().toLowerCase().startsWith('select');

      if (isSelect) {
        const rows = stmt.all(...params) as Record<string, unknown>[];
        const fields = this.extractFields(stmt);

        return {
          rows,
          rowCount: rows.length,
          fields,
          executionTime: Date.now() - startTime,
        };
      } else {
        const info = stmt.run(...params);
        return {
          rows: [],
          rowCount: info.changes,
          fields: [],
          executionTime: Date.now() - startTime,
        };
      }
    } catch (error) {
      throw new Error(`Query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get database schema information
   */
  getSchema(): SchemaInfo {
    const tables = this.getTables();
    const views = this.getViews();

    return {
      database: this.db.name,
      tables: tables.map(tableName => this.getTableInfo(tableName)),
      views,
      totalTables: tables.length,
    };
  }

  /**
   * Get table information
   */
  getTableInfo(tableName: string): TableInfo {
    const columns = this.getColumns(tableName);
    const indexes = this.getIndexes(tableName);

    // Get row count
    const countResult = this.db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get() as { count: number };

    return {
      name: tableName,
      type: 'table',
      columns,
      indexes,
      rowCount: countResult.count,
    };
  }

  /**
   * List all tables
   */
  private getTables(): string[] {
    const rows = this.db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    ).all() as Array<{ name: string }>;

    return rows.map(row => row.name);
  }

  /**
   * List all views
   */
  private getViews(): string[] {
    const rows = this.db.prepare(
      "SELECT name FROM sqlite_master WHERE type='view'"
    ).all() as Array<{ name: string }>;

    return rows.map(row => row.name);
  }

  /**
   * Get column information for a table
   */
  private getColumns(tableName: string): ColumnInfo[] {
    const pragma = this.db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{
      name: string;
      type: string;
      notnull: number;
      dflt_value: string | null;
      pk: number;
    }>;

    const foreignKeys = this.getForeignKeys(tableName);

    return pragma.map(col => ({
      name: col.name,
      type: col.type,
      nullable: col.notnull === 0,
      defaultValue: col.dflt_value ?? undefined,
      isPrimaryKey: col.pk > 0,
      isForeignKey: foreignKeys.some(fk => fk.from === col.name),
      references: foreignKeys.find(fk => fk.from === col.name)?.to,
    }));
  }

  /**
   * Get index information for a table
   */
  private getIndexes(tableName: string): Array<{ name: string; columns: string[]; unique: boolean }> {
    const indexes = this.db.prepare(`PRAGMA index_list(${tableName})`).all() as Array<{
      name: string;
      unique: number;
    }>;

    return indexes.map(idx => {
      const indexInfo = this.db.prepare(`PRAGMA index_info(${idx.name})`).all() as Array<{
        name: string;
      }>;

      return {
        name: idx.name,
        columns: indexInfo.map(col => col.name),
        unique: idx.unique === 1,
      };
    });
  }

  /**
   * Get foreign key information for a table
   */
  private getForeignKeys(tableName: string): Array<{ from: string; to: string; table: string }> {
    const fks = this.db.prepare(`PRAGMA foreign_key_list(${tableName})`).all() as Array<{
      from: string;
      to: string;
      table: string;
    }>;

    return fks.map(fk => ({
      from: fk.from,
      to: fk.to,
      table: fk.table,
    }));
  }

  /**
   * Extract field information from prepared statement
   */
  private extractFields(stmt: Database.Statement): FieldInfo[] {
    const columns = stmt.columns();

    return columns.map(col => ({
      name: col.name,
      type: col.type ?? 'unknown',
      nullable: true, // SQLite doesn't provide this in statement metadata
    }));
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}
