/**
 * Lexer for sqwind query language
 *
 * Tokenizes sqwind query strings into tokens for parsing.
 */

import { Token, TokenType } from './types.js';

/**
 * Maps sqwind utility prefixes to token types
 */
const TOKEN_MAP: Record<string, TokenType> = {
  from: TokenType.FROM,
  sel: TokenType.SELECT,
  whr: TokenType.WHERE,
  ord: TokenType.ORDER,
  lim: TokenType.LIMIT,
  off: TokenType.OFFSET,
  grp: TokenType.GROUP,
  hav: TokenType.HAVING,
  join: TokenType.JOIN,
  on: TokenType.ON,
};

/**
 * Lexer error class
 */
export class LexerError extends Error {
  constructor(message: string, public position: number) {
    super(message);
    this.name = 'LexerError';
  }
}

/**
 * Tokenize a sqwind query string into tokens
 *
 * @param input - The sqwind query string to tokenize
 * @returns Array of tokens
 * @throws {LexerError} If input contains invalid syntax
 *
 * @example
 * ```typescript
 * const tokens = lex('from:users sel:name,email whr:age>18');
 * // [
 * //   { type: TokenType.FROM, value: 'users', position: 0, raw: 'from:users' },
 * //   { type: TokenType.SELECT, value: 'name,email', position: 11, raw: 'sel:name,email' },
 * //   { type: TokenType.WHERE, value: 'age>18', position: 26, raw: 'whr:age>18' }
 * // ]
 * ```
 */
export function lex(input: string): Token[] {
  const tokens: Token[] = [];
  const parts = input.trim().split(/\s+/);

  let currentPosition = 0;

  for (const part of parts) {
    // Find the position of this part in the original string
    const partIndex = input.indexOf(part, currentPosition);

    // Split by colon to get utility and value
    const colonIndex = part.indexOf(':');

    if (colonIndex === -1) {
      throw new LexerError(
        `Invalid syntax: expected utility:value format, got "${part}"`,
        partIndex
      );
    }

    const utility = part.slice(0, colonIndex);
    const value = part.slice(colonIndex + 1);

    if (!value) {
      throw new LexerError(
        `Invalid syntax: utility "${utility}" has no value`,
        partIndex
      );
    }

    const tokenType = TOKEN_MAP[utility];

    if (!tokenType) {
      throw new LexerError(`Unknown utility: "${utility}"`, partIndex);
    }

    tokens.push({
      type: tokenType,
      value,
      position: partIndex,
      raw: part,
    });

    currentPosition = partIndex + part.length;
  }

  return tokens;
}

/**
 * Validates that a token list has required tokens
 *
 * @param tokens - Token array to validate
 * @returns True if valid
 * @throws {LexerError} If validation fails
 */
export function validateTokens(tokens: Token[]): boolean {
  if (tokens.length === 0) {
    throw new LexerError('Empty query', 0);
  }

  // A valid query should have at least a FROM or SELECT clause
  const hasFrom = tokens.some((t) => t.type === TokenType.FROM);
  const hasSelect = tokens.some((t) => t.type === TokenType.SELECT);

  if (!hasFrom && !hasSelect) {
    throw new LexerError(
      'Query must contain at least a FROM or SELECT clause',
      0
    );
  }

  return true;
}

export type { Token, TokenType };
