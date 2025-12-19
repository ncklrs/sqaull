/**
 * Parser for sqwind query language
 *
 * Parses tokens into an Abstract Syntax Tree (AST).
 */

import {
  Token,
  TokenType,
  QueryAST,
  SelectColumn,
  AggregateType,
  Condition,
  Operator,
  OrderBy,
  OrderDirection,
  JoinType,
  JoinClause,
  FromClause,
  SelectClause,
  WhereClause,
  GroupByClause,
  HavingClause,
  OrderByClause,
  LimitClause,
  OffsetClause,
} from './types.js';
import { lex } from './lexer.js';

/**
 * Parser error class
 */
export class ParserError extends Error {
  constructor(message: string, public position: number) {
    super(message);
    this.name = 'ParserError';
  }
}

/**
 * Parses a FROM token into a FromClause
 */
function parseFrom(token: Token): FromClause {
  return {
    table: token.value,
  };
}

/**
 * Parses aggregate function syntax (e.g., "sum:revenue", "cnt:*")
 */
function parseAggregate(
  part: string
): { type: 'aggregate'; function: AggregateType; column: string } | null {
  const aggregateFunctions: Record<string, AggregateType> = {
    sum: AggregateType.SUM,
    cnt: AggregateType.COUNT,
    avg: AggregateType.AVG,
    min: AggregateType.MIN,
    max: AggregateType.MAX,
  };

  for (const [prefix, aggType] of Object.entries(aggregateFunctions)) {
    if (part.startsWith(`${prefix}:`)) {
      const column = part.slice(prefix.length + 1);
      return {
        type: 'aggregate',
        function: aggType,
        column,
      };
    }
  }

  return null;
}

/**
 * Parses a SELECT token into a SelectClause
 */
function parseSelect(token: Token): SelectClause {
  const columns: SelectColumn[] = [];
  const parts = token.value.split(',').map((p) => p.trim());

  for (const part of parts) {
    if (part === '*') {
      columns.push({ type: 'wildcard' });
      continue;
    }

    // Check for aggregate functions
    const aggregate = parseAggregate(part);
    if (aggregate) {
      columns.push(aggregate);
      continue;
    }

    // Regular column
    columns.push({
      type: 'column',
      name: part,
    });
  }

  return { columns };
}

/**
 * Parses a comparison operator from a string
 */
function parseOperator(op: string): Operator {
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
      return Operator.EQ;
    case '!=':
      return Operator.NEQ;
    case '~':
      return Operator.LIKE;
    default:
      throw new ParserError(`Unknown operator: ${op}`, 0);
  }
}

/**
 * Parses a value (string or number)
 */
function parseValue(value: string): string | number {
  // Try to parse as number
  const num = Number(value);
  if (!isNaN(num) && value.trim() !== '') {
    return num;
  }
  // Remove quotes if present
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

/**
 * Parses a single condition expression
 */
function parseConditionExpression(expr: string): Condition {
  expr = expr.trim();

  // Handle NOT
  if (expr.startsWith('!(') && expr.endsWith(')')) {
    const innerExpr = expr.slice(2, -1);
    return {
      type: 'not',
      condition: parseConditionExpression(innerExpr),
    };
  }

  // Handle .null and .!null
  if (expr.endsWith('.null')) {
    const column = expr.slice(0, -5);
    return {
      type: 'null',
      column,
      negated: false,
    };
  }

  if (expr.endsWith('.!null')) {
    const column = expr.slice(0, -6);
    return {
      type: 'null',
      column,
      negated: true,
    };
  }

  // Handle .in() and .nin()
  const inMatch = expr.match(/^(.+?)\.in\((.+)\)$/);
  if (inMatch) {
    const column = inMatch[1];
    const valuesStr = inMatch[2];
    const values = valuesStr.split(',').map((v) => parseValue(v.trim()));
    return {
      type: 'in',
      column,
      values,
      negated: false,
    };
  }

  const ninMatch = expr.match(/^(.+?)\.nin\((.+)\)$/);
  if (ninMatch) {
    const column = ninMatch[1];
    const valuesStr = ninMatch[2];
    const values = valuesStr.split(',').map((v) => parseValue(v.trim()));
    return {
      type: 'in',
      column,
      values,
      negated: true,
    };
  }

  // Handle comparison operators (order matters - check >= before >)
  const operators = ['>=', '<=', '!=', '>', '<', '=', '~'];

  for (const op of operators) {
    const index = expr.indexOf(op);
    if (index > 0) {
      const left = expr.slice(0, index).trim();
      const right = expr.slice(index + op.length).trim();

      return {
        type: 'comparison',
        left,
        operator: parseOperator(op),
        right: parseValue(right),
      };
    }
  }

  throw new ParserError(`Invalid condition expression: ${expr}`, 0);
}

/**
 * Split a condition string by a separator, respecting parentheses depth
 */
function splitConditionString(str: string, separator: string): string[] {
  const parts: string[] = [];
  let currentPart = '';
  let depth = 0;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];

    if (char === '(' || char === ')') {
      depth += char === '(' ? 1 : -1;
      currentPart += char;
    } else if (char === separator && depth === 0) {
      parts.push(currentPart);
      currentPart = '';
    } else {
      currentPart += char;
    }
  }

  if (currentPart) {
    parts.push(currentPart);
  }

  return parts;
}

