/**
 * Lexer for sqwind query language
 *
 * Tokenizes sqwind query strings into tokens for parsing.
 */

import { Token, TokenType } from './types.js';

/**
 * Maps sqwind utility prefixes to token types
 *
 * Supports both classic syntax and Gen Alpha slang (no cap fr fr)
 */
const TOKEN_MAP: Record<string, TokenType> = {
  // ===== CLASSIC SYNTAX =====
  // SELECT tokens
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
  // INSERT tokens
  ins: TokenType.INSERT,
  cols: TokenType.COLUMNS,
  vals: TokenType.VALUES,
  // UPDATE tokens
  upd: TokenType.UPDATE,
  set: TokenType.SET,
  // DELETE token
  del: TokenType.DELETE,
  // RETURNING token
  ret: TokenType.RETURNING,
  // Eager loading token
  with: TokenType.WITH,

  // ===== GEN ALPHA SLANG (bussin fr fr) =====
  // SELECT tokens - main character energy
  main: TokenType.FROM,      // main character table
  slay: TokenType.SELECT,    // slay those columns
  sus: TokenType.WHERE,      // these rows are sus, filter em
  vibe: TokenType.ORDER,     // vibecheck the order
  bet: TokenType.LIMIT,      // bet, only this many
  skip: TokenType.OFFSET,    // skip these (also valid: off)
  squad: TokenType.GROUP,    // squad up by these columns
  tea: TokenType.HAVING,     // spill the tea (having condition)
  link: TokenType.JOIN,      // link up with another table
  match: TokenType.ON,       // matching condition for the link
  // INSERT tokens - no cap
  nocap: TokenType.INSERT,   // no cap, inserting for real
  drip: TokenType.COLUMNS,   // that column drip
  fire: TokenType.VALUES,    // fire values going in
  // UPDATE tokens - glow up
  glow: TokenType.UPDATE,    // glow up those values
  rizz: TokenType.SET,       // rizz up with these assignments
  // DELETE token - yeet into the void
  yeet: TokenType.DELETE,    // yeet this data
  // RETURNING token - flex on em
  flex: TokenType.RETURNING, // flex those results back
  // Eager loading - bring the fam
  fam: TokenType.WITH,       // bring the fam (related data)
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
 * Split input into parts while respecting quoted strings
 * e.g., "whr:name='john doe' sel:id" -> ["whr:name='john doe'", "sel:id"]
 */
function splitPreservingQuotes(input: string): { part: string; position: number }[] {
  const parts: { part: string; position: number }[] = [];
  let current = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let startPosition = 0;
  let foundStart = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    // Track start position of current part (skip leading whitespace)
    if (!foundStart && char !== ' ' && char !== '\t' && char !== '\n') {
      startPosition = i;
      foundStart = true;
    }

    // Handle quote state changes
    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      current += char;
    } else if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      current += char;
    } else if ((char === ' ' || char === '\t' || char === '\n') && !inSingleQuote && !inDoubleQuote) {
      // End of part (whitespace outside quotes)
      if (current.length > 0) {
        parts.push({ part: current, position: startPosition });
        current = '';
        foundStart = false;
      }
    } else {
      current += char;
    }
  }

  // Don't forget the last part
  if (current.length > 0) {
    parts.push({ part: current, position: startPosition });
  }

  return parts;
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
  // Handle edge cases
  if (!input || input.trim().length === 0) {
    return [];
  }

  const tokens: Token[] = [];
  const parts = splitPreservingQuotes(input.trim());

  for (const { part, position } of parts) {
    // Split by colon to get utility and value
    const colonIndex = part.indexOf(':');

    if (colonIndex === -1) {
      throw new LexerError(
        `Invalid syntax: expected utility:value format, got "${part}"`,
        position
      );
    }

    const utility = part.slice(0, colonIndex);
    const value = part.slice(colonIndex + 1);

    if (!value) {
      throw new LexerError(
        `Invalid syntax: utility "${utility}" has no value`,
        position
      );
    }

    const tokenType = TOKEN_MAP[utility];

    if (!tokenType) {
      throw new LexerError(`Unknown utility: "${utility}"`, position);
    }

    tokens.push({
      type: tokenType,
      value,
      position,
      raw: part,
    });
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
