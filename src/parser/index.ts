/**
 * Parser module for sqwind query language
 *
 * This module provides the complete parsing pipeline:
 * 1. Lexer: Tokenizes sqwind query strings
 * 2. Parser: Builds Abstract Syntax Trees (AST) from tokens
 * 3. Types: All TypeScript type definitions
 *
 * @example
 * ```typescript
 * import { lex, parse } from './parser';
 *
 * const query = 'from:users sel:name,email whr:age>18 ord:name lim:10';
 * const tokens = lex(query);
 * const ast = parse(tokens);
 * ```
 */

// Export lexer
export { lex, validateTokens, LexerError } from './lexer.js';

// Export parser
export { parse, ParserError } from './parser.js';

// Export enums (these are both types and values)
export { TokenType, JoinType, AggregateType, Operator, OrderDirection } from './types.js';

// Export type-only exports
export type {
  Token,
  SelectColumn,
  Condition,
  OrderBy,
  JoinClause,
  FromClause,
  SelectClause,
  WhereClause,
  GroupByClause,
  HavingClause,
  OrderByClause,
  LimitClause,
  OffsetClause,
  QueryAST,
} from './types.js';
