/**
 * MySQL Database Client
 * Requires: npm install mysql2 @types/mysql2
 */

import type { QueryResult } from '../types/database.js';

// Custom types for MySQL schema (simplified)
interface TableInfo {
  name: string;
  columns: Array<{
    name: string;
    type: string;
    nullable: boolean;
    defaultValue: string | null;
  }>;
  primaryKey?: string | undefined;
  indexes: Array<{ name: string; columns: string[] }>;
  foreignKeys: Array<{
    column: string;
    referencedTable: string;
    referencedColumn: string;
  }>;
  rowCount: number;
}

interface SchemaInfo {
  tables: TableInfo[];
  views: string[];
}

export interface MySQLConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean | undefined;
}

export class MySQLClient {
  private config: MySQLConfig;
  private connection: any; // mysql2.Connection
  private connected: boolean = false;

  constructor(config: MySQLConfig) {
    this.config = config;
  }

  /**
   * Connect to MySQL
   */
  async connect(): Promise<void> {
    try {
      // @ts-ignore - mysql2 is an optional dependency
      const mysql = await import('mysql2/promise');
      this.connection = await mysql.createConnection(this.config);
      this.connected = true;
    } catch (error) {
      if (error instanceof Error && error.message.includes('Cannot find module')) {
        throw new Error(
          'MySQL support requires the "mysql2" package. Install it with: npm install mysql2'
        );
      }
      throw error;
    }
  }

  /**
   * Disconnect from MySQL
   */
  async disconnect(): Promise<void> {
    if (this.connection && this.connected) {
      await this.connection.end();
      this.connected = false;
    }
  }

  /**
   * Execute a query
   */
  async query(sql: string, params: unknown[] = []): Promise<QueryResult> {
    if (!this.connected) {
      await this.connect();
    }

    const startTime = Date.now();

    try {
      const [rows, fields] = await this.connection.execute(sql, params);
      const duration = Date.now() - startTime;

      const rowsArray = Array.isArray(rows) ? rows : [];

      return {
        rows: rowsArray,
        rowCount: rowsArray.length,
        fields: fields?.map((f: any) => ({
          name: f.name,
          type: f.columnType?.toString() || 'unknown',
          nullable: true,
        })) || [],
        executionTime: duration,
      };
    } catch (error) {
      throw new Error(
        `MySQL query failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get database schema
   */
  async getSchema(): Promise<SchemaInfo> {
    const tablesResult = await this.query(`
      SELECT TABLE_NAME, TABLE_TYPE
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ?
    `, [this.config.database]);

    const tables: TableInfo[] = [];

    for (const row of tablesResult.rows) {
      const tableName = row.TABLE_NAME as string;
      const tableType = row.TABLE_TYPE as string;

      if (tableType === 'BASE TABLE') {
        const columnsResult = await this.query(
          `
          SELECT
            COLUMN_NAME,
            DATA_TYPE,
            IS_NULLABLE,
            COLUMN_DEFAULT,
            COLUMN_KEY
          FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
          ORDER BY ORDINAL_POSITION
        `,
          [this.config.database, tableName]
        );

        const columns = columnsResult.rows.map((col) => ({
          name: col.COLUMN_NAME as string,
          type: col.DATA_TYPE as string,
          nullable: col.IS_NULLABLE === 'YES',
          defaultValue: col.COLUMN_DEFAULT as string | null,
        }));

        // Find primary key
        const primaryKeyCol = columnsResult.rows.find((col) => col.COLUMN_KEY === 'PRI');
        const primaryKey = primaryKeyCol?.COLUMN_NAME as string | undefined;

        // Get indexes
        const indexResult = await this.query(
          `
          SELECT DISTINCT INDEX_NAME
          FROM information_schema.STATISTICS
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
        `,
          [this.config.database, tableName]
        );

        const indexes = indexResult.rows.map((idx) => ({
          name: idx.INDEX_NAME as string,
          columns: [], // Simplified
        }));

        // Get foreign keys
        const fkResult = await this.query(
          `
          SELECT
            COLUMN_NAME,
            REFERENCED_TABLE_NAME,
            REFERENCED_COLUMN_NAME
          FROM information_schema.KEY_COLUMN_USAGE
          WHERE TABLE_SCHEMA = ?
            AND TABLE_NAME = ?
            AND REFERENCED_TABLE_NAME IS NOT NULL
        `,
          [this.config.database, tableName]
        );

        const foreignKeys = fkResult.rows.map((fk) => ({
          column: fk.COLUMN_NAME as string,
          referencedTable: fk.REFERENCED_TABLE_NAME as string,
          referencedColumn: fk.REFERENCED_COLUMN_NAME as string,
        }));

        // Get row count
        const countResult = await this.query(`SELECT COUNT(*) as count FROM \`${tableName}\``);
        const rowCount = parseInt(countResult.rows[0]?.count as string) || 0;

        tables.push({
          name: tableName,
          columns,
          primaryKey,
          indexes,
          foreignKeys,
          rowCount,
        });
      }
    }

    return {
      tables,
      views: [], // Simplified
    };
  }

  /**
   * Get table information
   */
  async getTableInfo(tableName: string): Promise<TableInfo> {
    const schema = await this.getSchema();
    const table = schema.tables.find((t) => t.name === tableName);

    if (!table) {
      throw new Error(`Table "${tableName}" not found`);
    }

    return table;
  }
}

/**
 * Create MySQL client from connection string
 */
export function createMySQLClient(connectionString: string): MySQLClient {
  // Parse connection string: mysql://user:password@host:port/database
  const url = new URL(connectionString);

  const config: MySQLConfig = {
    host: url.hostname,
    port: parseInt(url.port) || 3306,
    database: url.pathname.slice(1), // Remove leading slash
    user: url.username,
    password: url.password,
    ssl: url.searchParams.get('ssl') === 'true',
  };

  return new MySQLClient(config);
}
