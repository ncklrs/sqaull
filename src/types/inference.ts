/**
 * Type inference utilities for sqwind
 * Advanced TypeScript types for compile-time validation and result type inference
 */

import type { ColumnType, TableSchema, DatabaseSchema, Query } from './schema';

/**
 * Map column types to TypeScript types
 */
export type MapColumnType<T extends ColumnType> = T extends 'string'
  ? string
  : T extends 'number'
  ? number
  : T extends 'boolean'
  ? boolean
  : T extends 'date'
  ? Date
  : T extends 'json'
  ? unknown
  : never;

/**
 * Extract column names from a table schema
 */
export type ColumnNames<T extends TableSchema> = keyof T;

/**
 * Convert a table schema to a TypeScript object type
 */
export type SchemaToType<T extends TableSchema> = {
  [K in keyof T]: MapColumnType<T[K]>;
};

/**
 * Pick specific columns from a schema and convert to TypeScript types
 */
export type PickColumns<
  T extends TableSchema,
  K extends keyof T
> = SchemaToType<Pick<T, K>>;

/**
 * Parse column list from string literal (e.g., "name,email,age")
 */
type ParseColumnList<S extends string> = S extends `${infer First},${infer Rest}`
  ? First | ParseColumnList<Rest>
  : S;

/**
 * Extract table name from "from:tableName" clause
 */
type ExtractFromClause<S extends string> = S extends `${string}from:${infer Table}${string}`
  ? Table extends `${infer TableName} ${string}`
    ? TableName
    : Table extends `${infer TableName},${string}`
    ? TableName
    : Table extends `${infer TableName}:${string}`
    ? TableName
    : Table
  : never;

/**
 * Extract column list from "sel:col1,col2" clause
 */
type ExtractSelectClause<S extends string> = S extends `${string}sel:${infer Cols}${string}`
  ? Cols extends `${infer ColList} ${string}`
    ? ParseColumnList<ColList>
    : Cols extends `${infer ColList}:${string}`
    ? ParseColumnList<ColList>
    : ParseColumnList<Cols>
  : never;

/**
 * Validate that columns exist in schema
 */
type ValidateColumns<
  T extends TableSchema,
  Cols extends string
> = Cols extends keyof T ? Cols : never;

/**
 * Infer result type from query string
 *
 * @example
 * ```typescript
 * type Result = InferResult<
 *   { users: { id: 'number', name: 'string', email: 'string' } },
 *   'from:users sel:name,email'
 * >;
 * // Result = { name: string; email: string }[]
 * ```
 */
export type InferResult<
  T extends DatabaseSchema,
  Q extends string
> = ExtractFromClause<Q> extends keyof T
  ? ExtractSelectClause<Q> extends never
    ? SchemaToType<T[ExtractFromClause<Q>]>[]
    : ValidateColumns<
        T[ExtractFromClause<Q>],
        ExtractSelectClause<Q>
      > extends never
    ? never // Invalid columns - type error
    : PickColumns<
        T[ExtractFromClause<Q>],
        ValidateColumns<T[ExtractFromClause<Q>], ExtractSelectClause<Q>>
      >[]
  : never; // Invalid table - type error

/**
 * Typed query builder interface
 * Provides compile-time validation for all query operations
 */
export interface TypedQueryBuilder<T extends TableSchema> {
  /**
   * Select specific columns
   * Only allows columns that exist in the schema
   * Returns a narrowed builder with only selected columns
   */
  sel<K extends keyof T>(...columns: K[]): TypedQueryBuilder<Pick<T, K>>;

  /**
   * Add WHERE condition
   * Validates column exists and value type matches
   */
  whr<K extends keyof T>(
    column: K,
    op: WhereOperator,
    value: MapColumnType<T[K]>
  ): TypedQueryBuilder<T>;

  /**
   * Add ORDER BY clause
   * Validates column exists in schema
   */
  ord<K extends keyof T>(
    column: K,
    direction?: 'asc' | 'desc'
  ): TypedQueryBuilder<T>;

  /**
   * Add LIMIT clause
   */
  lim(limit: number): TypedQueryBuilder<T>;

  /**
   * Add OFFSET clause
   */
  off(offset: number): TypedQueryBuilder<T>;

  /**
   * Add JOIN clause
   * @param table - Table to join
   * @param leftColumn - Column from current table (e.g., 'users.id')
   * @param rightColumn - Column from joined table (e.g., 'orders.user_id')
   */
  join(table: string, leftColumn: string, rightColumn: string): TypedQueryBuilder<T>;

  /**
   * Convert to executable query
   */
  toQuery(): Query;
}

/**
 * Supported WHERE operators
 */
export type WhereOperator =
  | '='
  | '!='
  | '<>'
  | '>'
  | '>='
  | '<'
  | '<='
  | 'LIKE'
  | 'NOT LIKE'
  | 'IN'
  | 'NOT IN'
  | 'IS NULL'
  | 'IS NOT NULL';

/**
 * Type guard to check if a string is a valid column name
 */
