/**
 * SQLite adapter for sqwind
 *
 * Uses the `better-sqlite3` package for SQLite connectivity.
 * Install better-sqlite3 as a peer dependency: npm install better-sqlite3
 *
 * @example
 * ```typescript
 * import { SQLiteAdapter } from 'sqwind/db';
 *
 * const db = new SQLiteAdapter({
 *   filename: './mydb.sqlite'
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

// Type definitions for better-sqlite3 (to avoid hard dependency)
interface BetterSQLite3Statement {
  run(...params: unknown[]): { changes: number; lastInsertRowid: number | bigint };
  all(...params: unknown[]): unknown[];
  get(...params: unknown[]): unknown | undefined;
}

interface BetterSQLite3Database {
  prepare(sql: string): BetterSQLite3Statement;
  pragma(pragma: string): unknown;
  close(): void;
  transaction<T>(fn: () => T): () => T;
  inTransaction: boolean;
}

interface BetterSQLite3Constructor {
  new (filename: string, options?: object): BetterSQLite3Database;
}

/**
 * Run raw SQL on a better-sqlite3 database
 * Uses prepare().run() as an alternative to the exec method
 */
function runRawSQL(db: BetterSQLite3Database, sql: string): void {
  // Split by semicolons and run each statement
  const statements = sql.split(';').filter(s => s.trim());
  for (const stmt of statements) {
    if (stmt.trim()) {
      db.prepare(stmt).run();
    }
  }
}

/**
 * SQLite database adapter
 *
 * Wraps the `better-sqlite3` package for SQLite connectivity.
 * Note: SQLite operations are synchronous but wrapped in promises for consistency.
 */
export class SQLiteAdapter extends BaseAdapter {
  readonly dialect = Dialect.SQLITE;
  private db: BetterSQLite3Database | null = null;

  constructor(config: ConnectionConfig) {
    super(config);
    if (!config.filename) {
      throw new ConnectionError(
        'SQLite adapter requires a filename in the config',
        config
      );
    }
  }

  /**
   * Connect to the SQLite database
   *
   * Opens the database file. Creates it if it doesn't exist.
   */
  async connect(): Promise<void> {
    if (this._connected && this.db) {
      return;
    }

    try {
      // Dynamically import better-sqlite3 to make it an optional peer dependency
      // @ts-expect-error - better-sqlite3 is an optional peer dependency
      const sqlite3Module = await import('better-sqlite3').catch(() => null);

      if (!sqlite3Module) {
        throw new ConnectionError(
          'better-sqlite3 package not found. Install it with: npm install better-sqlite3',
          this.config
        );
      }

      const Database = sqlite3Module.default as BetterSQLite3Constructor;

      this.db = new Database(this.config.filename!);

      // Enable foreign keys by default
      this.db.pragma('foreign_keys = ON');

      this._connected = true;
    } catch (error) {
      if (error instanceof ConnectionError) throw error;
      throw new ConnectionError(
        `Failed to connect to SQLite: ${error instanceof Error ? error.message : String(error)}`,
        this.config
      );
    }
  }

  /**
   * Disconnect from the SQLite database
   *
   * Closes the database file.
   */
  async disconnect(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
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

    if (!this.db) {
      throw new ConnectionError('Database not initialized');
    }

    try {
      const stmt = this.db.prepare(sql);
      const command = this.extractCommand(sql);

      if (command === 'SELECT') {
        // SELECT query - return rows
        const rows = params ? stmt.all(...params) : stmt.all();
        return {
          rows: rows as T[],
          rowCount: rows.length,
          command,
        };
      } else {
        // INSERT/UPDATE/DELETE - run and return affected rows
        const result = params ? stmt.run(...params) : stmt.run();

        // For INSERT with RETURNING, we need to handle differently
        if (sql.toUpperCase().includes('RETURNING')) {
          const rows = params ? stmt.all(...params) : stmt.all();
          return {
            rows: rows as T[],
            rowCount: rows.length,
            command,
          };
        }

        return {
          rows: [] as T[],
          rowCount: result.changes,
          command,
        };
      }
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
   * Run raw SQL without parameterization
   *
   * Useful for DDL statements, migrations, etc.
   * Can handle multiple statements.
   */
  async raw(sql: string): Promise<QueryResult> {
    this.assertConnected();

    if (!this.db) {
      throw new ConnectionError('Database not initialized');
    }

    try {
      runRawSQL(this.db, sql);
      return {
        rows: [],
        rowCount: 0,
        command: 'RAW',
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
   * SQLite transactions are handled via better-sqlite3's transaction() method
   * or manual BEGIN/COMMIT/ROLLBACK.
   */
  async beginTransaction(): Promise<Transaction> {
    this.assertConnected();

    if (!this.db) {
      throw new ConnectionError('Database not initialized');
    }

    // SQLite doesn't have connection pooling, so we use the same db instance
    // but track transaction state
    this.db.prepare('BEGIN').run();
    return new SQLiteTransaction(this.db);
  }

  private extractCommand(sql: string): string {
    const match = sql.trim().match(/^(\w+)/);
    return match ? match[1].toUpperCase() : 'UNKNOWN';
  }
}

/**
 * SQLite transaction implementation
 */
class SQLiteTransaction extends BaseTransaction {
  private db: BetterSQLite3Database;

  constructor(db: BetterSQLite3Database) {
    super();
    this.db = db;
  }

  async execute<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[]
  ): Promise<QueryResult<T>> {
    this.assertNotCompleted();

    try {
      const stmt = this.db.prepare(sql);
      const command = this.extractCommand(sql);

      if (command === 'SELECT') {
        const rows = params ? stmt.all(...params) : stmt.all();
        return {
          rows: rows as T[],
          rowCount: rows.length,
          command,
        };
      } else {
        if (sql.toUpperCase().includes('RETURNING')) {
          const rows = params ? stmt.all(...params) : stmt.all();
          return {
            rows: rows as T[],
            rowCount: rows.length,
            command,
          };
        }

        const result = params ? stmt.run(...params) : stmt.run();
        return {
          rows: [] as T[],
          rowCount: result.changes,
          command,
        };
      }
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
      this.db.prepare('COMMIT').run();
    } finally {
      this._completed = true;
    }
  }

  async rollback(): Promise<void> {
    this.assertNotCompleted();
    try {
      this.db.prepare('ROLLBACK').run();
    } finally {
      this._completed = true;
    }
  }

  private extractCommand(sql: string): string {
    const match = sql.trim().match(/^(\w+)/);
    return match ? match[1].toUpperCase() : 'UNKNOWN';
  }
}

/**
 * Create a SQLite adapter
 *
 * Convenience function for creating a SQLiteAdapter instance.
 *
 * @example
 * ```typescript
 * const db = createSQLiteAdapter({ filename: ':memory:' }); // In-memory DB
 * const db = createSQLiteAdapter({ filename: './app.db' }); // File-based DB
 * ```
 */
export function createSQLiteAdapter(config: ConnectionConfig): SQLiteAdapter {
  return new SQLiteAdapter(config);
}
