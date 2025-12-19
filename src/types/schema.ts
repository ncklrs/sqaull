/**
 * Schema definition utilities for sqwind
 * Provides compile-time type safety for SQL queries
 */

import type { TypedQueryBuilder } from './inference';

/**
 * Supported column types in schema definitions
 */
export type ColumnType = 'string' | 'number' | 'boolean' | 'date' | 'json';

/**
 * Schema definition for a single table
 */
export type TableSchema = Record<string, ColumnType>;

/**
 * Schema definition for an entire database
 */
export type DatabaseSchema = Record<string, TableSchema>;

/**
 * Query result object (runtime)
 */
export interface Query {
  sql: string;
  params: unknown[];
}

/**
 * Fluent builder root for type-safe queries
 */
export interface TypedSchemaBuilder<T extends DatabaseSchema> {
  from<K extends keyof T & string>(table: K): TypedQueryBuilder<T[K]>;
}

/**
 * Typed database interface with schema validation
 */
export type TypedDatabase<T extends DatabaseSchema> = {
  /**
   * Tagged template for type-safe SQL queries
   * Validates column names and table names against schema
   */
  sqw(strings: TemplateStringsArray, ...values: unknown[]): Query;

  /**
   * Fluent query builder (type-safe)
   * Use db.sq.from('table') to start building queries
   */
  readonly sq: TypedSchemaBuilder<T>;

  /**
   * Schema definition (for runtime access)
   */
  readonly schema: T;
} & {
  /**
   * Table accessors that return typed query builders
   * Each table name becomes a property that returns a typed builder
   */
  readonly [K in keyof T]: TypedQueryBuilder<T[K]>;
};

/**
 * Internal implementation of TypedDatabase
 */
class TypedDatabaseImpl<T extends DatabaseSchema> {
  readonly schema: T;
  readonly sq: TypedSchemaBuilder<T>;
  private tableBuilders: Map<string, any>;

  constructor(schema: T) {
    this.schema = schema;
    this.tableBuilders = new Map();

    // Create the sq fluent builder
    this.sq = {
      from: <K extends keyof T & string>(table: K) => {
        return this.getTableBuilder(table);
      },
    };

    // Create table accessor properties
    for (const tableName of Object.keys(schema)) {
      Object.defineProperty(this, tableName, {
        get: () => this.getTableBuilder(tableName),
        enumerable: true,
        configurable: false,
      });
    }
  }

  /**
   * Tagged template implementation
   * Parses and validates the query string
   */
  sqw(strings: TemplateStringsArray, ...values: unknown[]): Query {
    // Reconstruct the full query string
    let query = strings[0];
    for (let i = 0; i < values.length; i++) {
      query += `$${i + 1}${strings[i + 1]}`;
    }

    // Runtime validation of table and column names
    this.validateQuery(query);

    return {
      sql: this.compileQuery(query),
      params: values,
    };
  }

  /**
   * Get or create a typed query builder for a table
   */
  private getTableBuilder(tableName: string): any {
    if (!this.tableBuilders.has(tableName)) {
      const tableSchema = this.schema[tableName];
      if (!tableSchema) {
        throw new Error(`Table '${tableName}' not found in schema`);
      }
      this.tableBuilders.set(
        tableName,
        new TypedQueryBuilderImpl(tableName, tableSchema)
      );
    }
    return this.tableBuilders.get(tableName)!;
  }

