/**
 * Database execution layer for sqwind
 *
 * This module provides database connectivity and query execution.
 * Use adapters to connect to PostgreSQL, MySQL, or SQLite databases.
 *
 * @example
 * ```typescript
 * import { createPostgresAdapter } from 'sqwind/db';
 * import { sqw } from 'sqwind';
 *
 * // Create and connect to database
 * const db = createPostgresAdapter({
 *   connectionString: 'postgres://user:pass@localhost:5432/mydb'
 * });
 * await db.connect();
 *
 * // Build and execute query
 * const query = sqw`from:users sel:name,email whr:age>18`;
 * const { sql, params } = query.toParams();
 * const result = await db.execute(sql, params);
 *
 * console.log(result.rows);
 * // [{ name: 'John', email: 'john@example.com' }, ...]
 *
 * await db.disconnect();
 * ```
 */

// Types
export type {
  QueryResult,
  ConnectionConfig,
  DatabaseAdapter,
  Transaction,
  DatabaseClient,
  TransactionClient,
  CreateConnectionOptions,
} from './types';

// Base classes and errors
export {
  BaseAdapter,
  BaseTransaction,
  DatabaseError,
  ConnectionError,
  TransactionError,
} from './adapter';

// Adapters
export {
  PostgresAdapter,
  createPostgresAdapter,
  MySQLAdapter,
  createMySQLAdapter,
  SQLiteAdapter,
  createSQLiteAdapter,
} from './adapters';

// Client
export { createClient, Client } from './client';
