/**
 * Compiler types and options
 */

/**
 * SQL dialect types
 */
export enum Dialect {
  POSTGRES = 'postgres',
  MYSQL = 'mysql',
  SQLITE = 'sqlite',
  GENERIC = 'generic',
}

/**
 * Compiler options for customizing SQL generation
 */
export interface CompilerOptions {
  /**
   * SQL dialect to target
   * @default Dialect.POSTGRES
   */
  dialect?: Dialect;

  /**
   * Whether to use parameterized queries
   * @default true
   */
  parameterize?: boolean;

  /**
   * Parameter placeholder style
   * - postgres: $1, $2, $3
   * - mysql: ?, ?, ?
   * - sqlite: ?, ?, ?
   * @default 'auto' (based on dialect)
   */
  placeholderStyle?: 'postgres' | 'mysql' | 'sqlite' | 'auto';

  /**
   * Pretty print SQL with newlines and indentation
   * @default false
   */
  pretty?: boolean;

  /**
   * Quote identifiers (table/column names)
   * @default false
   */
  quoteIdentifiers?: boolean;

  /**
   * Case style for SQL keywords
   * @default 'upper'
   */
  keywordCase?: 'upper' | 'lower';

  /**
   * Custom table prefix
   */
  tablePrefix?: string;
}

/**
 * Result of SQL compilation
 */
export interface CompiledQuery {
  /**
   * The compiled SQL string
   */
  sql: string;

  /**
   * Parameter values for parameterized queries
   */
  params: unknown[];
}

/**
 * Internal compilation context
 */
export interface CompilerContext {
  dialect: Dialect;
  parameterized: boolean;
  quoteIdentifiers: boolean;
  keywordCase: 'upper' | 'lower';
  tablePrefix: string;
  params: unknown[];
  paramIndex: number;
  placeholderStyle: 'postgres' | 'mysql' | 'sqlite';
}

/**
 * Get parameter placeholder for a dialect
 */
export function getPlaceholder(style: 'postgres' | 'mysql' | 'sqlite', index: number): string {
  switch (style) {
    case 'postgres':
      return `$${index}`;
    case 'mysql':
    case 'sqlite':
      return '?';
  }
}

/**
 * Quote an identifier based on dialect
 */
export function quoteIdentifier(identifier: string, dialect: Dialect): string {
  switch (dialect) {
    case Dialect.POSTGRES:
    case Dialect.SQLITE:
      return `"${identifier}"`;
    case Dialect.MYSQL:
      return `\`${identifier}\``;
    case Dialect.GENERIC:
      return identifier;
  }
}

/**
 * Format keyword based on case preference
 */
export function formatKeyword(keyword: string, keywordCase: 'upper' | 'lower'): string {
  return keywordCase === 'upper' ? keyword.toUpperCase() : keyword.toLowerCase();
}
