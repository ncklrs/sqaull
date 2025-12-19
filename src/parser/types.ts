/**
 * Token types for sqwind query language
 */
export enum TokenType {
  FROM = 'FROM',
  SELECT = 'SELECT',
  WHERE = 'WHERE',
  ORDER = 'ORDER',
  LIMIT = 'LIMIT',
  OFFSET = 'OFFSET',
  GROUP = 'GROUP',
  HAVING = 'HAVING',
  JOIN = 'JOIN',
  ON = 'ON',
}

/**
 * Token interface with type, value, and position information
 */
export interface Token {
  type: TokenType;
  value: string;
  position: number;
  raw: string;
}

/**
 * Join types supported by sqwind
 */
export enum JoinType {
  INNER = 'INNER',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
  FULL = 'FULL',
}

/**
 * Aggregate function types
 */
export enum AggregateType {
  SUM = 'SUM',
  COUNT = 'COUNT',
  AVG = 'AVG',
  MIN = 'MIN',
  MAX = 'MAX',
}

/**
 * Comparison operators
 */
export enum Operator {
  GT = '>',
  LT = '<',
  GTE = '>=',
  LTE = '<=',
  EQ = '=',
  NEQ = '!=',
  LIKE = '~',
}

/**
 * Select column - can be simple column, wildcard, or aggregate
 */
export type SelectColumn =
  | { type: 'column'; name: string }
  | { type: 'wildcard' }
  | {
      type: 'aggregate';
      function: AggregateType;
      column: string;
      alias?: string;
    };

/**
 * Condition for WHERE, HAVING, ON clauses
 */
export type Condition =
  | {
      type: 'comparison';
      left: string;
      operator: Operator;
      right: string | number;
    }
  | {
      type: 'in';
      column: string;
      values: (string | number)[];
      negated: boolean;
    }
  | {
      type: 'null';
      column: string;
      negated: boolean;
    }
  | {
      type: 'and';
      conditions: Condition[];
    }
  | {
      type: 'or';
      conditions: Condition[];
    }
  | {
      type: 'not';
      condition: Condition;
    };

/**
 * Order direction
 */
export enum OrderDirection {
  ASC = 'ASC',
  DESC = 'DESC',
}

/**
 * Order by clause
 */
export interface OrderBy {
  column: string;
  direction: OrderDirection;
}

/**
 * Join clause
 */
export interface JoinClause {
  type: JoinType;
  table: string;
  on?: Condition;
}

/**
 * FROM clause AST node
 */
export interface FromClause {
  table: string;
}

/**
 * SELECT clause AST node
 */
export interface SelectClause {
  columns: SelectColumn[];
}

/**
 * WHERE clause AST node
 */
export interface WhereClause {
  condition: Condition;
}

/**
 * GROUP BY clause AST node
 */
export interface GroupByClause {
  columns: string[];
}

/**
 * HAVING clause AST node
 */
export interface HavingClause {
  condition: Condition;
}

/**
 * ORDER BY clause AST node
 */
export interface OrderByClause {
  orders: OrderBy[];
}

/**
 * LIMIT clause AST node
 */
export interface LimitClause {
  limit: number;
}

/**
 * OFFSET clause AST node
 */
export interface OffsetClause {
  offset: number;
}

/**
 * Complete query AST
 */
export interface QueryAST {
  from?: FromClause;
  select?: SelectClause;
  joins?: JoinClause[];
  where?: WhereClause;
  groupBy?: GroupByClause;
  having?: HavingClause;
  orderBy?: OrderByClause;
  limit?: LimitClause;
  offset?: OffsetClause;
}
