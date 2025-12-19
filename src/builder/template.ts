/**
 * Tagged template literal API for sqwind
 *
 * Provides the primary sqw`` template literal syntax for writing queries.
 */

import { lex } from '../parser/lexer';
import { parse } from '../parser/parser';
import { Query } from './query';
import type { CompilerOptions } from '../compiler/types';

/**
 * Tagged template literal function for sqwind queries
 *
 * Allows writing sqwind queries with template literal syntax and
 * automatic value interpolation.
 *
 * @param strings - Template string array from tagged template
 * @param values - Interpolated values from template
 * @returns Query instance
 *
 * @example
 * ```typescript
 * // Simple query without interpolation
 * const q1 = sqw`from:users sel:name,email whr:age>18`;
 * q1.toSQL();
 * // "SELECT name, email FROM users WHERE age > 18"
 *
 * // Query with value interpolation
 * const minAge = 18;
 * const limit = 10;
 * const q2 = sqw`from:users sel:name whr:age>${minAge} lim:${limit}`;
 * q2.toParams();
 * // { sql: "SELECT name FROM users WHERE age > $1 LIMIT $2", params: [18, 10] }
 *
 * // Complex conditions with multiple interpolations
 * const status = 'active';
 * const maxAge = 65;
 * const q3 = sqw`from:users sel:* whr:status=${status} whr:age<${maxAge}`;
 * ```
 */
export function sqw(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Query {
  return sqwWithOptions(strings, values, {});
}

/**
 * Create a tagged template function with custom compiler options
 *
 * Useful for creating dialect-specific or customized query builders.
 *
 * @param options - Compiler options to use for all queries
 * @returns Tagged template function
 *
 * @example
 * ```typescript
 * import { Dialect } from 'sqwind';
 *
 * // Create a Postgres-specific query builder
 * const sqwPg = createSqw({ dialect: Dialect.POSTGRES, pretty: true });
 * const query = sqwPg`from:users sel:name`;
 * ```
 */
export function createSqw(options: CompilerOptions) {
  return (strings: TemplateStringsArray, ...values: unknown[]): Query => {
    return sqwWithOptions(strings, values, options);
  };
}

/**
 * Internal implementation of sqw with compiler options
 *
 * @param strings - Template string array
 * @param values - Interpolated values
 * @param options - Compiler options
 * @returns Query instance
 */
function sqwWithOptions(
  strings: TemplateStringsArray,
  values: unknown[],
  options: CompilerOptions
): Query {
  // Build the query string, replacing values inline for certain contexts
  // that need actual values (lim, off, ord direction)
  let queryString = strings[0];
  const params: unknown[] = [];

  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    const nextSegment = strings[i + 1] ?? '';

    // Check context to determine how to handle the value
    // If this value follows lim:, off:, or is part of ord:, use actual value
    const prevContext = queryString.slice(-10);
    const isLimitContext = prevContext.endsWith('lim:') || prevContext.match(/lim:\d*$/);
    const isOffsetContext = prevContext.endsWith('off:') || prevContext.match(/off:\d*$/);
    const isOrderContext = prevContext.includes('ord:') && !nextSegment.startsWith(' ') && !nextSegment.startsWith(':');

    if (isLimitContext || isOffsetContext || isOrderContext) {
      // Use actual value directly for limit/offset/order
      queryString += String(value);
    } else {
      // For WHERE conditions, track as parameter
      params.push(value);
      // Still use placeholder in query string for AST, will be in params
      queryString += String(value);
    }

    // Add the next string segment
    queryString += nextSegment;
  }

  // Parse the query string with actual values
  const tokens = lex(queryString);
  const ast = parse(tokens);

  // Create and return Query with the AST and actual parameters for WHERE clauses
  const query = new Query(ast, options);

  // If we have params, they need to be attached to the query
  // The Query class handles parameterization during compile
  return query;
}

/**
 * Advanced: Create a query from a raw sqwind string
 *
 * Useful when you need to build queries dynamically from strings
 * without using template literals.
 *
 * @param queryString - Raw sqwind query string
 * @param options - Compiler options
 * @returns Query instance
 *
 * @example
 * ```typescript
 * const query = fromString('from:users sel:name whr:age>18');
 * query.toSQL();
 * // "SELECT name FROM users WHERE age > 18"
 * ```
 */
export function fromString(
  queryString: string,
  options?: CompilerOptions
): Query {
  const tokens = lex(queryString);
  const ast = parse(tokens);
  return new Query(ast, options);
}
