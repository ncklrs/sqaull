/**
 * Base database adapter implementation
 *
 * Provides common functionality for all database adapters.
 * Specific adapters (Postgres, MySQL, SQLite) extend this class.
 */

import { Dialect } from '../compiler/types';
import type {
  DatabaseAdapter,
  QueryResult,
  Transaction,
  ConnectionConfig,
} from './types';

/**
 * Error thrown when database operations fail
 */
export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly query?: string,
    public readonly params?: unknown[]
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

/**
 * Error thrown when connection fails
 */
export class ConnectionError extends DatabaseError {
  constructor(message: string, public readonly config?: ConnectionConfig) {
    super(message);
    this.name = 'ConnectionError';
  }
}

/**
 * Error thrown when transaction fails
 */
export class TransactionError extends DatabaseError {
  constructor(message: string) {
    super(message);
    this.name = 'TransactionError';
  }
}

/**
 * Abstract base class for database adapters
 *
 * Implement the abstract methods to create an adapter for a specific database.
 */
export abstract class BaseAdapter implements DatabaseAdapter {
  abstract readonly dialect: Dialect;
  protected _connected = false;
  protected config: ConnectionConfig;

  constructor(config: ConnectionConfig) {
    this.config = config;
  }

  get connected(): boolean {
    return this._connected;
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract execute<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[]
  ): Promise<QueryResult<T>>;
  abstract beginTransaction(): Promise<Transaction>;
  abstract raw(sql: string): Promise<QueryResult>;

  /**
   * Execute a query and return only the first row
   *
   * Default implementation uses execute() and returns first row
   */
  async executeOne<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[]
  ): Promise<T | null> {
    const result = await this.execute<T>(sql, params);
    return result.rows[0] ?? null;
  }

  /**
   * Ensure adapter is connected before executing
   */
  protected assertConnected(): void {
    if (!this._connected) {
      throw new ConnectionError('Not connected to database');
    }
  }
}

/**
 * Base transaction implementation
 */
export abstract class BaseTransaction implements Transaction {
  protected _completed = false;

  abstract execute<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[]
  ): Promise<QueryResult<T>>;
  abstract commit(): Promise<void>;
  abstract rollback(): Promise<void>;

  async executeOne<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[]
  ): Promise<T | null> {
    const result = await this.execute<T>(sql, params);
    return result.rows[0] ?? null;
  }

  protected assertNotCompleted(): void {
    if (this._completed) {
      throw new TransactionError(
        'Transaction already completed (committed or rolled back)'
      );
    }
  }
}