/**
 * Parses a condition string that may contain OR (|) or AND (,) operators
 */
function parseCondition(conditionStr: string): Condition {
  conditionStr = conditionStr.trim();

  // First, check for comma-separated AND conditions
  // But we need to be careful not to split values like "1,2,3" in .in(1,2,3)
  // Only split on commas that are followed by a condition pattern (colName or !)
  const andParts = splitConditionString(conditionStr, ',');

  // Filter out empty parts and check if we have multiple valid conditions
  const validAndParts = andParts
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && /^[a-zA-Z_!]/.test(p));

  if (validAndParts.length > 1) {
    // Multiple AND conditions
    return {
      type: 'and',
      conditions: validAndParts.map((part) => parseConditionOrExpression(part)),
    };
  }

  // Otherwise, parse as OR expression or single condition
  return parseConditionOrExpression(conditionStr);
}

/**
 * Parses a condition string that may contain OR (|) operators
 */
function parseConditionOrExpression(conditionStr: string): Condition {
  conditionStr = conditionStr.trim();

  // Split by | for OR conditions
  const orParts = splitConditionString(conditionStr, '|');

  // If we have multiple OR parts, create an OR condition
  if (orParts.length > 1) {
    return {
      type: 'or',
      conditions: orParts.map((part) => parseConditionExpression(part.trim())),
    };
  }

  // Otherwise, parse as a single expression
  return parseConditionExpression(conditionStr);
}

/**
 * Parses a WHERE token into a WhereClause
 */
function parseWhere(token: Token): WhereClause {
  return {
    condition: parseCondition(token.value),
  };
}

/**
 * Parses a HAVING token into a HavingClause
 */
function parseHaving(token: Token): HavingClause {
  return {
    condition: parseCondition(token.value),
  };
}

/**
 * Parses an ORDER BY token into an OrderByClause
 */
function parseOrderBy(token: Token): OrderByClause {
  const orders: OrderBy[] = [];
  const parts = token.value.split(',').map((p) => p.trim());

  for (const part of parts) {
    // Check for /desc or /asc modifier
    if (part.includes('/')) {
      const [column, directionStr] = part.split('/');
      const direction =
        directionStr.toLowerCase() === 'desc'
          ? OrderDirection.DESC
          : OrderDirection.ASC;
      orders.push({
        column: column.trim(),
        direction,
      });
    } else {
      orders.push({
        column: part,
        direction: OrderDirection.ASC,
      });
    }
  }

  return { orders };
}

/**
 * Parses a LIMIT token into a LimitClause
 */
function parseLimit(token: Token): LimitClause {
  const limit = parseInt(token.value, 10);

  if (isNaN(limit) || limit < 0) {
    throw new ParserError(
      `Invalid LIMIT value: ${token.value}`,
      token.position
    );
  }

  return { limit };
}

/**
 * Parses an OFFSET token into an OffsetClause
 */
function parseOffset(token: Token): OffsetClause {
  const offset = parseInt(token.value, 10);

  if (isNaN(offset) || offset < 0) {
    throw new ParserError(
      `Invalid OFFSET value: ${token.value}`,
      token.position
    );
  }

  return { offset };
}

/**
 * Parses a GROUP BY token into a GroupByClause
 */
function parseGroupBy(token: Token): GroupByClause {
  const columns = token.value.split(',').map((c) => c.trim());
  return { columns };
}

/**
 * Parses a JOIN token into join type and table
 */
