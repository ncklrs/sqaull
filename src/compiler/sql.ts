/**
 * SQL compiler for sqwind
 *
 * Compiles QueryAST into SQL strings with support for multiple dialects.
 */

import type {
  QueryAST,
  SelectColumn,
  Condition,
  JoinClause,
  OrderBy,
} from '../parser/types';
import {
  Operator,
} from '../parser/types';
import {
  Dialect,
  type CompilerOptions,
  type CompilerContext,
  getPlaceholder,
  quoteIdentifier,
  formatKeyword,
} from './types';

/**
 * Compiled query result
 */
export interface CompiledQuery {
  /**
   * The SQL string
   */
  sql: string;

  /**
   * Parameter values (if parameterized)
   */
  params: unknown[];
}

/**
 * Compile a QueryAST into SQL
 *
 * @param ast - The query AST to compile
 * @param options - Compiler options
 * @returns Compiled SQL with optional parameters
 *
 * @example
 * ```typescript
 * const ast = parse(lex('from:users sel:name whr:age>18'));
 * const result = compile(ast, { dialect: Dialect.POSTGRES, parameterize: true });
 * // { sql: 'SELECT name FROM users WHERE age > $1', params: [18] }
 * ```
 */
export function compile(ast: QueryAST, options: CompilerOptions = {}): CompiledQuery {
  const dialect = options.dialect ?? Dialect.POSTGRES;
  const parameterized = options.parameterize ?? true;

  // Determine placeholder style
  let placeholderStyle: 'postgres' | 'mysql' | 'sqlite';
  if (options.placeholderStyle && options.placeholderStyle !== 'auto') {
    placeholderStyle = options.placeholderStyle;
  } else {
    // Auto-detect based on dialect
    placeholderStyle =
      dialect === Dialect.POSTGRES ? 'postgres' : dialect === Dialect.MYSQL ? 'mysql' : 'sqlite';
  }

  const context: CompilerContext = {
    dialect,
    parameterized,
    quoteIdentifiers: options.quoteIdentifiers ?? false,
    keywordCase: options.keywordCase ?? 'upper',
    tablePrefix: options.tablePrefix ?? '',
    params: [],
    paramIndex: 1,
    placeholderStyle,
  };

  const parts: string[] = [];

  // Build SELECT clause
  if (ast.select) {
    parts.push(compileSelect(ast.select.columns, context));
  } else {
    // Default to SELECT *
    parts.push(formatKeyword('SELECT', context.keywordCase) + ' *');
  }

  // Build FROM clause
  if (ast.from) {
    parts.push(compileFrom(ast.from.table, context));
  }

  // Build JOIN clauses
  if (ast.joins && ast.joins.length > 0) {
    for (const join of ast.joins) {
      parts.push(compileJoin(join, context));
    }
  }

  // Build WHERE clause
  if (ast.where) {
    parts.push(compileWhere(ast.where.condition, context));
  }

  // Build GROUP BY clause
  if (ast.groupBy) {
    parts.push(compileGroupBy(ast.groupBy.columns, context));
  }

  // Build HAVING clause
  if (ast.having) {
    parts.push(compileHaving(ast.having.condition, context));
  }

  // Build ORDER BY clause
  if (ast.orderBy) {
    parts.push(compileOrderBy(ast.orderBy.orders, context));
  }

  // Build LIMIT clause
  if (ast.limit) {
    parts.push(compileLimit(ast.limit.limit, context));
  }

  // Build OFFSET clause
  if (ast.offset) {
    parts.push(compileOffset(ast.offset.offset, context));
  }

  const sql = options.pretty ? parts.join('\n') : parts.join(' ');

  return {
    sql,
    params: context.params,
  };
}

/**
 * Compile SELECT clause
 */
function compileSelect(columns: SelectColumn[], context: CompilerContext): string {
  const keyword = formatKeyword('SELECT', context.keywordCase);

  if (columns.length === 0) {
    return `${keyword} *`;
  }

  const compiledColumns = columns.map((col) => {
    if (col.type === 'wildcard') {
      return '*';
    } else if (col.type === 'column') {
      return maybeQuoteIdentifier(col.name, context);
    } else if (col.type === 'aggregate') {
      const func = col.function.toUpperCase();
      const colName = col.column === '*' ? '*' : maybeQuoteIdentifier(col.column, context);
      const expr = `${func}(${colName})`;
      if (col.alias) {
        const alias = maybeQuoteIdentifier(col.alias, context);
        return `${expr} ${formatKeyword('AS', context.keywordCase)} ${alias}`;
      }
      return expr;
    }
    return '*';
  });

  return `${keyword} ${compiledColumns.join(', ')}`;
}

/**
 * Compile FROM clause
 */
function compileFrom(table: string, context: CompilerContext): string {
  const keyword = formatKeyword('FROM', context.keywordCase);
  const tableName = context.tablePrefix + table;
  return `${keyword} ${maybeQuoteIdentifier(tableName, context)}`;
}

/**
 * Compile JOIN clause
 */
function compileJoin(join: JoinClause, context: CompilerContext): string {
  const joinType = join.type.toUpperCase();
  const keyword = formatKeyword(`${joinType} JOIN`, context.keywordCase);
  const tableName = context.tablePrefix + join.table;
  const table = maybeQuoteIdentifier(tableName, context);

  let joinClause = `${keyword} ${table}`;

  if (join.on) {
    const onClause = compileCondition(join.on, context);
    joinClause += ` ${formatKeyword('ON', context.keywordCase)} ${onClause}`;
  }

  return joinClause;
}

/**
 * Compile WHERE clause
 */
function compileWhere(condition: Condition, context: CompilerContext): string {
  const keyword = formatKeyword('WHERE', context.keywordCase);
  const compiledCondition = compileCondition(condition, context);
  return `${keyword} ${compiledCondition}`;
}

