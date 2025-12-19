/**
 * MySQL Dialect
 *
 * MySQL-specific SQL compilation utilities and optimizations.
 */

import { compile, type CompiledQuery } from '../sql';
import type { QueryAST } from '../../parser/types';
import { Dialect, type CompilerOptions } from '../types';

/**
 * MySQL-specific compiler options
 */
export interface MySQLOptions extends Omit<CompilerOptions, 'dialect' | 'placeholderStyle'> {
  /**
   * Use backticks for identifier quoting (MySQL style)
   * @default true
   */
  useBackticks?: boolean;
}

/**
 * Compile a query for MySQL
 *
 * @param ast - Query AST
 * @param options - MySQL-specific options
 * @returns Compiled SQL with ? placeholders
 *
 * @example
 * ```typescript
 * const ast = parse(tokens);
 * const result = compileMySQL(ast, { parameterize: true });
 * // { sql: 'SELECT * FROM `users` WHERE `age` > ?', params: [18] }
 * ```
 */
export function compileMySQL(ast: QueryAST, options: MySQLOptions = {}): CompiledQuery {
  const compilerOptions: CompilerOptions = {
    ...options,
    dialect: Dialect.MYSQL,
    placeholderStyle: 'mysql',
    // MySQL uses backticks by default if quoting is enabled
    quoteIdentifiers: options.quoteIdentifiers ?? options.useBackticks ?? true,
  };

  return compile(ast, compilerOptions);
}

/**
 * Compile a query for MySQL with default settings
 * - Parameterized: true
 * - Quote identifiers: true (with backticks)
 * - Placeholder style: mysql (?)
 *
 * @param ast - Query AST
 * @returns Compiled SQL with MySQL defaults
 *
 * @example
 * ```typescript
 * const result = mysql(ast);
 * // { sql: 'SELECT `name` FROM `users` WHERE `age` > ?', params: [18] }
 * ```
 */
export function mysqlCompile(ast: QueryAST): CompiledQuery {
  return compileMySQL(ast, {
    parameterize: true,
    quoteIdentifiers: true,
  });
}

/**
 * MySQL-specific features and utilities
 */
export const mysql = {
  /**
   * Compile with MySQL defaults
   */
  compile: compileMySQL,

  /**
   * Quick compile shorthand
   */
  q: mysqlCompile,

  /**
   * Default options for MySQL
   */
  defaultOptions: {
    dialect: Dialect.MYSQL,
    parameterize: true,
    placeholderStyle: 'mysql' as const,
    quoteIdentifiers: true,
    keywordCase: 'upper' as const,
  },

  /**
   * Escape an identifier for MySQL
   * @param identifier - The identifier to escape
   * @returns Escaped identifier with backticks
   */
  escapeIdentifier: (identifier: string): string => {
    return `\`${identifier.replace(/`/g, '``')}\``;
  },

  /**
   * Escape a string value for MySQL
   * @param value - The string value to escape
   * @returns Escaped string with single quotes
   */
  escapeString: (value: string): string => {
    return `'${value.replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
  },

  /**
   * Generate ON DUPLICATE KEY UPDATE clause for INSERT
   * @param updates - Column-value pairs for updates
   * @returns ON DUPLICATE KEY UPDATE clause
   */
  onDuplicateKeyUpdate: (updates: Record<string, string>): string => {
    const pairs = Object.entries(updates).map(
      ([col, val]) => `\`${col}\` = ${val}`
    );
    return `ON DUPLICATE KEY UPDATE ${pairs.join(', ')}`;
  },

  /**
   * Generate LIMIT with OFFSET clause (MySQL style)
   * @param limit - Maximum rows to return
   * @param offset - Number of rows to skip
   * @returns LIMIT clause
   */
  limitOffset: (limit: number, offset?: number): string => {
    if (offset !== undefined && offset > 0) {
      return `LIMIT ${offset}, ${limit}`;
    }
    return `LIMIT ${limit}`;
  },
};

export default mysql;
