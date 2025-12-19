/**
 * Fluent chain builder API for sqwind
 *
 * Provides a chainable query builder that constructs the same AST
 * as the template literal syntax.
 */

import type {
  QueryAST,
  SelectColumn,
  Condition,
  OrderBy,
  JoinClause,
} from '../parser/types';
import {
  OrderDirection,
  JoinType,
  Operator,
} from '../parser/types';
import { Query } from './query';
import type { CompilerOptions } from '../compiler/types';

/**
 * Fluent query builder for sqwind
 *
 * Provides a chainable API for building queries programmatically.
 * Each method returns the builder instance for chaining.
 *
 * @example
 * ```typescript
 * const query = sq
 *   .from('users')
 *   .sel('name', 'email')
 *   .whr('age', '>', 18)
 *   .ord('name', 'asc')
 *   .lim(10)
 *   .build();
 *
 * query.toSQL();
 * // "SELECT name, email FROM users WHERE age > 18 ORDER BY name ASC LIMIT 10"
 * ```
 */
export class QueryBuilder {
  private ast: QueryAST;
  private options: CompilerOptions;

  /**
   * Create a new QueryBuilder
   *
   * @param options - Compiler options for SQL generation
   */
  constructor(options?: CompilerOptions) {
    this.ast = {};
    this.options = options || {};
  }

  /**
   * Set the FROM clause (table to query)
   *
   * @param table - Table name
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * sq.from('users')
   * // FROM users
   * ```
   */
  from(table: string): this {
    if (!table || typeof table !== 'string') {
      throw new Error('Table name must be a non-empty string');
    }

    this.ast.from = { table };
    return this;
  }

  /**
   * Set the SELECT clause (columns to retrieve)
   *
   * @param columns - Column names or '*' for all columns
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * sq.sel('name', 'email')        // SELECT name, email
   * sq.sel('*')                     // SELECT *
   * sq.sel('count(*)')              // SELECT count(*)
   * ```
   */
  sel(...columns: string[]): this {
    if (columns.length === 0) {
      throw new Error('At least one column must be specified');
    }

    const selectColumns: SelectColumn[] = columns.map((col) => {
      if (col === '*') {
        return { type: 'wildcard' };
      }
      // TODO: Parse aggregate functions, aliases, etc.
      // For now, treat everything as simple column names
      return { type: 'column', name: col };
    });

    this.ast.select = { columns: selectColumns };
    return this;
  }

  /**
   * Add a WHERE condition
   *
   * Can be called with (column, operator, value) or (condition string)
   *
   * @param columnOrCondition - Column name or raw condition
   * @param op - Comparison operator
   * @param value - Value to compare against
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * sq.whr('age', '>', 18)           // WHERE age > 18
   * sq.whr('name', '=', 'John')      // WHERE name = 'John'
   * sq.whr('status', '!=', 'deleted') // WHERE status != 'deleted'
   * ```
   */
  whr(column: string, op: string, value: unknown): this;
  whr(condition: string): this;
  whr(
    columnOrCondition: string,
    op?: string,
    value?: unknown
  ): this {
    let condition: Condition;

    if (op !== undefined && value !== undefined) {
      // Three-argument form: column, operator, value
      const operator = this.parseOperator(op);
      condition = {
        type: 'comparison',
        left: columnOrCondition,
        operator,
        right: value as string | number,
      };
    } else {
      // Single-argument form: raw condition string
      // TODO: Parse the condition string into a proper Condition object
      // For now, create a simple comparison from the string
      throw new Error('Raw condition strings not yet implemented. Use whr(column, op, value) form.');
    }

    // If there's already a WHERE clause, combine with AND
    if (this.ast.where) {
      const existingCondition = this.ast.where.condition;
      condition = {
        type: 'and',
        conditions: [existingCondition, condition],
      };
    }

    this.ast.where = { condition };
    return this;
  }

