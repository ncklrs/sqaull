/**
 * PostgreSQL adapter for sqwind
 *
 * Uses the `pg` package to connect to PostgreSQL databases.
 * Install pg as a peer dependency: npm install pg
 *
 * @example
 * ```typescript
 * import { PostgresAdapter } from 'sqwind/db';
 *
 * const db = new PostgresAdapter({
 *   connectionString: 'postgres://user:pass@localhost:5432/mydb'
 * });
 *
 * await db.connect();
 * const result = await db.execute('SELECT * FROM users WHERE id = $1', [1]);
 * await db.disconnect();
 * ```
 */

import { Dialect } from '../../compiler/types';
import { BaseAdapter, BaseTransaction, ConnectionError, DatabaseError } from '../adapter';
import type { ConnectionConfig, QueryResult, Transaction } from '../types';

// Type definitions for pg (to avoid hard dependency)
interface PgPoolClient {
  query(sql: string, params?: unknown[]): Promise<{ rows: unknown[]; rowCount: number; command: string }>;
  release(): void;
}

interface PgPool {
  connect(): Promise<PgPoolClient>;
  query(sql: string, params?: unknown[]): Promise<{ rows: unknown[]; rowCount: number; command: string }>;
  end(): Promise<void>;
}

interface PgPoolConstructor {
  new (config: object): PgPool;
}

/**
 * PostgreSQL database adapter
 *
 * Wraps the `pg` package for PostgreSQL connectivity.
 * Supports connection pooling, transactions, and parameterized queries.
 */
export class PostgresAdapter extends BaseAdapter {
  readonly dialect = Dialect.POSTGRES;
  private pool: PgPool | null = null;
  private Pool: PgPoolConstructor | null = null;

  constructor(config: ConnectionConfig) {
    super(config);
  }

  /**
   * Connect to the PostgreSQL database
   *
   * Creates a connection pool using the provided configuration.
   */
  async connect(): Promise<void> {
    if (this._connected && this.pool) {
      return;
    }

    try {
      // Dynamically import pg to make it an optional peer dependency
      // @ts-expect-error - pg is an optional peer dependency
      const pg = await import('pg').catch(() => null);

      if (!pg) {
        throw new ConnectionError(
          'pg package not found. Install it with: npm install pg',
          this.config
        );
      }

      this.Pool = pg.Pool;

      const poolConfig: Record<string, unknown> = {};

      if (this.config.connectionString) {
        poolConfig.connectionString = this.config.connectionString;
      } else {
        if (this.config.host) poolConfig.host = this.config.host;
        if (this.config.port) poolConfig.port = this.config.port;
        if (this.config.database) poolConfig.database = this.config.database;
        if (this.config.user) poolConfig.user = this.config.user;
        if (this.config.password) poolConfig.password = this.config.password;
      }

      if (this.config.ssl !== undefined) poolConfig.ssl = this.config.ssl;
      if (this.config.poolSize) poolConfig.max = this.config.poolSize;
      if (this.config.idleTimeout) poolConfig.idleTimeoutMillis = this.config.idleTimeout;

      this.pool = new this.Pool!(poolConfig);
      this._connected = true;
    } catch (error) {
      if (error instanceof ConnectionError) throw error;
      throw new ConnectionError(
        `Failed to connect to PostgreSQL: ${error instanceof Error ? error.message : String(error)}`,
        this.config
      );
    }
  }

  /**
   * Disconnect from the PostgreSQL database
   *
   * Closes the connection pool and all connections.
   */
  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
    this._connected = false;
  }

  /**
   * Execute a query with parameters
   *
   * @param sql - SQL query with $1, $2, etc. placeholders
   * @param params - Array of parameter values
   * @returns Query result with rows and metadata
   */
  async execute<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[]
  ): Promise<QueryResult<T>> {
    this.assertConnected();

    if (!this.pool) {
      throw new ConnectionError('Pool not initialized');
    }

    try {
      const result = await this.pool.query(sql, params);
      return {
        rows: result.rows as T[],
        rowCount: result.rowCount ?? 0,
        command: result.command,
      };
    } catch (error) {
      throw new DatabaseError(
        `Query failed: ${error instanceof Error ? error.message : String(error)}`,
        (error as { code?: string }).code,
        sql,
        params
      );
    }
  }

  /**
   * Execute raw SQL without parameterization
   *
   * Useful for DDL statements, migrations, etc.
   */
  async raw(sql: string): Promise<QueryResult> {
    return this.execute(sql);
  }

  /**
   * Begin a transaction
   *
   * Acquires a client from the pool and starts a transaction.
   * Must call commit() or rollback() when done.
   */
  async beginTransaction(): Promise<Transaction> {
    this.assertConnected();

    if (!this.pool) {
      throw new ConnectionError('Pool not initialized');
    }

    const client = await this.pool.connect();
    await client.query('BEGIN');
    return new PostgresTransaction(client);
  }
}

/**
 * PostgreSQL transaction implementation
 */
class PostgresTransaction extends BaseTransaction {
  private client: PgPoolClient;

  constructor(client: PgPoolClient) {
    super();
    this.client = client;
  }

  async execute<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[]
  ): Promise<QueryResult<T>> {
    this.assertNotCompleted();

    try {
      const result = await this.client.query(sql, params);
      return {
        rows: result.rows as T[],
        rowCount: result.rowCount ?? 0,
        command: result.command,
      };
    } catch (error) {
      throw new DatabaseError(
        `Query failed in transaction: ${error instanceof Error ? error.message : String(error)}`,
        (error as { code?: string }).code,
        sql,
        params
      );
    }
  }

  async commit(): Promise<void> {
    this.assertNotCompleted();
    try {
      await this.client.query('COMMIT');
    } finally {
      this._completed = true;
      this.client.release();
    }
  }

  async rollback(): Promise<void> {
    this.assertNotCompleted();
    try {
      await this.client.query('ROLLBACK');
    } finally {
      this._completed = true;
      this.client.release();
    }
  }
}

/**
 * Create a PostgreSQL adapter
 *
 * Convenience function for creating a PostgresAdapter instance.
 *
 * @example
 * ```typescript
 * const db = createPostgresAdapter({
 *   host: 'localhost',
 *   port: 5432,
 *   database: 'myapp',
 *   user: 'postgres',
 *   password: 'secret',
 * });
 * ```
 */
export function createPostgresAdapter(config: ConnectionConfig): PostgresAdapter {
  return new PostgresAdapter(config);
}
