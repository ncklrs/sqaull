/**
 * Token types for sqwind query language
 */
export enum TokenType {
  // SELECT query tokens
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
  // INSERT tokens
  INSERT = 'INSERT',
  COLUMNS = 'COLUMNS',
  VALUES = 'VALUES',
  // UPDATE tokens
  UPDATE = 'UPDATE',
  SET = 'SET',
  // DELETE token
  DELETE = 'DELETE',
  // RETURNING token (for INSERT/UPDATE/DELETE)
  RETURNING = 'RETURNING',
  // Eager loading token
  WITH = 'WITH',
}

/**
 * Statement type - what kind of SQL statement this is
 */
export enum StatementType {
  SELECT = 'SELECT',
  INSERT = 'INSERT',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
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
      right: string | number | boolean;
    }
  | {
      type: 'in';
      column: string;
      values: (string | number | boolean)[];
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
 * INSERT clause AST node
 */
export interface InsertClause {
  table: string;
  columns: string[];
  values: (string | number | boolean | null)[];
}

/**
 * UPDATE SET clause AST node
 */
export interface SetClause {
  assignments: { column: string; value: string | number | boolean | null }[];
}

/**
 * DELETE clause AST node
 */
export interface DeleteClause {
  table: string;
}

/**
 * RETURNING clause AST node
 */
export interface ReturningClause {
  columns: string[] | '*';
}

/**
 * WITH clause AST node (eager loading)
 */
export interface WithClause {
  relations: string[];
}

/**
 * Complete query AST - supports SELECT, INSERT, UPDATE, DELETE
 */
export interface QueryAST {
  /** Statement type */
  type?: StatementType;
  // SELECT clauses
  from?: FromClause;
  select?: SelectClause;
  joins?: JoinClause[];
  where?: WhereClause;
  groupBy?: GroupByClause;
  having?: HavingClause;
  orderBy?: OrderByClause;
  limit?: LimitClause;
  offset?: OffsetClause;
  // INSERT clauses
  insert?: InsertClause;
  // UPDATE clauses
  update?: { table: string };
  set?: SetClause;
  // DELETE clauses
  delete?: DeleteClause;
  // Shared clauses
  returning?: ReturningClause;
  // Eager loading
  with?: WithClause;
}
