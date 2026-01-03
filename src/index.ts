/**
 * genAQL - SQL for Gen Alpha
 *
 * A query language that compiles to SQL.
 *
 * @example
 * ```typescript
 * import { cook, sq, defineSchema } from 'genaql';
 *
 * // Template literal API (primary) - cook for Gen Alpha, sqw for standard syntax
 * const query = cook`from:users sel:name,email whr:age>18 ord:name lim:10`;
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
 * db.cook`from:users sel:name,email`; // Type-checked!
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
export { sqw, sqw as cook } from './builder/template';
export { sq, QueryBuilder, createQueryBuilder } from './builder/chain';
export { Query } from './builder/query';

// Type safety exports
export { defineSchema } from './types/schema';
export type * from './types/inference';

// Relations exports
export {
  hasOne,
  hasMany,
  belongsTo,
  manyToMany,
  // Gen Alpha aliases
  got,
  stacked,
  simps,
  linked,
  RelationLoader,
  parseIncludes,
} from './relations';
export type {
  Relation,
  RelationType,
  HasOneRelation,
  HasManyRelation,
  BelongsToRelation,
  ManyToManyRelation,
  TableRelations,
  SchemaRelations,
  EagerLoadOptions,
  EagerLoadRequest,
} from './relations';

// Database execution layer exports
export { createClient, Client } from './db/client';
export {
  PostgresAdapter,
  createPostgresAdapter,
  MySQLAdapter,
  createMySQLAdapter,
  SQLiteAdapter,
  createSQLiteAdapter,
} from './db/adapters';
export {
  DatabaseError,
  ConnectionError,
  TransactionError,
} from './db/adapter';
export type {
  QueryResult,
  ConnectionConfig,
  DatabaseAdapter,
  Transaction,
  CreateConnectionOptions,
} from './db/types';

// Migration system exports
export {
  createMigration,
  defineMigration,
  createMigrationRunner,
  MigrationRunner,
  MigrationBuilder,
  TableBuilder,
  ColumnBuilder,
  generateSQL,
  generateMigrationSQL,
  // Gen Alpha aliases
  glow,
  evolve,
} from './migrations';
export type {
  ColumnType,
  ColumnDefinition,
  IndexDefinition,
  TableDefinition,
  MigrationOperation,
  Migration,
  MigrationRecord,
  MigrationRunnerOptions,
  MigrationStatus,
  MigrationResult,
} from './migrations';
