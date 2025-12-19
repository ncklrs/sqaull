/**
 * High-level database client for sqwind
 *
 * Integrates query building with database execution,
 * providing a seamless ORM-like experience.
 *
 * @example
 * ```typescript
 * import { createClient } from 'sqwind/db';
 * import { Dialect } from 'sqwind';
 *
 * const client = createClient({
 *   dialect: Dialect.POSTGRES,
 *   connectionString: 'postgres://user:pass@localhost:5432/mydb'
 * });
 *
 * await client.connect();
 *
 * // Execute sqwind queries directly
 * const users = await client.query`from:users sel:name,email whr:age>18`;
 *
 * // Or use the fluent builder
 * const orders = await client.sq
 *   .from('orders')
 *   .sel('id', 'total')
 *   .whr('status', '=', 'completed')
 *   .execute();
 *
 * // Transactions
 * await client.transaction(async (tx) => {
 *   await tx.query`upd:users set:balance=0 whr:id=1`;
 *   await tx.query`ins:transactions cols:user_id,amount vals:1,-100`;
 * });
 *
 * await client.disconnect();
 * ```
 */

import { Dialect } from '../compiler/types';
import { lex } from '../parser/lexer';
import { parse } from '../parser/parser';
import { compile } from '../compiler/sql';
import { Query } from '../builder/query';
import { QueryBuilder } from '../builder/chain';
import type { DatabaseAdapter, Transaction, QueryResult, CreateConnectionOptions } from './types';
import { createPostgresAdapter } from './adapters/postgres';
import { createMySQLAdapter } from './adapters/mysql';
import { createSQLiteAdapter } from './adapters/sqlite';

/**
 * High-level database client
 *
 * Combines query building with database execution.
 */
export class Client {
  readonly adapter: DatabaseAdapter;
  private _dialect: Dialect;

  constructor(adapter: DatabaseAdapter) {
    this.adapter = adapter;
    this._dialect = adapter.dialect;
  }

  /**
   * Get the dialect for this client
   */
  get dialect(): Dialect {
    return this._dialect;
  }

  /**
   * Check if connected
   */
  get connected(): boolean {
    return this.adapter.connected;
  }

  /**
   * Connect to the database
   */
  async connect(): Promise<void> {
    await this.adapter.connect();
  }

  /**
   * Disconnect from the database
   */
  async disconnect(): Promise<void> {
    await this.adapter.disconnect();
  }

  /**
   * Execute a sqwind query using template literal syntax
   *
   * @example
   * ```typescript
   * const users = await client.query`from:users sel:name,email whr:age>18`;
   * ```
   */
  async query<T = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T[]> {
    // Combine template strings with interpolated values
    let queryString = '';
    for (let i = 0; i < strings.length; i++) {
      queryString += strings[i];
      if (i < values.length) {
        queryString += String(values[i]);
      }
    }

    // Parse and compile
    const tokens = lex(queryString.trim());
    const ast = parse(tokens);
    const compiled = compile(ast, {
      dialect: this._dialect,
      parameterize: true,
    });

    // Execute
    const result = await this.adapter.execute<T>(compiled.sql, compiled.params);
    return result.rows;
  }

  /**
   * Execute a sqwind query and return only the first row
   *
   * @example
   * ```typescript
   * const user = await client.queryOne`from:users sel:* whr:id=1`;
   * ```
   */
  async queryOne<T = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T | null> {
    const rows = await this.query<T>(strings, ...values);
    return rows[0] ?? null;
  }

  /**
   * Execute a Query object
   *
   * @example
   * ```typescript
   * const query = sqw`from:users sel:name,email`;
   * const users = await client.run(query);
   * ```
   */
  async run<T = Record<string, unknown>>(query: Query): Promise<T[]> {
    const { sql, params } = query.withOptions({ dialect: this._dialect }).toParams();
    const result = await this.adapter.execute<T>(sql, params);
    return result.rows;
  }

  /**
   * Execute a Query object and return only the first row
   */
  async runOne<T = Record<string, unknown>>(query: Query): Promise<T | null> {
    const rows = await this.run<T>(query);
    return rows[0] ?? null;
  }

  /**
   * Get a fluent query builder bound to this client
   *
   * @example
   * ```typescript
   * const users = await client.sq
   *   .from('users')
   *   .sel('name', 'email')
   *   .whr('age', '>', 18)
   *   .execute();
   * ```
   */
  get sq(): BoundQueryBuilder {
    return new BoundQueryBuilder(this);
  }

  /**
   * Execute raw SQL
   *
   * @example
   * ```typescript
   * await client.raw('CREATE TABLE users (id SERIAL PRIMARY KEY, name TEXT)');
   * ```
   */
  async raw(sql: string): Promise<QueryResult> {
    return this.adapter.raw(sql);
  }

