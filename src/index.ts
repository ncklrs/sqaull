/**
 * sqwind - A Tailwind-inspired query language for SQL
 *
 * @example
 * ```typescript
 * import { sqw, sq, defineSchema } from 'sqwind';
 *
 * // Template literal API (primary)
 * const query = sqw`from:users sel:name,email whr:age>18 ord:name lim:10`;
 * query.toSQL();    // "SELECT name, email FROM users WHERE age > 18 ORDER BY name LIMIT 10"
 * query.toParams(); // { sql: "SELECT ... WHERE age > $1 ...", params: [18] }
 *
 * // Fluent builder API
 * const query2 = sq
 *   .from('users')
 *   .sel('name', 'email')
 *   .whr('age', '>', 18)
 *   .ord('name')
 *   .lim(10);
 *
 * // Type-safe with schema
 * const db = defineSchema({
 *   users: { id: 'number', name: 'string', email: 'string', age: 'number' },
 *   orders: { id: 'number', user_id: 'number', total: 'number' },
 * });
 *
 * db.sqw`from:users sel:name,email`; // Type-checked!
 * ```
 */

// Parser exports
export { lex, type Token, type TokenType } from './parser/lexer';
export { parse, type QueryAST } from './parser/parser';
export * from './parser/types';

// Compiler exports
export { compile, type CompiledQuery } from './compiler/sql';
export { Dialect, type CompilerOptions } from './compiler/types';
export * from './compiler/dialects';

// Builder exports
export { sqw } from './builder/template';
export { sq, QueryBuilder } from './builder/chain';
export { Query } from './builder/query';

// Type safety exports
export { defineSchema } from './types/schema';
export type * from './types/inference';
