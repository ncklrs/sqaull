/**
 * Database adapters for sqwind
 *
 * Each adapter wraps a specific database driver:
 * - PostgreSQL: uses `pg` package
 * - MySQL: uses `mysql2` package
 * - SQLite: uses `better-sqlite3` package
 *
 * Install the driver for your database as a peer dependency.
 */

export { PostgresAdapter, createPostgresAdapter } from './postgres';
export { MySQLAdapter, createMySQLAdapter } from './mysql';
export { SQLiteAdapter, createSQLiteAdapter } from './sqlite';
