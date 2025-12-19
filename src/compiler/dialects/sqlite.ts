/**
 * SQLite Dialect
 *
 * SQLite-specific SQL compilation utilities and optimizations.
 */

import { compile, type CompiledQuery } from '../sql';
import type { QueryAST } from '../../parser/types';
import { Dialect, type CompilerOptions } from '../types';

/**
 * SQLite-specific compiler options
 */
export interface SQLiteOptions extends Omit<CompilerOptions, 'dialect' | 'placeholderStyle'> {
  /**
   * Use strict mode (newer SQLite versions)
   * @default false
   */
  strictMode?: boolean;
}

/**
 * Compile a query for SQLite
 *
 * @param ast - Query AST
 * @param options - SQLite-specific options
 * @returns Compiled SQL with ? placeholders
 *
 * @example
 * ```typescript
 * const ast = parse(tokens);
 * const result = compileSQLite(ast, { parameterize: true });
 * // { sql: 'SELECT * FROM "users" WHERE "age" > ?', params: [18] }
 * ```
 */
export function compileSQLite(ast: QueryAST, options: SQLiteOptions = {}): CompiledQuery {
  const compilerOptions: CompilerOptions = {
    ...options,
    dialect: Dialect.SQLITE,
    placeholderStyle: 'sqlite',
  };

  return compile(ast, compilerOptions);
}

/**
 * Compile a query for SQLite with default settings
 * - Parameterized: true
 * - Quote identifiers: true (with double quotes)
 * - Placeholder style: sqlite (?)
 *
 * @param ast - Query AST
 * @returns Compiled SQL with SQLite defaults
 *
 * @example
 * ```typescript
 * const result = sqlite(ast);
 * // { sql: 'SELECT "name" FROM "users" WHERE "age" > ?', params: [18] }
 * ```
 */
export function sqliteCompile(ast: QueryAST): CompiledQuery {
  return compileSQLite(ast, {
    parameterize: true,
    quoteIdentifiers: true,
  });
}

/**
 * SQLite-specific features and utilities
 */
export const sqlite = {
  /**
   * Compile with SQLite defaults
   */
  compile: compileSQLite,

  /**
   * Quick compile shorthand
   */
  q: sqliteCompile,

  /**
   * Default options for SQLite
   */
  defaultOptions: {
    dialect: Dialect.SQLITE,
    parameterize: true,
    placeholderStyle: 'sqlite' as const,
    quoteIdentifiers: true,
    keywordCase: 'upper' as const,
  },

  /**
   * Escape an identifier for SQLite
   * @param identifier - The identifier to escape
   * @returns Escaped identifier with double quotes
   */
  escapeIdentifier: (identifier: string): string => {
    return `"${identifier.replace(/"/g, '""')}"`;
  },

  /**
   * Escape a string value for SQLite
   * @param value - The string value to escape
   * @returns Escaped string with single quotes
   */
  escapeString: (value: string): string => {
    return `'${value.replace(/'/g, "''")}'`;
  },

  /**
   * Generate RETURNING clause (SQLite 3.35+)
   * @param columns - Columns to return
   * @returns RETURNING clause
   */
  returning: (columns: string[]): string => {
    return `RETURNING ${columns.map((c) => `"${c}"`).join(', ')}`;
  },

  /**
   * Generate UPSERT clause (INSERT ... ON CONFLICT)
   * @param conflictColumns - Columns that define the conflict
   * @param updates - Columns to update on conflict
   * @returns ON CONFLICT clause
   */
  onConflict: (conflictColumns: string[], updates: Record<string, string>): string => {
    const conflict = conflictColumns.map((c) => `"${c}"`).join(', ');
    const updatePairs = Object.entries(updates).map(
      ([col, val]) => `"${col}" = ${val}`
    );
    return `ON CONFLICT (${conflict}) DO UPDATE SET ${updatePairs.join(', ')}`;
  },

  /**
   * Check if RETURNING is supported (SQLite 3.35+)
   * Note: This is a runtime check helper
   * @returns SQL to check version
   */
  supportsReturning: (): string => {
    return "SELECT sqlite_version() >= '3.35.0' AS supports_returning";
  },
};

export default sqlite;
