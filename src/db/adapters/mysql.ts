/**
 * MySQL adapter for sqwind
 *
 * Uses the `mysql2` package to connect to MySQL databases.
 * Install mysql2 as a peer dependency: npm install mysql2
 *
 * @example
 * ```typescript
 * import { MySQLAdapter } from 'sqwind/db';
 *
 * const db = new MySQLAdapter({
 *   host: 'localhost',
 *   user: 'root',
 *   password: 'secret',
 *   database: 'mydb'
 * });
 *
 * await db.connect();
 * const result = await db.execute('SELECT * FROM users WHERE id = ?', [1]);
 * await db.disconnect();
 * ```
 */

import { Dialect } from '../../compiler/types';
import { BaseAdapter, BaseTransaction, ConnectionError, DatabaseError } from '../adapter';
import type { ConnectionConfig, QueryResult, Transaction } from '../types';

// Type definitions for mysql2 (to avoid hard dependency)
interface MySQLConnection {
  execute(sql: string, params?: unknown[]): Promise<[unknown[], unknown]>;
  query(sql: string): Promise<[unknown[], unknown]>;
  beginTransaction(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  release(): void;
}

interface MySQLPool {
  getConnection(): Promise<MySQLConnection>;
  execute(sql: string, params?: unknown[]): Promise<[unknown[], unknown]>;
  query(sql: string): Promise<[unknown[], unknown]>;
  end(): Promise<void>;
}

interface MySQL2Module {
  createPool(config: object): { promise(): MySQLPool };
}

/**
 * MySQL database adapter
 *
 * Wraps the `mysql2` package for MySQL connectivity.
 * Uses connection pooling with promises API.
 */
export class MySQLAdapter extends BaseAdapter {
  readonly dialect = Dialect.MYSQL;
  private pool: MySQLPool | null = null;

  constructor(config: ConnectionConfig) {
    super(config);
  }

  /**
   * Connect to the MySQL database
   *
   * Creates a connection pool using the provided configuration.
   */
  async connect(): Promise<void> {
    if (this._connected && this.pool) {
      return;
    }

    try {
      // Dynamically import mysql2 to make it an optional peer dependency
      // @ts-expect-error - mysql2 is an optional peer dependency
      const mysql2 = (await import('mysql2').catch(() => null)) as MySQL2Module | null;

      if (!mysql2) {
        throw new ConnectionError(
          'mysql2 package not found. Install it with: npm install mysql2',
          this.config
        );
      }

      const poolConfig: Record<string, unknown> = {
        waitForConnections: true,
        connectionLimit: this.config.poolSize ?? 10,
        queueLimit: 0,
      };

      if (this.config.connectionString) {
        // Parse connection string for mysql2
        const url = new URL(this.config.connectionString);
        poolConfig.host = url.hostname;
        poolConfig.port = parseInt(url.port) || 3306;
        poolConfig.user = url.username;
        poolConfig.password = url.password;
        poolConfig.database = url.pathname.slice(1); // Remove leading /
      } else {
        if (this.config.host) poolConfig.host = this.config.host;
        if (this.config.port) poolConfig.port = this.config.port;
        if (this.config.database) poolConfig.database = this.config.database;
        if (this.config.user) poolConfig.user = this.config.user;
        if (this.config.password) poolConfig.password = this.config.password;
      }

      if (this.config.ssl !== undefined) poolConfig.ssl = this.config.ssl;

      // Use promise wrapper for mysql2
      this.pool = mysql2.createPool(poolConfig).promise();
      this._connected = true;
    } catch (error) {
      if (error instanceof ConnectionError) throw error;
      throw new ConnectionError(
        `Failed to connect to MySQL: ${error instanceof Error ? error.message : String(error)}`,
        this.config
      );
    }
  }

  /**
   * Disconnect from the MySQL database
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
   * @param sql - SQL query with ? placeholders
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
      const [rows] = await this.pool.execute(sql, params);

      // Handle INSERT/UPDATE/DELETE results vs SELECT
      if (Array.isArray(rows)) {
        return {
          rows: rows as T[],
          rowCount: rows.length,
          command: this.extractCommand(sql),
        };
      }

      // For INSERT/UPDATE/DELETE, mysql2 returns a ResultSetHeader
      const resultHeader = rows as {
        affectedRows?: number;
        insertId?: number;
      };

      return {
        rows: [] as T[],
        rowCount: resultHeader.affectedRows ?? 0,
        command: this.extractCommand(sql),
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
    this.assertConnected();

    if (!this.pool) {
      throw new ConnectionError('Pool not initialized');
    }

    try {
      const [rows] = await this.pool.query(sql);

      if (Array.isArray(rows)) {
        return {
          rows: rows as Record<string, unknown>[],
          rowCount: rows.length,
          command: this.extractCommand(sql),
        };
      }

      const resultHeader = rows as { affectedRows?: number };
      return {
        rows: [],
        rowCount: resultHeader.affectedRows ?? 0,
        command: this.extractCommand(sql),
      };
    } catch (error) {
      throw new DatabaseError(
        `Raw query failed: ${error instanceof Error ? error.message : String(error)}`,
        (error as { code?: string }).code,
        sql
      );
    }
  }

  /**
   * Begin a transaction
   *
   * Acquires a connection from the pool and starts a transaction.
   */
  async beginTransaction(): Promise<Transaction> {
    this.assertConnected();

    if (!this.pool) {
      throw new ConnectionError('Pool not initialized');
    }

    const connection = await this.pool.getConnection();
    await connection.beginTransaction();
    return new MySQLTransaction(connection);
  }

  private extractCommand(sql: string): string {
    const match = sql.trim().match(/^(\w+)/);
    return match ? match[1].toUpperCase() : 'UNKNOWN';
  }
}

/**
 * MySQL transaction implementation
 */
class MySQLTransaction extends BaseTransaction {
  private connection: MySQLConnection;

  constructor(connection: MySQLConnection) {
    super();
    this.connection = connection;
  }

  async execute<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[]
  ): Promise<QueryResult<T>> {
    this.assertNotCompleted();

    try {
      const [rows] = await this.connection.execute(sql, params);

      if (Array.isArray(rows)) {
        return {
          rows: rows as T[],
          rowCount: rows.length,
          command: this.extractCommand(sql),
        };
      }

      const resultHeader = rows as { affectedRows?: number };
      return {
        rows: [] as T[],
        rowCount: resultHeader.affectedRows ?? 0,
        command: this.extractCommand(sql),
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
      await this.connection.commit();
    } finally {
      this._completed = true;
      this.connection.release();
    }
  }

  async rollback(): Promise<void> {
    this.assertNotCompleted();
    try {
      await this.connection.rollback();
    } finally {
      this._completed = true;
      this.connection.release();
    }
  }

  private extractCommand(sql: string): string {
    const match = sql.trim().match(/^(\w+)/);
    return match ? match[1].toUpperCase() : 'UNKNOWN';
  }
}

/**
 * Create a MySQL adapter
 *
 * Convenience function for creating a MySQLAdapter instance.
 */
export function createMySQLAdapter(config: ConnectionConfig): MySQLAdapter {
  return new MySQLAdapter(config);
}
