/**
 * Migration system for sqwind
 *
 * Provides database schema migrations with:
 * - Fluent migration builder API
 * - Automatic up/down generation
 * - Multi-dialect SQL generation
 * - Migration tracking and rollback
 *
 * @example
 * ```typescript
 * import { createMigration, createMigrationRunner, createClient, Dialect } from 'sqwind';
 *
 * // Define a migration
 * const createUsersTable = createMigration('create_users_table')
 *   .createTable('users', (table) => {
 *     table.id();
 *     table.string('name').notNull();
 *     table.string('email').notNull().unique();
 *     table.timestamps();
 *   })
 *   .createIndex('users', 'idx_users_email', ['email'], { unique: true })
 *   .build();
 *
 * // Create runner and apply migrations
 * const client = createClient({ dialect: Dialect.POSTGRES, connectionString: '...' });
 * await client.connect();
 *
 * const runner = createMigrationRunner(client.adapter);
 * runner.register(createUsersTable);
 *
 * await runner.init();    // Create migrations table
 * await runner.up();      // Apply pending migrations
 * await runner.down();    // Revert last migration
 * await runner.reset();   // Revert all migrations
 * ```
 */

// Types
export type {
  ColumnType,
  ColumnDefinition,
  IndexDefinition,
  TableDefinition,
  MigrationOperation,
  Migration,
  MigrationRecord,
  MigrationRunnerOptions,
  MigrationStatus,
  MigrationResult,
} from './types';

// SQL Generator
export { generateSQL, generateMigrationSQL } from './sql-generator';

// Builder
export {
  ColumnBuilder,
  TableBuilder,
  MigrationBuilder,
  createMigration,
  defineMigration,
  // Gen Alpha aliases
  glow,
  evolve,
} from './builder';

// Runner
export { MigrationRunner, createMigrationRunner } from './runner';
