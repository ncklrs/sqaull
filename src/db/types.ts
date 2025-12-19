/**
 * Database execution layer types
 *
 * These types define the interface for database adapters,
 * allowing sqwind to execute queries against real databases.
 */

import type { Dialect } from '../compiler/types';

/**
 * Result of a database query execution
 */
export interface QueryResult<T = Record<string, unknown>> {
  /**
   * Array of rows returned by the query
   */
  rows: T[];

  /**
   * Number of rows affected (for INSERT/UPDATE/DELETE)
   */
  rowCount: number;

  /**
   * Command that was executed (SELECT, INSERT, UPDATE, DELETE)
   */
  command?: string;
}

/**
 * Database connection configuration
 */
export interface ConnectionConfig {
  /**
   * Database host
   */
  host?: string;

  /**
   * Database port
   */
  port?: number;

  /**
   * Database name
   */
  database?: string;

  /**
   * Username for authentication
   */
  user?: string;

  /**
   * Password for authentication
   */
  password?: string;

  /**
   * Connection string (alternative to individual fields)
   * @example "postgres://user:pass@localhost:5432/mydb"
   */
  connectionString?: string;

  /**
   * Path to SQLite database file
   */
  filename?: string;

  /**
   * SSL configuration
   */
  ssl?: boolean | object;

  /**
   * Connection pool size
   */
  poolSize?: number;

  /**
   * Idle timeout in milliseconds
   */
  idleTimeout?: number;
}

/**
 * Database adapter interface
 *
 * All database drivers must implement this interface.
 * This provides a consistent API across PostgreSQL, MySQL, and SQLite.
 */
export interface DatabaseAdapter {
  /**
   * The dialect this adapter is for
   */
  readonly dialect: Dialect;

  /**
   * Whether the adapter is connected
   */
  readonly connected: boolean;

  /**
   * Connect to the database
   */
  connect(): Promise<void>;

  /**
   * Disconnect from the database
   */
  disconnect(): Promise<void>;

  /**
   * Execute a query with parameters
   *
   * @param sql - SQL query string
   * @param params - Query parameters
   * @returns Query result with rows and metadata
   */
  execute<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[]
  ): Promise<QueryResult<T>>;

  /**
   * Execute a query and return only the first row
   *
   * @param sql - SQL query string
   * @param params - Query parameters
   * @returns First row or null if no results
   */
  executeOne<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[]
  ): Promise<T | null>;

  /**
   * Begin a transaction
   * @returns Transaction object
   */
  beginTransaction(): Promise<Transaction>;

  /**
   * Execute raw SQL (for migrations, etc.)
   */
  raw(sql: string): Promise<QueryResult>;
}

/**
 * Transaction interface for atomic operations
 */
export interface Transaction {
  /**
   * Execute a query within this transaction
   */
  execute<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[]
  ): Promise<QueryResult<T>>;

  /**
   * Execute a query and return only the first row
   */
  executeOne<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[]
  ): Promise<T | null>;

  /**
   * Commit the transaction
   */
  commit(): Promise<void>;

  /**
   * Rollback the transaction
   */
  rollback(): Promise<void>;
}

/**
 * Database client wrapper
 *
 * Wraps a database adapter and provides query execution methods
 * that integrate with sqwind's Query objects.
 */
export interface DatabaseClient {
  /**
   * The underlying adapter
   */
  readonly adapter: DatabaseAdapter;

  /**
   * Connect to the database
   */
  connect(): Promise<void>;

  /**
   * Disconnect from the database
   */
  disconnect(): Promise<void>;

  /**
   * Begin a transaction
   */
  transaction<T>(fn: (tx: TransactionClient) => Promise<T>): Promise<T>;
}

/**
 * Transaction-scoped client
 */
export interface TransactionClient {
  /**
   * Execute a query within this transaction
   */
  execute<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[]
  ): Promise<QueryResult<T>>;

  /**
   * Execute a query and return only the first row
   */
  executeOne<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[]
  ): Promise<T | null>;
}

/**
 * Type for native database client instances
 * These are the raw clients from pg, mysql2, better-sqlite3, etc.
 */
export type NativeClient = unknown;

/**
 * Options for creating a database connection
 */
export interface CreateConnectionOptions extends ConnectionConfig {
  /**
   * Which database dialect to use
   */
  dialect: Dialect;

  /**
   * Optional: pass an existing native client
   * Useful for integration with existing database connections
   */
  client?: NativeClient;
}
