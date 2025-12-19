/**
 * Migration system types
 *
 * Defines types for database migrations, schema changes,
 * and migration tracking.
 */

import type { Dialect } from '../compiler/types';

/**
 * Column data type
 */
export type ColumnType =
  | 'string'
  | 'text'
  | 'number'
  | 'integer'
  | 'bigint'
  | 'float'
  | 'double'
  | 'decimal'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'timestamp'
  | 'time'
  | 'json'
  | 'jsonb'
  | 'uuid'
  | 'binary'
  | 'blob';

/**
 * Column definition for migrations
 */
export interface ColumnDefinition {
  /**
   * Column name
   */
  name: string;

  /**
   * Column data type
   */
  type: ColumnType;

  /**
   * Is this a primary key?
   */
  primaryKey?: boolean;

  /**
   * Auto-increment (serial/auto_increment)
   */
  autoIncrement?: boolean;

  /**
   * Is this column nullable?
   * @default true
   */
  nullable?: boolean;

  /**
   * Default value
   */
  default?: unknown;

  /**
   * Is this column unique?
   */
  unique?: boolean;

  /**
   * Column-level check constraint
   */
  check?: string;

  /**
   * Foreign key reference
   */
  references?: {
    table: string;
    column: string;
    onDelete?: 'CASCADE' | 'SET NULL' | 'SET DEFAULT' | 'RESTRICT' | 'NO ACTION';
    onUpdate?: 'CASCADE' | 'SET NULL' | 'SET DEFAULT' | 'RESTRICT' | 'NO ACTION';
  };
}

/**
 * Index definition
 */
export interface IndexDefinition {
  /**
   * Index name
   */
  name: string;

  /**
   * Columns in the index
   */
  columns: string[];

  /**
   * Is this a unique index?
   */
  unique?: boolean;

  /**
   * Index type (btree, hash, gin, gist, etc.)
   */
  type?: string;

  /**
   * WHERE clause for partial index
   */
  where?: string;
}

/**
 * Table definition for migrations
 */
export interface TableDefinition {
  /**
   * Table name
   */
  name: string;

  /**
   * Column definitions
   */
  columns: ColumnDefinition[];

  /**
   * Index definitions
   */
  indexes?: IndexDefinition[];

  /**
   * Composite primary key columns
   */
  primaryKey?: string[];

  /**
   * Table-level constraints
   */
  constraints?: string[];
}

/**
 * Migration operation types
 */
export type MigrationOperation =
  | { type: 'createTable'; table: TableDefinition }
  | { type: 'dropTable'; tableName: string }
  | { type: 'renameTable'; from: string; to: string }
  | { type: 'addColumn'; tableName: string; column: ColumnDefinition }
  | { type: 'dropColumn'; tableName: string; columnName: string }
  | { type: 'renameColumn'; tableName: string; from: string; to: string }
  | { type: 'alterColumn'; tableName: string; column: ColumnDefinition }
  | { type: 'createIndex'; tableName: string; index: IndexDefinition }
  | { type: 'dropIndex'; indexName: string }
  | { type: 'addForeignKey'; tableName: string; column: string; references: ColumnDefinition['references'] }
  | { type: 'dropForeignKey'; tableName: string; constraintName: string }
  | { type: 'raw'; sql: string; downSql?: string };

/**
 * Migration definition
 */
export interface Migration {
  /**
   * Unique migration identifier (timestamp + name)
   * @example "20240315120000_create_users_table"
   */
  id: string;

  /**
   * Human-readable name
   */
  name: string;

  /**
   * Timestamp when migration was created
   */
  timestamp: number;

  /**
   * Operations to apply (up)
   */
  up: MigrationOperation[];

  /**
   * Operations to reverse (down)
   */
  down: MigrationOperation[];
}

/**
 * Migration record in the database
 */
export interface MigrationRecord {
  /**
   * Migration ID
   */
  id: string;

  /**
   * Migration name
   */
  name: string;

  /**
   * When the migration was applied
   */
  applied_at: Date;

  /**
   * Checksum of the migration (for detecting modifications)
   */
  checksum?: string;
}

/**
 * Migration runner options
 */
export interface MigrationRunnerOptions {
  /**
   * Directory containing migration files
   */
  migrationsDir?: string;

  /**
   * Table name for tracking migrations
   * @default "_migrations"
   */
  tableName?: string;

  /**
   * SQL dialect
   */
  dialect?: Dialect;

  /**
   * Log migration progress
   * @default true
   */
  verbose?: boolean;
}

/**
 * Migration status
 */
export interface MigrationStatus {
  /**
   * Migration ID
   */
  id: string;

  /**
   * Migration name
   */
  name: string;

  /**
   * Has this migration been applied?
   */
  applied: boolean;

  /**
   * When it was applied (if applied)
   */
  appliedAt?: Date;

  /**
   * Is there a pending change (file modified after apply)?
   */
  pendingChange?: boolean;
}

/**
 * Result of running migrations
 */
export interface MigrationResult {
  /**
   * Migrations that were applied
   */
  applied: string[];

  /**
   * Migrations that were reverted
   */
  reverted: string[];

  /**
   * Any errors that occurred
   */
  errors: Array<{ migration: string; error: Error }>;

  /**
   * Total time taken
   */
  duration: number;
}