  /**
   * Add an OR condition to the WHERE clause
   *
   * @param column - Column name
   * @param op - Comparison operator
   * @param value - Value to compare against
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * sq.whr('age', '>', 18).or('status', '=', 'admin')
   * // WHERE age > 18 OR status = 'admin'
   * ```
   */
  or(column: string, op: string, value: unknown): this {
    const operator = this.parseOperator(op);
    const newCondition: Condition = {
      type: 'comparison',
      left: column,
      operator,
      right: value as string | number,
    };

    if (this.ast.where) {
      const existingCondition = this.ast.where.condition;
      this.ast.where.condition = {
        type: 'or',
        conditions: [existingCondition, newCondition],
      };
    } else {
      this.ast.where = { condition: newCondition };
    }

    return this;
  }

  /**
   * Add an ORDER BY clause
   *
   * @param column - Column to order by
   * @param dir - Sort direction ('asc' or 'desc'), defaults to 'asc'
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * sq.ord('name')              // ORDER BY name ASC
   * sq.ord('created_at', 'desc') // ORDER BY created_at DESC
   * sq.ord('age', 'asc').ord('name', 'desc')
   * // ORDER BY age ASC, name DESC
   * ```
   */
  ord(column: string, dir: 'asc' | 'desc' = 'asc'): this {
    const direction: OrderDirection =
      dir === 'desc' ? OrderDirection.DESC : OrderDirection.ASC;

    const orderBy: OrderBy = {
      column,
      direction,
    };

    if (!this.ast.orderBy) {
      this.ast.orderBy = { orders: [] };
    }

    this.ast.orderBy.orders.push(orderBy);
    return this;
  }

  /**
   * Set LIMIT clause
   *
   * @param n - Maximum number of rows to return
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * sq.lim(10)  // LIMIT 10
   * ```
   */
  lim(n: number): this {
    if (!Number.isInteger(n) || n < 0) {
      throw new Error(`Invalid limit value: ${n}. Must be a non-negative integer.`);
    }

    this.ast.limit = { limit: n };
    return this;
  }

  /**
   * Set OFFSET clause
   *
   * @param n - Number of rows to skip
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * sq.off(20)  // OFFSET 20
   * ```
   */
  off(n: number): this {
    if (!Number.isInteger(n) || n < 0) {
      throw new Error(`Invalid offset value: ${n}. Must be a non-negative integer.`);
    }

    this.ast.offset = { offset: n };
    return this;
  }

  /**
   * Add GROUP BY clause
   *
   * @param columns - Columns to group by
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * sq.grp('department')              // GROUP BY department
   * sq.grp('department', 'location')  // GROUP BY department, location
   * ```
   */
  grp(...columns: string[]): this {
    if (columns.length === 0) {
      throw new Error('At least one column must be specified for GROUP BY');
    }

    this.ast.groupBy = { columns };
    return this;
  }

  /**
   * Add HAVING clause (for filtering grouped results)
   *
   * @param column - Column name (usually an aggregate)
   * @param op - Comparison operator
   * @param value - Value to compare against
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * sq.grp('department').hav('count(*)', '>', 5)
   * // GROUP BY department HAVING count(*) > 5
   * ```
   */
  hav(column: string, op: string, value: unknown): this {
    const operator = this.parseOperator(op);
    const condition: Condition = {
      type: 'comparison',
      left: column,
      operator,
      right: value as string | number,
    };

    // If there's already a HAVING clause, combine with AND
    if (this.ast.having) {
      const existingCondition = this.ast.having.condition;
      this.ast.having.condition = {
        type: 'and',
        conditions: [existingCondition, condition],
      };
    } else {
      this.ast.having = { condition };
    }

    return this;
  }

  /**
   * Add a JOIN clause
   *
   * @param table - Table to join
   * @param type - Join type ('inner', 'left', 'right', 'full'), defaults to 'inner'
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * sq.join('orders', 'left').on('users.id = orders.user_id')
   * // LEFT JOIN orders ON users.id = orders.user_id
   * ```
   */
  join(table: string, type: 'inner' | 'left' | 'right' | 'full' = 'inner'): this {
    const joinType = this.parseJoinType(type);

    const join: JoinClause = {
      type: joinType,
      table,
    };

    if (!this.ast.joins) {
      this.ast.joins = [];
    }

    this.ast.joins.push(join);
    return this;
  }