function parseJoin(token: Token): { type: JoinType; table: string } {
  // Format: table/type or just table (defaults to INNER)
  const parts = token.value.split('/');
  const table = parts[0].trim();

  let joinType = JoinType.INNER;

  if (parts[1]) {
    const typeStr = parts[1].trim().toUpperCase();
    switch (typeStr) {
      case 'INNER':
        joinType = JoinType.INNER;
        break;
      case 'LEFT':
        joinType = JoinType.LEFT;
        break;
      case 'RIGHT':
        joinType = JoinType.RIGHT;
        break;
      case 'FULL':
        joinType = JoinType.FULL;
        break;
      default:
        throw new ParserError(`Unknown join type: ${typeStr}`, token.position);
    }
  }

  return { type: joinType, table };
}

/**
 * Parses an ON token into a condition
 */
function parseOn(token: Token): Condition {
  return parseCondition(token.value);
}

/**
 * Parse tokens or query string into a QueryAST
 *
 * @param input - Array of tokens from the lexer OR a sqwind query string
 * @returns QueryAST representing the parsed query
 * @throws {ParserError} If tokens contain invalid syntax
 *
 * @example
 * ```typescript
 * // Parse from string (recommended)
 * const ast = parse('from:users sel:name whr:age>18');
 * // {
 * //   from: { table: 'users' },
 * //   select: { columns: [{ type: 'column', name: 'name' }] },
 * //   where: { condition: { type: 'comparison', left: 'age', operator: '>', right: 18 } }
 * // }
 *
 * // Or parse from tokens
 * const tokens = lex('from:users sel:name');
 * const ast2 = parse(tokens);
 * ```
 */
export function parse(input: Token[] | string): QueryAST {
  // If input is a string, lex it first
  const tokens: Token[] = typeof input === 'string' ? lex(input) : input;
  const ast: QueryAST = {};
  const joins: JoinClause[] = [];
  const whereConditions: Condition[] = [];
  const havingConditions: Condition[] = [];

  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];

    switch (token.type) {
      case TokenType.FROM:
        if (ast.from) {
          throw new ParserError('Duplicate FROM clause', token.position);
        }
        ast.from = parseFrom(token);
        break;

      case TokenType.SELECT:
        if (ast.select) {
          throw new ParserError('Duplicate SELECT clause', token.position);
        }
        ast.select = parseSelect(token);
        break;

      case TokenType.WHERE:
        // Multiple WHERE clauses are combined with AND
        whereConditions.push(parseWhere(token).condition);
        break;

      case TokenType.HAVING:
        // Multiple HAVING clauses are combined with AND
        havingConditions.push(parseHaving(token).condition);
        break;

      case TokenType.ORDER:
        if (ast.orderBy) {
          throw new ParserError('Duplicate ORDER BY clause', token.position);
        }
        ast.orderBy = parseOrderBy(token);
        break;

      case TokenType.LIMIT:
        if (ast.limit) {
          throw new ParserError('Duplicate LIMIT clause', token.position);
        }
        ast.limit = parseLimit(token);
        break;

      case TokenType.OFFSET:
        if (ast.offset) {
          throw new ParserError('Duplicate OFFSET clause', token.position);
        }
        ast.offset = parseOffset(token);
        break;

      case TokenType.GROUP:
        if (ast.groupBy) {
          throw new ParserError('Duplicate GROUP BY clause', token.position);
        }
        ast.groupBy = parseGroupBy(token);
        break;

      case TokenType.JOIN: {
        const joinInfo = parseJoin(token);
        // Look ahead for ON clause
        let onCondition: Condition | undefined;

        if (i + 1 < tokens.length && tokens[i + 1].type === TokenType.ON) {
          onCondition = parseOn(tokens[i + 1]);
          i++; // Skip the ON token
        }

        joins.push({
          type: joinInfo.type,
          table: joinInfo.table,
          on: onCondition,
        });
        break;
      }

      case TokenType.ON:
        // ON should always be preceded by JOIN, handled in JOIN case
        throw new ParserError(
          'ON clause must follow a JOIN clause',
          token.position
        );

      default:
        throw new ParserError(
          `Unexpected token type: ${token.type}`,
          token.position
        );
    }

    i++;
  }

  // Combine multiple WHERE conditions with AND
  if (whereConditions.length > 0) {
    ast.where = {
      condition:
        whereConditions.length === 1
          ? whereConditions[0]
          : {
              type: 'and',
              conditions: whereConditions,
            },
    };
  }

  // Combine multiple HAVING conditions with AND
  if (havingConditions.length > 0) {
    ast.having = {
      condition:
        havingConditions.length === 1
          ? havingConditions[0]
          : {
              type: 'and',
              conditions: havingConditions,
            },
    };
  }

  // Add joins if any
  if (joins.length > 0) {
    ast.joins = joins;
  }

  return ast;
}

export type { QueryAST };
