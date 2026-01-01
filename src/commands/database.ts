/**
 * Database command - SQL execution and schema inspection
 */

import { SQLiteClient } from '../database/sqlite.js';
import { displayError, displaySuccess, displayInfo } from '../ui/display.js';
import { colors } from '../ui/colors.js';
import path from 'path';
import fs from 'fs/promises';

export type DatabaseCommand = 'query' | 'schema' | 'tables' | 'describe';

interface DatabaseOptions {
  file?: string | undefined;
  table?: string | undefined;
}

/**
 * Main database command handler
 */
export async function databaseCommand(
  command: DatabaseCommand,
  args: string[],
  options: DatabaseOptions
): Promise<void> {
  const dbFile = options.file || './database.db';
  const dbPath = path.resolve(process.cwd(), dbFile);

  // Check if database file exists
  try {
    await fs.access(dbPath);
  } catch {
    displayError(`Database file not found: ${dbPath}`);
    displayInfo('Create a database or specify path with --file');
    return;
  }

  const client = new SQLiteClient(dbPath);

  try {
    switch (command) {
      case 'query':
        if (args.length === 0) {
          displayError('Usage: ollama-cli database query <sql>');
          return;
        }
        await queryCmd(client, args.join(' '));
        break;

      case 'schema':
        await schemaCmd(client);
        break;

      case 'tables':
        await tablesCmd(client);
        break;

      case 'describe':
        if (args.length === 0 && !options.table) {
          displayError('Usage: ollama-cli database describe <table> or --table <table>');
          return;
        }
        const tableName = options.table || args[0]!;
        await describeTableCmd(client, tableName);
        break;

      default:
        displayError(`Unknown command: ${command}`, 'Use: query, schema, tables, describe');
    }
  } finally {
    client.close();
  }
}

/**
 * Execute SQL query
 */
async function queryCmd(client: SQLiteClient, sql: string): Promise<void> {
  try {
    const result = client.query(sql);

    console.log('');
    if (result.rows.length > 0) {
      // Display as table
      console.log(colors.secondary(`Results (${result.rowCount} rows):`));
      console.log('');

      // Get column names
      const columns = Object.keys(result.rows[0]!);

      // Display header
      console.log(colors.brand.primary(columns.join(' | ')));
      console.log(colors.dim('-'.repeat(columns.join(' | ').length)));

      // Display rows (limit to 20)
      const displayRows = result.rows.slice(0, 20);
      for (const row of displayRows) {
        const values = columns.map(col => String(row[col] ?? 'NULL'));
        console.log(values.join(' | '));
      }

      if (result.rows.length > 20) {
        console.log(colors.dim(`\n... and ${result.rows.length - 20} more rows`));
      }
    } else {
      displaySuccess(`Query executed (${result.rowCount} rows affected)`);
    }

    console.log('');
    console.log(colors.dim(`Execution time: ${result.executionTime}ms`));
    console.log('');
  } catch (error) {
    displayError(error instanceof Error ? error.message : 'Query failed');
  }
}

/**
 * Display database schema
 */
async function schemaCmd(client: SQLiteClient): Promise<void> {
  try {
    const schema = client.getSchema();

    console.log('');
    console.log(colors.secondary(`Database Schema: ${schema.database}`));
    console.log('');
    console.log(colors.brand.primary(`Tables: ${schema.totalTables}`));
    console.log(colors.brand.primary(`Views: ${schema.views.length}`));
    console.log('');

    for (const table of schema.tables) {
      console.log(`  ${colors.secondary(table.name)}`);
      console.log(`    Columns: ${table.columns.length}`);
      console.log(`    Rows: ${table.rowCount ?? 'Unknown'}`);
      console.log('');
    }
  } catch (error) {
    displayError(error instanceof Error ? error.message : 'Failed to get schema');
  }
}

/**
 * List all tables
 */
async function tablesCmd(client: SQLiteClient): Promise<void> {
  try {
    const schema = client.getSchema();

    console.log('');
    console.log(colors.secondary('Database Tables'));
    console.log('');

    for (const table of schema.tables) {
      console.log(`  ${colors.brand.primary('•')} ${colors.secondary(table.name)}`);
      console.log(`    ${colors.dim(`${table.columns.length} columns, ${table.rowCount ?? '?'} rows`)}`);
    }

    console.log('');
  } catch (error) {
    displayError(error instanceof Error ? error.message : 'Failed to list tables');
  }
}

/**
 * Describe table structure
 */
async function describeTableCmd(client: SQLiteClient, tableName: string): Promise<void> {
  try {
    const tableInfo = client.getTableInfo(tableName);

    console.log('');
    console.log(colors.secondary(`Table: ${tableName}`));
    console.log('');
    console.log(colors.brand.primary('Columns:'));
    console.log('');

    for (const col of tableInfo.columns) {
      const badges: string[] = [];
      if (col.isPrimaryKey) badges.push(colors.brand.primary('PK'));
      if (col.isForeignKey) badges.push(colors.tertiary('FK'));
      if (!col.nullable) badges.push(colors.dim('NOT NULL'));

      console.log(`  ${colors.secondary(col.name)}`);
      console.log(`    Type: ${col.type} ${badges.join(' ')}`);
      if (col.defaultValue) {
        console.log(`    Default: ${col.defaultValue}`);
      }
      if (col.references) {
        console.log(`    References: ${col.references}`);
      }
      console.log('');
    }

    if (tableInfo.indexes.length > 0) {
      console.log(colors.brand.primary('Indexes:'));
      console.log('');
      for (const idx of tableInfo.indexes) {
        const unique = idx.unique ? colors.brand.primary(' (UNIQUE)') : '';
        console.log(`  ${colors.secondary(idx.name)}${unique}`);
        console.log(`    Columns: ${idx.columns.join(', ')}`);
        console.log('');
      }
    }

    console.log(colors.dim(`Total rows: ${tableInfo.rowCount ?? 'Unknown'}`));
    console.log('');
  } catch (error) {
    displayError(error instanceof Error ? error.message : 'Failed to describe table');
  }
}