  /**
   * Set the ON condition for the most recent JOIN
   *
   * @param condition - Join condition (e.g., 'users.id = orders.user_id')
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * sq.join('orders').on('users.id = orders.user_id')
   * ```
   */
  on(condition: string): this {
    if (!this.ast.joins || this.ast.joins.length === 0) {
      throw new Error('Cannot add ON clause without a preceding JOIN');
    }

    // Parse the condition string into a Condition object
    // For now, create a simple comparison from the string
    // TODO: Implement proper condition parsing
    const parsedCondition = this.parseJoinCondition(condition);

    // Set the condition on the most recent join
    this.ast.joins[this.ast.joins.length - 1].on = parsedCondition;
    return this;
  }

  /**
   * Build and return the final Query object
   *
   * @returns Query instance wrapping the constructed AST
   *
   * @example
   * ```typescript
   * const query = sq.from('users').sel('name').build();
   * query.toSQL(); // "SELECT name FROM users"
   * ```
   */
  build(): Query {
    return new Query(this.ast, this.options);
  }

  /**
   * Convert directly to SQL string (shorthand for build().toSQL())
   *
   * @returns SQL string
   */
  toSQL(): string {
    return this.build().toSQL();
  }

  /**
   * Convert directly to parameterized query (shorthand for build().toParams())
   *
   * @returns Object with sql string and params array
   */
  toParams(): { sql: string; params: unknown[] } {
    return this.build().toParams();
  }

  /**
   * Clone this builder with new compiler options
   *
   * @param options - Compiler options to merge
   * @returns New QueryBuilder with updated options
   */
  withOptions(options: CompilerOptions): QueryBuilder {
    const newBuilder = new QueryBuilder({ ...this.options, ...options });
    newBuilder.ast = JSON.parse(JSON.stringify(this.ast));
    return newBuilder;
  }

  // Helper methods

  /**
   * Parse operator string into Operator enum
   */
  private parseOperator(op: string): Operator {
    switch (op) {
      case '>':
        return Operator.GT;
      case '<':
        return Operator.LT;
      case '>=':
        return Operator.GTE;
      case '<=':
        return Operator.LTE;
      case '=':
      case '==':
        return Operator.EQ;
      case '!=':
      case '<>':
        return Operator.NEQ;
      case '~':
      case 'LIKE':
      case 'like':
        return Operator.LIKE;
      default:
        throw new Error(`Unsupported operator: ${op}`);
    }
  }

  /**
   * Parse join type string into JoinType enum
   */
  private parseJoinType(type: string): JoinType {
    switch (type.toLowerCase()) {
      case 'inner':
        return JoinType.INNER;
      case 'left':
        return JoinType.LEFT;
      case 'right':
        return JoinType.RIGHT;
      case 'full':
        return JoinType.FULL;
      default:
        throw new Error(`Unsupported join type: ${type}`);
    }
  }

  /**
   * Parse a join condition string into a Condition object
   *
   * TODO: Implement proper parsing for complex conditions
   * For now, handles simple equality: "table1.col = table2.col"
   */
  private parseJoinCondition(condition: string): Condition {
    // Simple parser for "left = right" format
    const match = condition.match(/^\s*([^\s=]+)\s*=\s*([^\s=]+)\s*$/);
    if (match) {
      return {
        type: 'comparison',
        left: match[1].trim(),
        operator: Operator.EQ,
        right: match[2].trim(),
      };
    }

    throw new Error(`Cannot parse join condition: ${condition}. Use format "table1.col = table2.col"`);
  }
}

/**
 * Entry point for fluent query building
 *
 * @example
 * ```typescript
 * import { sq } from 'sqwind';
 *
 * const query = sq
 *   .from('users')
 *   .sel('name', 'email')
 *   .whr('age', '>', 18)
 *   .build();
 * ```
 */
export const sq = new QueryBuilder();

/**
 * Create a custom query builder with compiler options
 *
 * @param options - Compiler options
 * @returns New QueryBuilder instance
 *
 * @example
 * ```typescript
 * import { createQueryBuilder, Dialect } from 'sqwind';
 *
 * const sqPg = createQueryBuilder({ dialect: Dialect.POSTGRES });
 * const query = sqPg.from('users').sel('name').build();
 * ```
 */
export function createQueryBuilder(options?: CompilerOptions): QueryBuilder {
  return new QueryBuilder(options);
}
