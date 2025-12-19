/**
 * sqwind Type Safety Layer
 *
 * Provides compile-time type checking and inference for SQL queries
 *
 * @example
 * ```typescript
 * import { defineSchema } from 'sqwind/types';
 *
 * const db = defineSchema({
 *   users: {
 *     id: 'number',
 *     name: 'string',
 *     email: 'string',
 *     age: 'number',
 *   },
 *   orders: {
 *     id: 'number',
 *     user_id: 'number',
 *     total: 'number',
 *     status: 'string',
 *   },
 * });
 *
 * // Type-safe template queries
 * const query1 = db.sqw`from:users sel:name,email`;
 *
 * // Type-safe builder API
 * const query2 = db.users
 *   .sel('name', 'email')
 *   .whr('age', '>', 18)
 *   .ord('name', 'asc')
 *   .toQuery();
 * ```
 *
 * @module types
 */

// Schema definition types and utilities
export type {
  ColumnType,
  TableSchema,
  DatabaseSchema,
  Query,
  TypedDatabase,
} from './schema';

export { defineSchema } from './schema';

// Type inference utilities
export type {
  MapColumnType,
  ColumnNames,
  SchemaToType,
  PickColumns,
  InferResult,
  TypedQueryBuilder,
  WhereOperator,
  IsValidColumn,
  ExtractColumnNames,
  GetColumnType,
  PartialSchema,
  RequiredSchema,
  ColumnTypeUnion,
  FilterByType,
  StringColumns,
  NumberColumns,
  BooleanColumns,
  DateColumns,
  JsonColumns,
  JoinResult,
  LeftJoinResult,
  ColumnSelector,
  InsertType,
  UpdateType,
  ValidateQuery,
  AggregateBuilder,
  GroupByBuilder,
  TableNames,
  GetTableSchema,
  IsValidQuery,
  ValidatedQuery,
} from './inference';