/**
 * Compile a condition
 */
function compileCondition(condition: Condition, context: CompilerContext): string {
  if (condition.type === 'comparison') {
    return compileComparison(condition, context);
  } else if (condition.type === 'in') {
    return compileIn(condition, context);
  } else if (condition.type === 'null') {
    return compileNull(condition, context);
  } else if (condition.type === 'and') {
    const conditions = condition.conditions.map((c) => compileCondition(c, context));
    return `(${conditions.join(` ${formatKeyword('AND', context.keywordCase)} `)})`;
  } else if (condition.type === 'or') {
    const conditions = condition.conditions.map((c) => compileCondition(c, context));
    return `(${conditions.join(` ${formatKeyword('OR', context.keywordCase)} `)})`;
  } else if (condition.type === 'not') {
    const inner = compileCondition(condition.condition, context);
    return `${formatKeyword('NOT', context.keywordCase)} (${inner})`;
  }
  return '';
}

/**
 * Compile comparison condition
 */
function compileComparison(
  condition: { type: 'comparison'; left: string; operator: Operator; right: string | number },
  context: CompilerContext
): string {
  const column = maybeQuoteIdentifier(condition.left, context);
  const operator = operatorToSQL(condition.operator);
  const value = addParam(condition.right, context);
  return `${column} ${operator} ${value}`;
}

/**
 * Compile IN condition
 */
function compileIn(
  condition: { type: 'in'; column: string; values: (string | number)[]; negated: boolean },
  context: CompilerContext
): string {
  const column = maybeQuoteIdentifier(condition.column, context);
  const keyword = condition.negated
    ? formatKeyword('NOT IN', context.keywordCase)
    : formatKeyword('IN', context.keywordCase);
  const values = condition.values.map((val) => addParam(val, context)).join(', ');
  return `${column} ${keyword} (${values})`;
}

/**
 * Compile NULL condition
 */
function compileNull(
  condition: { type: 'null'; column: string; negated: boolean },
  context: CompilerContext
): string {
  const column = maybeQuoteIdentifier(condition.column, context);
  const keyword = condition.negated
    ? formatKeyword('IS NOT NULL', context.keywordCase)
    : formatKeyword('IS NULL', context.keywordCase);
  return `${column} ${keyword}`;
}

/**
 * Convert operator enum to SQL operator
 */
function operatorToSQL(operator: Operator): string {
  switch (operator) {
    case Operator.GT:
      return '>';
    case Operator.LT:
      return '<';
    case Operator.GTE:
      return '>=';
    case Operator.LTE:
      return '<=';
    case Operator.EQ:
      return '=';
    case Operator.NEQ:
      return '<>';
    case Operator.LIKE:
      return 'LIKE';
  }
}

/**
 * Compile GROUP BY clause
 */
function compileGroupBy(columns: string[], context: CompilerContext): string {
  const keyword = formatKeyword('GROUP BY', context.keywordCase);
  const cols = columns.map((col) => maybeQuoteIdentifier(col, context));
  return `${keyword} ${cols.join(', ')}`;
}

/**
 * Compile HAVING clause
 */
function compileHaving(condition: Condition, context: CompilerContext): string {
  const keyword = formatKeyword('HAVING', context.keywordCase);
  const compiledCondition = compileCondition(condition, context);
  return `${keyword} ${compiledCondition}`;
}

/**
 * Compile ORDER BY clause
 */
function compileOrderBy(orders: OrderBy[], context: CompilerContext): string {
  const keyword = formatKeyword('ORDER BY', context.keywordCase);
  const compiledOrders = orders.map((order) => {
    const column = maybeQuoteIdentifier(order.column, context);
    const direction = formatKeyword(order.direction, context.keywordCase);
    return `${column} ${direction}`;
  });
  return `${keyword} ${compiledOrders.join(', ')}`;
}

/**
 * Compile LIMIT clause
 */
function compileLimit(limit: number, context: CompilerContext): string {
  const keyword = formatKeyword('LIMIT', context.keywordCase);
  if (context.parameterized) {
    const placeholder = addParam(limit, context);
    return `${keyword} ${placeholder}`;
  }
  return `${keyword} ${limit}`;
}

/**
 * Compile OFFSET clause
 */
function compileOffset(offset: number, context: CompilerContext): string {
  const keyword = formatKeyword('OFFSET', context.keywordCase);
  if (context.parameterized) {
    const placeholder = addParam(offset, context);
    return `${keyword} ${placeholder}`;
  }
  return `${keyword} ${offset}`;
}

/**
 * Add a parameter and return its placeholder
 */
function addParam(value: unknown, context: CompilerContext): string {
  if (!context.parameterized) {
    return formatValue(value);
  }

  context.params.push(value);
  const placeholder = getPlaceholder(context.placeholderStyle, context.paramIndex);
  context.paramIndex++;
  return placeholder;
}

/**
 * Format a value for inline SQL (when not parameterized)
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  if (typeof value === 'string') {
    return `'${value.replace(/'/g, "''")}'`; // Escape single quotes
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (value instanceof Date) {
    return `'${value.toISOString()}'`;
  }
  if (Array.isArray(value)) {
    return `(${value.map(formatValue).join(', ')})`;
  }
  // Fallback for objects
  return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
}

/**
 * Conditionally quote an identifier based on context settings
 */
function maybeQuoteIdentifier(identifier: string, context: CompilerContext): string {
  // Don't quote special cases
  if (identifier === '*' || identifier.includes('(') || identifier.includes('.')) {
    return identifier;
  }

  if (context.quoteIdentifiers) {
    return quoteIdentifier(identifier, context.dialect);
  }

  return identifier;
}