export type IsValidColumn<
  T extends TableSchema,
  K extends string
> = K extends keyof T ? K : never;

/**
 * Extract all column names as a union type
 */
export type ExtractColumnNames<T extends TableSchema> = keyof T;

/**
 * Get the TypeScript type for a specific column
 */
export type GetColumnType<
  T extends TableSchema,
  K extends keyof T
> = MapColumnType<T[K]>;

/**
 * Create a partial schema (all columns optional)
 */
export type PartialSchema<T extends TableSchema> = {
  [K in keyof T]?: MapColumnType<T[K]>;
};

/**
 * Create a required schema (all columns required)
 */
export type RequiredSchema<T extends TableSchema> = {
  [K in keyof T]-?: MapColumnType<T[K]>;
};

/**
 * Union of all possible column types in a schema
 */
export type ColumnTypeUnion<T extends TableSchema> = {
  [K in keyof T]: MapColumnType<T[K]>;
}[keyof T];

/**
 * Filter schema to only include columns of a specific type
 */
export type FilterByType<
  T extends TableSchema,
  Type extends ColumnType
> = {
  [K in keyof T as T[K] extends Type ? K : never]: T[K];
};

/**
 * Get all string columns from a schema
 */
export type StringColumns<T extends TableSchema> = keyof FilterByType<
  T,
  'string'
>;

/**
 * Get all number columns from a schema
 */
export type NumberColumns<T extends TableSchema> = keyof FilterByType<
  T,
  'number'
>;

/**
 * Get all boolean columns from a schema
 */
export type BooleanColumns<T extends TableSchema> = keyof FilterByType<
  T,
  'boolean'
>;

/**
 * Get all date columns from a schema
 */
export type DateColumns<T extends TableSchema> = keyof FilterByType<T, 'date'>;

/**
 * Get all JSON columns from a schema
 */
export type JsonColumns<T extends TableSchema> = keyof FilterByType<T, 'json'>;

/**
 * Infer join result type
 */
export type JoinResult<
  T1 extends TableSchema,
  T2 extends TableSchema
> = SchemaToType<T1> & SchemaToType<T2>;

/**
 * Infer left join result type (second table columns are optional)
 */
export type LeftJoinResult<
  T1 extends TableSchema,
  T2 extends TableSchema
> = SchemaToType<T1> & Partial<SchemaToType<T2>>;

/**
 * Type-safe column selector
 * Ensures only valid columns can be selected
 */
export type ColumnSelector<T extends TableSchema> = {
  [K in keyof T]: K;
}[keyof T];

/**
 * Create an insert type (all columns except auto-increment)
 */
export type InsertType<
  T extends TableSchema,
  AutoColumns extends keyof T = never
> = Omit<RequiredSchema<T>, AutoColumns>;

/**
 * Create an update type (all columns optional except primary key)
 */
export type UpdateType<
  T extends TableSchema,
  KeyColumn extends keyof T = never
> = Partial<Omit<SchemaToType<T>, KeyColumn>> & Pick<SchemaToType<T>, KeyColumn>;

/**
 * Validate query at compile time
 * Returns the query string if valid, never if invalid
 */
export type ValidateQuery<
  T extends DatabaseSchema,
  Q extends string
> = ExtractFromClause<Q> extends keyof T
  ? ExtractSelectClause<Q> extends never
    ? Q // Valid - no select clause (SELECT *)
    : ValidateColumns<
        T[ExtractFromClause<Q>],
        ExtractSelectClause<Q>
      > extends never
    ? never // Invalid columns
    : Q // Valid
  : never; // Invalid table

/**
 * Type-safe aggregation functions
 */
export interface AggregateBuilder<T extends TableSchema> {
  count(column?: keyof T): AggregateBuilder<T>;
  sum<K extends NumberColumns<T>>(column: K): AggregateBuilder<T>;
  avg<K extends NumberColumns<T>>(column: K): AggregateBuilder<T>;
  min<K extends keyof T>(column: K): AggregateBuilder<T>;
  max<K extends keyof T>(column: K): AggregateBuilder<T>;
}

/**
 * Type-safe GROUP BY builder
 */
export interface GroupByBuilder<T extends TableSchema> {
  groupBy<K extends keyof T>(...columns: K[]): AggregateBuilder<Pick<T, K>>;
}

/**
 * Utility type to extract table names from database schema
 */
export type TableNames<T extends DatabaseSchema> = keyof T;

/**
 * Utility type to get a table schema by name
 */
export type GetTableSchema<
  T extends DatabaseSchema,
  TableName extends keyof T
> = T[TableName];

/**
 * Check if a query string is valid
 */
export type IsValidQuery<
  T extends DatabaseSchema,
  Q extends string
> = ValidateQuery<T, Q> extends never ? false : true;

/**
 * Branded type for validated queries
 */
export type ValidatedQuery<
  T extends DatabaseSchema,
  Q extends string
> = ValidateQuery<T, Q> extends never
  ? never
  : { __brand: 'ValidatedQuery'; query: Q; schema: T };
