/**
 * PostgreSQL Database Client
 * Requires: npm install pg @types/pg
 */

import type { QueryResult } from '../types/database.js';

// Custom types for PostgreSQL schema (simplified)
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

export interface PostgresConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean | undefined;
}

export class PostgresClient {
  private config: PostgresConfig;
  private client: any; // pg.Client
  private connected: boolean = false;

  constructor(config: PostgresConfig) {
    this.config = config;
  }

  /**
   * Connect to PostgreSQL
   */
  async connect(): Promise<void> {
    try {
      // @ts-ignore - pg is an optional dependency
      const { Client } = await import('pg');
      this.client = new Client(this.config);
      await this.client.connect();
      this.connected = true;
    } catch (error) {
      if (error instanceof Error && error.message.includes('Cannot find module')) {
        throw new Error(
          'PostgreSQL support requires the "pg" package. Install it with: npm install pg @types/pg'
        );
      }
      throw error;
    }
  }

  /**
   * Disconnect from PostgreSQL
   */
  async disconnect(): Promise<void> {
    if (this.client && this.connected) {
      await this.client.end();
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
      const result = await this.client.query(sql, params);
      const duration = Date.now() - startTime;

      return {
        rows: result.rows,
        rowCount: result.rowCount || 0,
        fields: result.fields?.map((f: any) => ({
          name: f.name,
          type: f.dataTypeID?.toString() || 'unknown',
          nullable: true,
        })) || [],
        executionTime: duration,
      };
    } catch (error) {
      throw new Error(
        `PostgreSQL query failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get database schema
   */
  async getSchema(): Promise<SchemaInfo> {
    const tablesResult = await this.query(`
      SELECT
        table_name,
        table_type
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    const tables: TableInfo[] = [];

    for (const row of tablesResult.rows) {
      const tableName = row.table_name as string;
      const tableType = row.table_type as string;

      if (tableType === 'BASE TABLE') {
        const columnsResult = await this.query(
          `
          SELECT
            column_name,
            data_type,
            is_nullable,
            column_default
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = $1
          ORDER BY ordinal_position
        `,
          [tableName]
        );

        const columns = columnsResult.rows.map((col) => ({
          name: col.column_name as string,
          type: col.data_type as string,
          nullable: col.is_nullable === 'YES',
          defaultValue: col.column_default as string | null,
        }));

        // Get primary key
        const pkResult = await this.query(
          `
          SELECT column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
          WHERE tc.table_schema = 'public'
            AND tc.table_name = $1
            AND tc.constraint_type = 'PRIMARY KEY'
        `,
          [tableName]
        );

        const primaryKey = pkResult.rows[0]?.column_name as string | undefined;

        // Get indexes
        const indexResult = await this.query(
          `
          SELECT
            indexname,
            indexdef
          FROM pg_indexes
          WHERE schemaname = 'public' AND tablename = $1
        `,
          [tableName]
        );

        const indexes = indexResult.rows.map((idx) => ({
          name: idx.indexname as string,
          columns: [], // Simplified - would need parsing of indexdef
        }));

        // Get foreign keys
        const fkResult = await this.query(
          `
          SELECT
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
          FROM information_schema.table_constraints AS tc
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
          WHERE tc.table_schema = 'public'
            AND tc.table_name = $1
            AND tc.constraint_type = 'FOREIGN KEY'
        `,
          [tableName]
        );

        const foreignKeys = fkResult.rows.map((fk) => ({
          column: fk.column_name as string,
          referencedTable: fk.foreign_table_name as string,
          referencedColumn: fk.foreign_column_name as string,
        }));

        // Get row count
        const countResult = await this.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
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
      views: [], // Simplified - would need separate query
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
 * Create PostgreSQL client from connection string
 */
export function createPostgresClient(connectionString: string): PostgresClient {
  // Parse connection string: postgresql://user:password@host:port/database
  const url = new URL(connectionString);

  const config: PostgresConfig = {
    host: url.hostname,
    port: parseInt(url.port) || 5432,
    database: url.pathname.slice(1), // Remove leading slash
    user: url.username,
    password: url.password,
    ssl: url.searchParams.get('ssl') === 'true',
  };

  return new PostgresClient(config);
}
