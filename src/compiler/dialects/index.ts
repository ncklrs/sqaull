/**
 * SQL dialect exports
 *
 * This module exports dialect-specific implementations for PostgreSQL, MySQL, and SQLite.
 * Each dialect provides convenience functions and utilities optimized for that database.
 */

// Re-export Dialect enum for convenience
export { Dialect } from '../types';

// PostgreSQL dialect
export {
  compilePostgres,
  pg,
  postgres,
  type PostgresOptions,
} from './postgres';

// MySQL dialect
export {
  compileMySQL,
  mysqlCompile,
  mysql,
  type MySQLOptions,
} from './mysql';

// SQLite dialect
export {
  compileSQLite,
  sqliteCompile,
  sqlite,
  type SQLiteOptions,
} from './sqlite';