  /**
   * Execute a parameterized SQL query directly
   *
   * @example
   * ```typescript
   * const result = await client.sql('SELECT * FROM users WHERE id = $1', [1]);
   * ```
   */
  async sql<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[]
  ): Promise<T[]> {
    const result = await this.adapter.execute<T>(sql, params);
    return result.rows;
  }

  /**
   * Execute a transaction
   *
   * The transaction is automatically committed if the callback succeeds,
   * or rolled back if it throws an error.
   *
   * @example
   * ```typescript
   * await client.transaction(async (tx) => {
   *   await tx.query`upd:users set:balance=0 whr:id=1`;
   *   await tx.query`ins:audit cols:action vals:reset_balance`;
   * });
   * ```
   */
  async transaction<T>(
    fn: (tx: TransactionClient) => Promise<T>
  ): Promise<T> {
    const tx = await this.adapter.beginTransaction();
    const txClient = new TransactionClient(tx, this._dialect);

    try {
      const result = await fn(txClient);
      await tx.commit();
      return result;
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  }
}

/**
 * Transaction-scoped client
 *
 * Provides the same query interface but runs within a transaction.
 */
export class TransactionClient {
  private tx: Transaction;
  private _dialect: Dialect;

  constructor(tx: Transaction, dialect: Dialect) {
    this.tx = tx;
    this._dialect = dialect;
  }

  /**
   * Execute a sqwind query within this transaction
   */
  async query<T = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T[]> {
    let queryString = '';
    for (let i = 0; i < strings.length; i++) {
      queryString += strings[i];
      if (i < values.length) {
        queryString += String(values[i]);
      }
    }

    const tokens = lex(queryString.trim());
    const ast = parse(tokens);
    const compiled = compile(ast, {
      dialect: this._dialect,
      parameterize: true,
    });

    const result = await this.tx.execute<T>(compiled.sql, compiled.params);
    return result.rows;
  }

  /**
   * Execute a sqwind query and return only the first row
   */
  async queryOne<T = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T | null> {
    const rows = await this.query<T>(strings, ...values);
    return rows[0] ?? null;
  }

  /**
   * Execute a Query object within this transaction
   */
  async run<T = Record<string, unknown>>(query: Query): Promise<T[]> {
    const { sql, params } = query.withOptions({ dialect: this._dialect }).toParams();
    const result = await this.tx.execute<T>(sql, params);
    return result.rows;
  }

  /**
   * Execute a Query object and return only the first row
   */
  async runOne<T = Record<string, unknown>>(query: Query): Promise<T | null> {
    const rows = await this.run<T>(query);
    return rows[0] ?? null;
  }

  /**
   * Execute parameterized SQL directly
   */
  async sql<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[]
  ): Promise<T[]> {
    const result = await this.tx.execute<T>(sql, params);
    return result.rows;
  }
}

/**
 * Query builder bound to a client for direct execution
 */
class BoundQueryBuilder extends QueryBuilder {
  private client: Client;

  constructor(client: Client) {
    super();
    this.client = client;
  }

  /**
   * Execute the built query
   */
  async execute<T = Record<string, unknown>>(): Promise<T[]> {
    const query = this.build();
    return this.client.run<T>(query);
  }

  /**
   * Execute the built query and return first row
   */
  async executeOne<T = Record<string, unknown>>(): Promise<T | null> {
    const query = this.build();
    return this.client.runOne<T>(query);
  }
}

/**
 * Create a database client
 *
 * Automatically selects the appropriate adapter based on dialect.
 *
 * @example
 * ```typescript
 * // PostgreSQL
 * const pg = createClient({
 *   dialect: Dialect.POSTGRES,
 *   connectionString: 'postgres://user:pass@localhost:5432/mydb'
 * });
 *
 * // MySQL
 * const mysql = createClient({
 *   dialect: Dialect.MYSQL,
 *   host: 'localhost',
 *   user: 'root',
 *   password: 'secret',
 *   database: 'mydb'
 * });
 *
 * // SQLite
 * const sqlite = createClient({
 *   dialect: Dialect.SQLITE,
 *   filename: './app.db'
 * });
 * ```
 */
export function createClient(options: CreateConnectionOptions): Client {
  let adapter: DatabaseAdapter;

  switch (options.dialect) {
    case Dialect.POSTGRES:
      adapter = createPostgresAdapter(options);
      break;
    case Dialect.MYSQL:
      adapter = createMySQLAdapter(options);
      break;
    case Dialect.SQLITE:
      adapter = createSQLiteAdapter(options);
      break;
    default:
      throw new Error(`Unsupported dialect: ${options.dialect}`);
  }

  return new Client(adapter);
}
