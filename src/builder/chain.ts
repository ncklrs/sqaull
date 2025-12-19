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
  StatementType,
  AggregateType,
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
   * @param ast - Initial AST state (for cloning)
   */
  constructor(options?: CompilerOptions, ast?: QueryAST) {
    this.ast = ast || {};
    this.options = options || {};
  }

  /**
   * Clone the current builder with a new AST
   */
  private clone(): QueryBuilder {
    const newBuilder = new QueryBuilder(this.options, JSON.parse(JSON.stringify(this.ast)));
    return newBuilder;
  }

  /**
   * Set the FROM clause (table to query)
   *
   * @param table - Table name
   * @returns New builder instance for chaining
   *
   * @example
   * ```typescript
   * sq.from('users')
   * // FROM users
   * ```
   */
  from(table: string): QueryBuilder {
    if (!table || typeof table !== 'string') {
      throw new Error('Table name must be a non-empty string');
    }

    const newBuilder = this.clone();
    newBuilder.ast.from = { table };
    return newBuilder;
  }

  /**
   * Set the SELECT clause (columns to retrieve)
   *
   * @param columns - Column names or '*' for all columns (can be arrays or individual strings)
   * @returns New builder instance for chaining
   *
   * @example
   * ```typescript
   * sq.sel('name', 'email')        // SELECT name, email
   * sq.sel(['name', 'email', 'age']) // SELECT name, email, age
   * sq.sel('*')                     // SELECT *
   * sq.sel('sum:total')             // SELECT SUM(total)
   * sq.sel('sum:total/revenue')     // SELECT SUM(total) AS revenue
   * ```
   */
  sel(...columns: (string | string[])[]): QueryBuilder {
    // Flatten arrays
    const flatColumns: string[] = columns.flatMap(col =>
      Array.isArray(col) ? col : [col]
    );

    if (flatColumns.length === 0) {
      throw new Error('At least one column must be specified');
    }

    const selectColumns: SelectColumn[] = flatColumns.map((col) =>
      this.parseSelectColumn(col)
    );

    const newBuilder = this.clone();
    newBuilder.ast.select = { columns: selectColumns };
    return newBuilder;
  }

  /**
   * Parse a column string into a SelectColumn object
   */
  private parseSelectColumn(col: string): SelectColumn {
    if (col === '*') {
      return { type: 'wildcard' };
    }

    // Check for aggregate functions: sum:column, cnt:*, avg:column/alias
    const aggregateMatch = col.match(/^(sum|cnt|count|avg|min|max):(.+?)(?:\/(.+))?$/);
    if (aggregateMatch) {
      const [, funcName, column, alias] = aggregateMatch;
      const aggregateType = this.parseAggregateType(funcName);
      return {
        type: 'aggregate',
        function: aggregateType,
        column,
        ...(alias && { alias }),
      };
    }

    // Regular column
    return { type: 'column', name: col };
  }

  /**
   * Parse aggregate function name into AggregateType enum
   */
  private parseAggregateType(name: string): AggregateType {
    const upper = name.toUpperCase();
    switch (upper) {
      case 'SUM':
        return AggregateType.SUM;
      case 'CNT':
      case 'COUNT':
        return AggregateType.COUNT;
      case 'AVG':
        return AggregateType.AVG;
      case 'MIN':
        return AggregateType.MIN;
      case 'MAX':
        return AggregateType.MAX;
      default:
        throw new Error(`Unknown aggregate function: ${name}`);
    }
  }

  /**
   * Add a WHERE condition
   *
   * Can be called with (column, operator, value) or (column, value) for equality
   *
   * @param column - Column name
   * @param opOrValue - Comparison operator or value (if equality)
   * @param value - Value to compare against (optional if using two-arg form)
   * @returns New builder instance for chaining
   *
   * @example
   * ```typescript
   * sq.whr('age', '>', 18)           // WHERE age > 18
   * sq.whr('name', 'John')           // WHERE name = 'John'
   * sq.whr('status', '=', 'active')  // WHERE status = 'active'
   * sq.whr('status', '!=', 'deleted') // WHERE status != 'deleted'
   * ```
   */
  whr(column: string, op: string, value: unknown): QueryBuilder;
  whr(column: string, value: unknown): QueryBuilder;
  whr(
    column: string,
    opOrValue: string | unknown,
    value?: unknown
  ): QueryBuilder {
    let condition: Condition;

    if (value !== undefined) {
      // Three-argument form: column, operator, value
      const operator = this.parseOperator(opOrValue as string);
      condition = {
        type: 'comparison',
        left: column,
        operator,
        right: value as string | number | boolean,
      };
    } else if (opOrValue !== undefined) {
      // Two-argument form: column, value (equality)
      condition = {
        type: 'comparison',
        left: column,
        operator: Operator.EQ,
        right: opOrValue as string | number | boolean,
      };
    } else {
      throw new Error('whr() requires at least 2 arguments');
    }

    const newBuilder = this.clone();

    // If there's already a WHERE clause, combine with AND
    if (newBuilder.ast.where) {
      const existingCondition = newBuilder.ast.where.condition;
      condition = {
        type: 'and',
        conditions: [existingCondition, condition],
      };
    }

    newBuilder.ast.where = { condition };
    return newBuilder;
  }

  /**
   * Add an OR condition to the WHERE clause
   *
   * @param column - Column name
   * @param op - Comparison operator
   * @param value - Value to compare against
   * @returns New builder instance for chaining
   *
   * @example
   * ```typescript
   * sq.whr('age', '>', 18).or('status', '=', 'admin')
   * // WHERE age > 18 OR status = 'admin'
   * ```
   */
  or(column: string, op: string, value: unknown): QueryBuilder {
    const operator = this.parseOperator(op);
    const newCondition: Condition = {
      type: 'comparison',
      left: column,
      operator,
      right: value as string | number | boolean,
    };

    const newBuilder = this.clone();

    if (newBuilder.ast.where) {
      const existingCondition = newBuilder.ast.where.condition;
      newBuilder.ast.where.condition = {
        type: 'or',
        conditions: [existingCondition, newCondition],
      };
    } else {
      newBuilder.ast.where = { condition: newCondition };
    }

    return newBuilder;
  }

  /**
   * Add an ORDER BY clause
   *
   * @param column - Column to order by
   * @param dir - Sort direction ('asc' or 'desc'), defaults to 'asc'
   * @returns New builder instance for chaining
   *
   * @example
   * ```typescript
   * sq.ord('name')              // ORDER BY name ASC
   * sq.ord('created_at', 'desc') // ORDER BY created_at DESC
   * sq.ord('age', 'asc').ord('name', 'desc')
   * // ORDER BY age ASC, name DESC
   * ```
   */
  ord(column: string, dir: 'asc' | 'desc' = 'asc'): QueryBuilder {
    // Validate direction
    if (dir !== 'asc' && dir !== 'desc') {
      throw new Error(`Invalid order direction: ${dir}. Must be 'asc' or 'desc'.`);
    }

    const direction: OrderDirection =
      dir === 'desc' ? OrderDirection.DESC : OrderDirection.ASC;

    const orderBy: OrderBy = {
      column,
      direction,
    };

    const newBuilder = this.clone();

    if (!newBuilder.ast.orderBy) {
      newBuilder.ast.orderBy = { orders: [] };
    }

    newBuilder.ast.orderBy.orders.push(orderBy);
    return newBuilder;
  }

  /**
   * Set LIMIT clause
   *
   * @param n - Maximum number of rows to return
   * @returns New builder instance for chaining
   *
   * @example
   * ```typescript
   * sq.lim(10)  // LIMIT 10
   * ```
   */
  lim(n: number): QueryBuilder {
    if (!Number.isInteger(n) || n < 0) {
      throw new Error(`Invalid limit value: ${n}. Must be a non-negative integer.`);
    }

    const newBuilder = this.clone();
    newBuilder.ast.limit = { limit: n };
    return newBuilder;
  }

  /**
   * Set OFFSET clause
   *
   * @param n - Number of rows to skip
   * @returns New builder instance for chaining
   *
   * @example
   * ```typescript
   * sq.off(20)  // OFFSET 20
   * ```
   */
  off(n: number): QueryBuilder {
    if (!Number.isInteger(n) || n < 0) {
      throw new Error(`Invalid offset value: ${n}. Must be a non-negative integer.`);
    }

    const newBuilder = this.clone();
    newBuilder.ast.offset = { offset: n };
    return newBuilder;
  }

  /**
   * Add GROUP BY clause
   *
   * @param columns - Columns to group by
   * @returns New builder instance for chaining
   *
   * @example
   * ```typescript
   * sq.grp('department')              // GROUP BY department
   * sq.grp('department', 'location')  // GROUP BY department, location
   * ```
   */
  grp(...columns: string[]): QueryBuilder {
    if (columns.length === 0) {
      throw new Error('At least one column must be specified for GROUP BY');
    }

    const newBuilder = this.clone();
    newBuilder.ast.groupBy = { columns };
    return newBuilder;
  }

  /**
   * Add HAVING clause (for filtering grouped results)
   *
   * @param column - Column name (usually an aggregate)
   * @param op - Comparison operator
   * @param value - Value to compare against
   * @returns New builder instance for chaining
   *
   * @example
   * ```typescript
   * sq.grp('department').hav('count(*)', '>', 5)
   * // GROUP BY department HAVING count(*) > 5
   * ```
   */
  hav(column: string, op: string, value: unknown): QueryBuilder {
    const operator = this.parseOperator(op);
    const condition: Condition = {
      type: 'comparison',
      left: column,
      operator,
      right: value as string | number | boolean,
    };

    const newBuilder = this.clone();

    // Validate that GROUP BY exists
    if (!newBuilder.ast.groupBy) {
      throw new Error('HAVING clause requires GROUP BY clause');
    }

    // If there's already a HAVING clause, combine with AND
    if (newBuilder.ast.having) {
      const existingCondition = newBuilder.ast.having.condition;
      newBuilder.ast.having.condition = {
        type: 'and',
        conditions: [existingCondition, condition],
      };
    } else {
      newBuilder.ast.having = { condition };
    }

    return newBuilder;
  }

  /**
   * Add an INNER JOIN clause
   *
   * @param table - Table to join
   * @param leftCol - Left column (from first table)
   * @param rightCol - Right column (from joined table)
   * @returns New builder instance for chaining
   *
   * @example
   * ```typescript
   * sq.join('orders', 'users.id', 'orders.user_id')
   * // INNER JOIN orders ON users.id = orders.user_id
   * ```
   */
  join(table: string, leftCol: string, rightCol: string): QueryBuilder {
    return this.addJoin(JoinType.INNER, table, leftCol, rightCol);
  }

  /**
   * Add a LEFT JOIN clause
   *
   * @param table - Table to join
   * @param leftCol - Left column (from first table)
   * @param rightCol - Right column (from joined table)
   * @returns New builder instance for chaining
   */
  leftJoin(table: string, leftCol: string, rightCol: string): QueryBuilder {
    return this.addJoin(JoinType.LEFT, table, leftCol, rightCol);
  }

  /**
   * Add a RIGHT JOIN clause
   *
   * @param table - Table to join
   * @param leftCol - Left column (from first table)
   * @param rightCol - Right column (from joined table)
   * @returns New builder instance for chaining
   */
  rightJoin(table: string, leftCol: string, rightCol: string): QueryBuilder {
    return this.addJoin(JoinType.RIGHT, table, leftCol, rightCol);
  }

  /**
   * Add a FULL JOIN clause
   *
   * @param table - Table to join
   * @param leftCol - Left column (from first table)
   * @param rightCol - Right column (from joined table)
   * @returns New builder instance for chaining
   */
  fullJoin(table: string, leftCol: string, rightCol: string): QueryBuilder {
    return this.addJoin(JoinType.FULL, table, leftCol, rightCol);
  }

  /**
   * Helper method to add a JOIN clause
   */
  private addJoin(joinType: JoinType, table: string, leftCol: string, rightCol: string): QueryBuilder {
    const join: JoinClause = {
      type: joinType,
      table,
      on: {
        type: 'comparison',
        left: leftCol,
        operator: Operator.EQ,
        right: rightCol,
      },
    };

    const newBuilder = this.clone();

    if (!newBuilder.ast.joins) {
      newBuilder.ast.joins = [];
    }

    newBuilder.ast.joins.push(join);
    return newBuilder;
  }

  /**
   * Add special WHERE IN condition
   */
  whereIn(column: string, values: (string | number | boolean)[]): QueryBuilder {
    const condition: Condition = {
      type: 'in',
      column,
      values,
      negated: false,
    };

    const newBuilder = this.clone();

    if (newBuilder.ast.where) {
      const existingCondition = newBuilder.ast.where.condition;
      newBuilder.ast.where.condition = {
        type: 'and',
        conditions: [existingCondition, condition],
      };
    } else {
      newBuilder.ast.where = { condition };
    }

    return newBuilder;
  }

  /**
   * Add special WHERE NOT IN condition
   */
  whereNotIn(column: string, values: (string | number | boolean)[]): QueryBuilder {
    const condition: Condition = {
      type: 'in',
      column,
      values,
      negated: true,
    };

    const newBuilder = this.clone();

    if (newBuilder.ast.where) {
      const existingCondition = newBuilder.ast.where.condition;
      newBuilder.ast.where.condition = {
        type: 'and',
        conditions: [existingCondition, condition],
      };
    } else {
      newBuilder.ast.where = { condition };
    }

    return newBuilder;
  }

  /**
   * Add WHERE IS NULL condition
   */
  whereNull(column: string): QueryBuilder {
    const condition: Condition = {
      type: 'null',
      column,
      negated: false,
    };

    const newBuilder = this.clone();

    if (newBuilder.ast.where) {
      const existingCondition = newBuilder.ast.where.condition;
      newBuilder.ast.where.condition = {
        type: 'and',
        conditions: [existingCondition, condition],
      };
    } else {
      newBuilder.ast.where = { condition };
    }

    return newBuilder;
  }

  /**
   * Add WHERE IS NOT NULL condition
   */
  whereNotNull(column: string): QueryBuilder {
    const condition: Condition = {
      type: 'null',
      column,
      negated: true,
    };

    const newBuilder = this.clone();

    if (newBuilder.ast.where) {
      const existingCondition = newBuilder.ast.where.condition;
      newBuilder.ast.where.condition = {
        type: 'and',
        conditions: [existingCondition, condition],
      };
    } else {
      newBuilder.ast.where = { condition };
    }

    return newBuilder;
  }

  // ===== INSERT OPERATIONS =====

  /**
   * Start an INSERT statement
   *
   * @param table - Table to insert into
   * @returns New builder instance for chaining
   *
   * @example
   * ```typescript
   * sq.ins('users').cols('name', 'email').vals('john', 'john@test.com')
   * // INSERT INTO users (name, email) VALUES ('john', 'john@test.com')
   * ```
   */
  ins(table: string): QueryBuilder {
    if (!table || typeof table !== 'string') {
      throw new Error('Table name must be a non-empty string');
    }

    const newBuilder = this.clone();
    newBuilder.ast.type = StatementType.INSERT;
    newBuilder.ast.insert = {
      table,
      columns: [],
      values: [],
    };
    return newBuilder;
  }

  /**
   * Set columns for INSERT statement
   *
   * @param columns - Column names
   * @returns New builder instance for chaining
   *
   * @example
   * ```typescript
   * sq.ins('users').cols('name', 'email')
   * ```
   */
  cols(...columns: string[]): QueryBuilder {
    if (!this.ast.insert) {
      throw new Error('cols() must be called after ins()');
    }

    const newBuilder = this.clone();
    newBuilder.ast.insert!.columns = columns;
    return newBuilder;
  }

  /**
   * Set values for INSERT statement
   *
   * @param values - Values to insert
   * @returns New builder instance for chaining
   *
   * @example
   * ```typescript
   * sq.ins('users').cols('name', 'age').vals('john', 25)
   * ```
   */
  vals(...values: (string | number | boolean | null)[]): QueryBuilder {
    if (!this.ast.insert) {
      throw new Error('vals() must be called after ins()');
    }

    const newBuilder = this.clone();
    newBuilder.ast.insert!.values = values;
    return newBuilder;
  }

  // ===== UPDATE OPERATIONS =====

  /**
   * Start an UPDATE statement
   *
   * @param table - Table to update
   * @returns New builder instance for chaining
   *
   * @example
   * ```typescript
   * sq.upd('users').set('name', 'john').whr('id', '=', 1)
   * // UPDATE users SET name = 'john' WHERE id = 1
   * ```
   */
  upd(table: string): QueryBuilder {
    if (!table || typeof table !== 'string') {
      throw new Error('Table name must be a non-empty string');
    }

    const newBuilder = this.clone();
    newBuilder.ast.type = StatementType.UPDATE;
    newBuilder.ast.update = { table };
    return newBuilder;
  }

  /**
   * Add SET assignment for UPDATE statement
   *
   * Can be called with (column, value) or with an object of assignments
   *
   * @param columnOrAssignments - Column name or object of column:value pairs
   * @param value - Value to set (when using column, value form)
   * @returns New builder instance for chaining
   *
   * @example
   * ```typescript
   * sq.upd('users').set('name', 'john')
   * sq.upd('users').set({ name: 'john', age: 30 })
   * ```
   */
  set(column: string, value: string | number | boolean | null): QueryBuilder;
  set(assignments: Record<string, string | number | boolean | null>): QueryBuilder;
  set(
    columnOrAssignments: string | Record<string, string | number | boolean | null>,
    value?: string | number | boolean | null
  ): QueryBuilder {
    const newBuilder = this.clone();

    if (!newBuilder.ast.set) {
      newBuilder.ast.set = { assignments: [] };
    }

    if (typeof columnOrAssignments === 'string') {
      // Single column/value form
      newBuilder.ast.set.assignments.push({
        column: columnOrAssignments,
        value: value as string | number | boolean | null,
      });
    } else {
      // Object form
      for (const [col, val] of Object.entries(columnOrAssignments)) {
        newBuilder.ast.set.assignments.push({ column: col, value: val });
      }
    }

    return newBuilder;
  }

  // ===== DELETE OPERATIONS =====

  /**
   * Start a DELETE statement
   *
   * @param table - Table to delete from
   * @returns New builder instance for chaining
   *
   * @example
   * ```typescript
   * sq.del('users').whr('id', '=', 1)
   * // DELETE FROM users WHERE id = 1
   * ```
   */
  del(table: string): QueryBuilder {
    if (!table || typeof table !== 'string') {
      throw new Error('Table name must be a non-empty string');
    }

    const newBuilder = this.clone();
    newBuilder.ast.type = StatementType.DELETE;
    newBuilder.ast.delete = { table };
    return newBuilder;
  }

  // ===== RETURNING CLAUSE =====

  /**
   * Add RETURNING clause (for INSERT, UPDATE, DELETE)
   *
   * @param columns - Columns to return, or '*' for all columns
   * @returns New builder instance for chaining
   *
   * @example
   * ```typescript
   * sq.ins('users').cols('name').vals('john').ret('id')
   * // INSERT INTO users (name) VALUES ('john') RETURNING id
   *
   * sq.upd('users').set('name', 'john').whr('id', '=', 1).ret('*')
   * // UPDATE users SET name = 'john' WHERE id = 1 RETURNING *
   * ```
   */
  ret(...columns: string[]): QueryBuilder {
    const newBuilder = this.clone();

    if (columns.length === 1 && columns[0] === '*') {
      newBuilder.ast.returning = { columns: '*' };
    } else {
      newBuilder.ast.returning = { columns };
    }
    return newBuilder;
  }

  // ===== METHOD ALIASES =====

  /**
   * Alias for sel() - standard SQL style
   */
  select(...columns: (string | string[])[]): QueryBuilder {
    return this.sel(...columns);
  }

  /**
   * Alias for whr() - standard SQL style
   */
  where(column: string, op: string, value: unknown): QueryBuilder;
  where(column: string, value: unknown): QueryBuilder;
  where(column: string, opOrValue: string | unknown, value?: unknown): QueryBuilder {
    return this.whr(column, opOrValue as any, value as any);
  }

  /**
   * Alias for ord() - standard SQL style
   */
  orderBy(column: string, dir: 'asc' | 'desc' = 'asc'): QueryBuilder {
    return this.ord(column, dir);
  }

  /**
   * Alias for lim() - standard SQL style
   */
  limit(n: number): QueryBuilder {
    return this.lim(n);
  }

  /**
   * Alias for off() - standard SQL style
   */
  offset(n: number): QueryBuilder {
    return this.off(n);
  }

  /**
   * Alias for grp() - standard SQL style
   */
  groupBy(...columns: string[]): QueryBuilder {
    return this.grp(...columns);
  }

  /**
   * Alias for hav() - standard SQL style
   */
  having(column: string, op: string, value: unknown): QueryBuilder {
    return this.hav(column, op, value);
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