  /**
   * Validate query against schema (runtime)
   */
  private validateQuery(query: string): void {
    // Aggregate function prefixes to skip during column validation
    const aggregatePrefixes = ['sum:', 'cnt:', 'avg:', 'min:', 'max:'];

    // Extract table names from from: clauses
    const fromMatches = Array.from(query.matchAll(/from:(\w+)/g));
    for (const match of fromMatches) {
      const tableName = match[1];
      if (!this.schema[tableName]) {
        throw new Error(`Table '${tableName}' not found in schema`);
      }
    }

    // Extract column names from sel: clauses
    const selMatches = Array.from(query.matchAll(/sel:([\w.:,*]+)/g));
    for (const match of selMatches) {
      const columnsStr = match[1];
      // Skip wildcard
      if (columnsStr === '*') continue;

      const columns = columnsStr.split(',');
      const fromMatch = query.match(/from:(\w+)/);
      if (fromMatch) {
        const tableName = fromMatch[1];
        const tableSchema = this.schema[tableName];

        for (let col of columns) {
          // Skip aggregate functions (sum:col, cnt:*, etc.)
          const isAggregate = aggregatePrefixes.some(p => col.startsWith(p));
          if (isAggregate) {
            // Extract the actual column from aggregate
            const colonIdx = col.indexOf(':');
            col = col.slice(colonIdx + 1);
            // Skip wildcard aggregates like cnt:*
            if (col === '*') continue;
          }

          // Handle table.column format (users.name, orders.total)
          if (col.includes('.')) {
            const [tablePrefix, colName] = col.split('.');
            const targetSchema = this.schema[tablePrefix];
            if (targetSchema && !targetSchema[colName]) {
              throw new Error(
                `Column '${colName}' not found in table '${tablePrefix}'`
              );
            }
            // If table doesn't exist, validation will happen at query compile time
            continue;
          }

          // Simple column - validate against current table
          if (!tableSchema[col]) {
            throw new Error(
              `Column '${col}' not found in table '${tableName}'`
            );
          }
        }
      }
    }
  }

  /**
   * Compile sqwind query to SQL (simplified)
   */
  private compileQuery(query: string): string {
    // Simple compilation - in production this would use the full compiler
    let sql = '';

    // Parse from clause
    const fromMatch = query.match(/from:(\w+)/);
    if (fromMatch) {
      sql += `SELECT `;

      // Parse select clause
      const selMatch = query.match(/sel:([\w,]+)/);
      if (selMatch) {
        sql += selMatch[1].replace(',', ', ');
      } else {
        sql += '*';
      }

      sql += ` FROM ${fromMatch[1]}`;

      // Parse where clause
      const whrMatch = query.match(/whr:([\w.]+):([^:\s]+)/);
      if (whrMatch) {
        sql += ` WHERE ${whrMatch[1]} ${whrMatch[2]}`;
      }
    }

    return sql;
  }
}

/**
 * Internal implementation of TypedQueryBuilder
 */
class TypedQueryBuilderImpl<T extends TableSchema> {
  private tableName: string;
  private tableSchema: T;
  private selectedColumns: (keyof T)[];
  private whereConditions: string[];
  private orderByColumns: string[];
  private joinClauses: string[];
  private limitValue?: number;
  private offsetValue?: number;

  constructor(tableName: string, tableSchema: T) {
    this.tableName = tableName;
    this.tableSchema = tableSchema;
    this.selectedColumns = [];
    this.whereConditions = [];
    this.orderByColumns = [];
    this.joinClauses = [];
  }

  sel<K extends keyof T>(...columns: K[]): TypedQueryBuilder<Pick<T, K>> {
    // Validate columns at runtime
    for (const col of columns) {
      if (!this.tableSchema[col as string]) {
        throw new Error(
          `Column '${String(col)}' not found in table '${this.tableName}'`
        );
      }
    }

    const newBuilder = new TypedQueryBuilderImpl(
      this.tableName,
      this.tableSchema
    );
    newBuilder.selectedColumns = columns as (keyof T)[];
    newBuilder.whereConditions = [...this.whereConditions];
    newBuilder.orderByColumns = [...this.orderByColumns];
    newBuilder.joinClauses = [...this.joinClauses];
    newBuilder.limitValue = this.limitValue;
    newBuilder.offsetValue = this.offsetValue;

    return newBuilder as unknown as TypedQueryBuilder<Pick<T, K>>;
  }

  whr<K extends keyof T>(
    column: K,
    op: string,
    value: unknown
  ): TypedQueryBuilder<T> {
    if (!this.tableSchema[column as string]) {
      throw new Error(
        `Column '${String(column)}' not found in table '${this.tableName}'`
      );
    }

    const newBuilder = new TypedQueryBuilderImpl(
      this.tableName,
      this.tableSchema
    );
    newBuilder.selectedColumns = [...this.selectedColumns];
    newBuilder.whereConditions = [
      ...this.whereConditions,
      `${String(column)} ${op} ${this.formatValue(value)}`,
    ];
    newBuilder.orderByColumns = [...this.orderByColumns];
    newBuilder.joinClauses = [...this.joinClauses];
    newBuilder.limitValue = this.limitValue;
    newBuilder.offsetValue = this.offsetValue;

    return newBuilder;
  }

