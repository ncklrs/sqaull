/**
 * Query result wrapper for sqwind
 *
 * Wraps a compiled query AST and provides methods to generate SQL
 * in various formats (raw SQL, parameterized, etc.)
 */

import type { QueryAST } from '../parser/types';
import { compile, type CompiledQuery } from '../compiler/sql';
import type { CompilerOptions } from '../compiler/types';

/**
 * Query class that wraps a compiled QueryAST
 *
 * Provides methods to convert the AST to SQL in different formats
 * and chainable methods to modify the query.
 *
 * @example
 * ```typescript
 * const query = new Query(ast, { dialect: Dialect.POSTGRES });
 *
 * // Get raw SQL
 * query.toSQL();
 * // "SELECT name FROM users WHERE age > 18"
 *
 * // Get parameterized SQL
 * query.toParams();
 * // { sql: "SELECT name FROM users WHERE age > $1", params: [18] }
 *
 * // Chain modifications
 * query.limit(10).offset(5);
 * ```
 */
export class Query {
  private ast: QueryAST;
  private options: CompilerOptions;

  /**
   * Create a new Query instance
   *
   * @param ast - The QueryAST to wrap
   * @param options - Compiler options for SQL generation
   */
  constructor(ast: QueryAST, options?: CompilerOptions) {
    this.ast = ast;
    this.options = options || {};
  }

  /**
   * Get the underlying AST
   *
   * @returns The QueryAST
   */
  getAST(): QueryAST {
    return this.ast;
  }

  /**
   * Get compiler options
   *
   * @returns The compiler options
   */
  getOptions(): CompilerOptions {
    return this.options;
  }

  /**
   * Convert query to raw SQL string (non-parameterized)
   *
   * @param options - Optional compiler options to override defaults
   * @returns SQL string
   *
   * @example
   * ```typescript
   * query.toSQL();
   * // "SELECT name, email FROM users WHERE age > 18 ORDER BY name LIMIT 10"
   * ```
   */
  toSQL(options?: CompilerOptions): string {
    const compiled = compile(this.ast, {
      ...this.options,
      ...options,
      parameterize: false,
    });
    return compiled.sql;
  }

  /**
   * Convert query to parameterized SQL with parameter values
   *
   * @param options - Optional compiler options to override defaults
   * @returns Object containing SQL string and parameter array
   *
   * @example
   * ```typescript
   * query.toParams();
   * // { sql: "SELECT name FROM users WHERE age > $1 LIMIT $2", params: [18, 10] }
   * ```
   */
  toParams(options?: CompilerOptions): { sql: string; params: unknown[] } {
    const compiled = compile(this.ast, {
      ...this.options,
      ...options,
      parameterize: true,
    });
    return {
      sql: compiled.sql,
      params: compiled.params,
    };
  }

  /**
   * Convert query to string (same as toSQL())
   *
   * Allows query to be used in template literals and string contexts
   *
   * @returns SQL string
   */
  toString(): string {
    return this.toSQL();
  }

  /**
   * Add or update LIMIT clause
   *
   * @param n - Maximum number of rows to return
   * @returns New Query instance with updated LIMIT
   *
   * @example
   * ```typescript
   * query.limit(10);
   * // Adds/updates: LIMIT 10
   * ```
   */
  limit(n: number): Query {
    if (!Number.isInteger(n) || n < 0) {
      throw new Error(`Invalid limit value: ${n}. Must be a non-negative integer.`);
    }

    const newAST: QueryAST = {
      ...this.ast,
      limit: { limit: n },
    };

    return new Query(newAST, this.options);
  }

  /**
   * Add or update OFFSET clause
   *
   * @param n - Number of rows to skip
   * @returns New Query instance with updated OFFSET
   *
   * @example
   * ```typescript
   * query.offset(20);
   * // Adds/updates: OFFSET 20
   * ```
   */
  offset(n: number): Query {
    if (!Number.isInteger(n) || n < 0) {
      throw new Error(`Invalid offset value: ${n}. Must be a non-negative integer.`);
    }

    const newAST: QueryAST = {
      ...this.ast,
      offset: { offset: n },
    };

    return new Query(newAST, this.options);
  }

  /**
   * Clone this query with new compiler options
   *
   * @param options - New compiler options to merge
   * @returns New Query instance with updated options
   *
   * @example
   * ```typescript
   * query.withOptions({ dialect: Dialect.POSTGRES, pretty: true });
   * ```
   */
  withOptions(options: CompilerOptions): Query {
    return new Query(this.ast, { ...this.options, ...options });
  }

  /**
   * Get a compiled result with current options
   *
   * @returns CompiledQuery object with sql and params
   */
  compile(): CompiledQuery {
    return compile(this.ast, this.options);
  }

  // Future extension points for execute methods
  // These would be implemented when database adapters are added

  /**
   * Execute query against a database connection (future)
   *
   * @param db - Database connection (type to be determined)
   * @returns Promise of query results
   *
   * @example
   * ```typescript
   * // Future implementation
   * const results = await query.execute(db);
   * ```
   */
  // async execute<T = unknown>(db: DatabaseConnection): Promise<T[]> {
  //   throw new Error('Query execution not yet implemented');
  // }

  /**
   * Execute query and return first result (future)
   *
   * @param db - Database connection (type to be determined)
   * @returns Promise of first result or null
   */
  // async executeOne<T = unknown>(db: DatabaseConnection): Promise<T | null> {
  //   throw new Error('Query execution not yet implemented');
  // }
}
