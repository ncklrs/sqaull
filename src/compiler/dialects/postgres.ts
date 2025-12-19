/**
 * PostgreSQL Dialect
 *
 * PostgreSQL-specific SQL compilation utilities and optimizations.
 */

import { compile, type CompiledQuery } from '../sql';
import type { QueryAST } from '../../parser/types';
import { Dialect, type CompilerOptions } from '../types';

/**
 * PostgreSQL-specific compiler options
 */
export interface PostgresOptions extends Omit<CompilerOptions, 'dialect' | 'placeholderStyle'> {
  /**
   * Use ILIKE instead of LIKE for case-insensitive matching
   * @default false
   */
  useILike?: boolean;
}

/**
 * Compile a query for PostgreSQL
 *
 * @param ast - Query AST
 * @param options - PostgreSQL-specific options
 * @returns Compiled SQL with $1, $2, etc. placeholders
 *
 * @example
 * ```typescript
 * const ast = parse(tokens);
 * const result = compilePostgres(ast, { parameterize: true });
 * // { sql: 'SELECT * FROM "users" WHERE "age" > $1', params: [18] }
 * ```
 */
export function compilePostgres(ast: QueryAST, options: PostgresOptions = {}): CompiledQuery {
  const compilerOptions: CompilerOptions = {
    ...options,
    dialect: Dialect.POSTGRES,
    placeholderStyle: 'postgres',
  };

  return compile(ast, compilerOptions);
}

/**
 * Compile a query for PostgreSQL with default settings
 * - Parameterized: true
 * - Quote identifiers: true
 * - Placeholder style: postgres ($1, $2, etc.)
 *
 * @param ast - Query AST
 * @returns Compiled SQL with PostgreSQL defaults
 *
 * @example
 * ```typescript
 * const result = pg(ast);
 * // { sql: 'SELECT "name" FROM "users" WHERE "age" > $1', params: [18] }
 * ```
 */
export function pg(ast: QueryAST): CompiledQuery {
  return compilePostgres(ast, {
    parameterize: true,
    quoteIdentifiers: true,
  });
}

/**
 * PostgreSQL-specific features and utilities
 */
export const postgres = {
  /**
   * Compile with PostgreSQL defaults
   */
  compile: compilePostgres,

  /**
   * Quick compile shorthand
   */
  pg,

  /**
   * Default options for PostgreSQL
   */
  defaultOptions: {
    dialect: Dialect.POSTGRES,
    parameterize: true,
    placeholderStyle: 'postgres' as const,
    quoteIdentifiers: true,
    keywordCase: 'upper' as const,
  },

  /**
   * Escape an identifier for PostgreSQL
   * @param identifier - The identifier to escape
   * @returns Escaped identifier with double quotes
   */
  escapeIdentifier: (identifier: string): string => {
    return `"${identifier.replace(/"/g, '""')}"`;
  },

  /**
   * Escape a string value for PostgreSQL
   * @param value - The string value to escape
   * @returns Escaped string with single quotes
   */
  escapeString: (value: string): string => {
    return `'${value.replace(/'/g, "''")}'`;
  },

  /**
   * Generate RETURNING clause for INSERT/UPDATE/DELETE
   * @param columns - Columns to return
   * @returns RETURNING clause
   */
  returning: (columns: string[]): string => {
    return `RETURNING ${columns.map((c) => `"${c}"`).join(', ')}`;
  },
};

export default postgres;