  ord<K extends keyof T>(
    column: K,
    direction?: 'asc' | 'desc'
  ): TypedQueryBuilder<T> {
    if (!this.tableSchema[column as string]) {
      throw new Error(
        `Column '${String(column)}' not found in table '${this.tableName}'`
      );
    }

    const newBuilder = new TypedQueryBuilderImpl(
      this.tableName,
      this.tableSchema
    );
    newBuilder.selectedColumns = [...this.selectedColumns];
    newBuilder.whereConditions = [...this.whereConditions];
    newBuilder.orderByColumns = [
      ...this.orderByColumns,
      `${String(column)} ${direction?.toUpperCase() || 'ASC'}`,
    ];
    newBuilder.joinClauses = [...this.joinClauses];
    newBuilder.limitValue = this.limitValue;
    newBuilder.offsetValue = this.offsetValue;

    return newBuilder;
  }

  lim(limit: number): TypedQueryBuilder<T> {
    const newBuilder = new TypedQueryBuilderImpl(
      this.tableName,
      this.tableSchema
    );
    newBuilder.selectedColumns = [...this.selectedColumns];
    newBuilder.whereConditions = [...this.whereConditions];
    newBuilder.orderByColumns = [...this.orderByColumns];
    newBuilder.joinClauses = [...this.joinClauses];
    newBuilder.limitValue = limit;
    newBuilder.offsetValue = this.offsetValue;

    return newBuilder;
  }

  off(offset: number): TypedQueryBuilder<T> {
    const newBuilder = new TypedQueryBuilderImpl(
      this.tableName,
      this.tableSchema
    );
    newBuilder.selectedColumns = [...this.selectedColumns];
    newBuilder.whereConditions = [...this.whereConditions];
    newBuilder.orderByColumns = [...this.orderByColumns];
    newBuilder.joinClauses = [...this.joinClauses];
    newBuilder.limitValue = this.limitValue;
    newBuilder.offsetValue = offset;

    return newBuilder;
  }

  join(table: string, leftColumn: string, rightColumn: string): TypedQueryBuilder<T> {
    const newBuilder = new TypedQueryBuilderImpl(
      this.tableName,
      this.tableSchema
    );
    newBuilder.selectedColumns = [...this.selectedColumns];
    newBuilder.whereConditions = [...this.whereConditions];
    newBuilder.orderByColumns = [...this.orderByColumns];
    newBuilder.joinClauses = [
      ...this.joinClauses,
      `JOIN ${table} ON ${leftColumn} = ${rightColumn}`,
    ];
    newBuilder.limitValue = this.limitValue;
    newBuilder.offsetValue = this.offsetValue;

    return newBuilder;
  }

  toQuery(): Query {
    let sql = 'SELECT ';

    if (this.selectedColumns.length > 0) {
      sql += this.selectedColumns.map((c) => String(c)).join(', ');
    } else {
      sql += '*';
    }

    sql += ` FROM ${this.tableName}`;

    if (this.joinClauses.length > 0) {
      sql += ' ' + this.joinClauses.join(' ');
    }

    if (this.whereConditions.length > 0) {
      sql += ` WHERE ${this.whereConditions.join(' AND ')}`;
    }

    if (this.orderByColumns.length > 0) {
      sql += ` ORDER BY ${this.orderByColumns.join(', ')}`;
    }

    if (this.limitValue !== undefined) {
      sql += ` LIMIT ${this.limitValue}`;
    }

    if (this.offsetValue !== undefined) {
      sql += ` OFFSET ${this.offsetValue}`;
    }

    return {
      sql,
      params: [],
    };
  }

  private formatValue(value: unknown): string {
    if (typeof value === 'string') {
      return `'${value.replace(/'/g, "''")}'`;
    }
    if (value === null) {
      return 'NULL';
    }
    if (value instanceof Date) {
      return `'${value.toISOString()}'`;
    }
    return String(value);
  }
}

/**
 * Define a database schema and get a typed database instance
 *
 * @example
 * ```typescript
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
 * // Type-safe queries
 * db.sqw`from:users sel:name,email`     // ✅ Valid
 * db.sqw`from:users sel:foo`            // ❌ Runtime error
 *
 * // Type-safe builder
 * db.users.sel('name', 'email').whr('age', '>', 18)  // ✅
 * ```
 */
export function defineSchema<T extends DatabaseSchema>(
  schema: T
): TypedDatabase<T> {
  return new TypedDatabaseImpl(schema) as TypedDatabase<T>;
}
