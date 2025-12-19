/**
 * Migration runner
 *
 * Handles applying and reverting database migrations.
 */

import type { DatabaseAdapter } from '../db/types';
import { Dialect } from '../compiler/types';
import { generateSQL } from './sql-generator';
import type {
  Migration,
  MigrationRecord,
  MigrationResult,
  MigrationRunnerOptions,
  MigrationStatus,
} from './types';

/**
 * Default migrations table name
 */
const DEFAULT_TABLE_NAME = '_migrations';

/**
 * Migration runner
 *
 * Manages database migrations with up/down operations,
 * tracking applied migrations in a database table.
 */
export class MigrationRunner {
  private adapter: DatabaseAdapter;
  private options: Required<MigrationRunnerOptions>;
  private migrations: Migration[] = [];

  constructor(adapter: DatabaseAdapter, options: MigrationRunnerOptions = {}) {
    this.adapter = adapter;
    this.options = {
      migrationsDir: options.migrationsDir || './migrations',
      tableName: options.tableName || DEFAULT_TABLE_NAME,
      dialect: options.dialect || adapter.dialect,
      verbose: options.verbose ?? true,
    };
  }

  /**
   * Initialize the migrations table
   */
  async init(): Promise<void> {
    const createTableSQL = this.getCreateMigrationsTableSQL();
    await this.adapter.raw(createTableSQL);
    this.log('Migrations table initialized');
  }

  /**
   * Register a migration
   */
  register(migration: Migration): this {
    this.migrations.push(migration);
    // Sort by timestamp
    this.migrations.sort((a, b) => a.timestamp - b.timestamp);
    return this;
  }

  /**
   * Register multiple migrations
   */
  registerAll(migrations: Migration[]): this {
    for (const migration of migrations) {
      this.register(migration);
    }
    return this;
  }

  /**
   * Get all registered migrations
   */
  getMigrations(): Migration[] {
    return [...this.migrations];
  }

  /**
   * Get migration status
   */
  async status(): Promise<MigrationStatus[]> {
    const applied = await this.getAppliedMigrations();
    const appliedMap = new Map(applied.map((m) => [m.id, m]));

    return this.migrations.map((migration) => {
      const record = appliedMap.get(migration.id);
      return {
        id: migration.id,
        name: migration.name,
        applied: !!record,
        appliedAt: record?.applied_at,
      };
    });
  }

  /**
   * Get pending migrations
   */
  async pending(): Promise<Migration[]> {
    const applied = await this.getAppliedMigrations();
    const appliedIds = new Set(applied.map((m) => m.id));
    return this.migrations.filter((m) => !appliedIds.has(m.id));
  }

  /**
   * Run all pending migrations
   */
  async up(): Promise<MigrationResult> {
    const startTime = Date.now();
    const result: MigrationResult = {
      applied: [],
      reverted: [],
      errors: [],
      duration: 0,
    };

    const pending = await this.pending();

    if (pending.length === 0) {
      this.log('No pending migrations');
      result.duration = Date.now() - startTime;
      return result;
    }

    this.log(`Running ${pending.length} migration(s)...`);

    for (const migration of pending) {
      try {
        await this.runMigration(migration, 'up');
        result.applied.push(migration.id);
        this.log(`✓ Applied: ${migration.name}`);
      } catch (error) {
        result.errors.push({
          migration: migration.id,
          error: error instanceof Error ? error : new Error(String(error)),
        });
        this.log(`✗ Failed: ${migration.name} - ${error}`);
        break; // Stop on first error
      }
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Run a specific migration up
   */
  async upTo(migrationId: string): Promise<MigrationResult> {
    const startTime = Date.now();
    const result: MigrationResult = {
      applied: [],
      reverted: [],
      errors: [],
      duration: 0,
    };

    const pending = await this.pending();
    const targetIndex = pending.findIndex((m) => m.id === migrationId);

    if (targetIndex === -1) {
      const migration = this.migrations.find((m) => m.id === migrationId);
      if (migration) {
        this.log(`Migration ${migrationId} is already applied`);
      } else {
        throw new Error(`Migration not found: ${migrationId}`);
      }
      result.duration = Date.now() - startTime;
      return result;
    }

    const toApply = pending.slice(0, targetIndex + 1);

    for (const migration of toApply) {
      try {
        await this.runMigration(migration, 'up');
        result.applied.push(migration.id);
        this.log(`✓ Applied: ${migration.name}`);
      } catch (error) {
        result.errors.push({
          migration: migration.id,
          error: error instanceof Error ? error : new Error(String(error)),
        });
        this.log(`✗ Failed: ${migration.name}`);
        break;
      }
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Revert the last applied migration
   */
  async down(): Promise<MigrationResult> {
    const startTime = Date.now();
    const result: MigrationResult = {
      applied: [],
      reverted: [],
      errors: [],
      duration: 0,
    };

    const applied = await this.getAppliedMigrations();

    if (applied.length === 0) {
      this.log('No migrations to revert');
      result.duration = Date.now() - startTime;
      return result;
    }

    // Get the last applied migration
    const lastRecord = applied[applied.length - 1];
    const migration = this.migrations.find((m) => m.id === lastRecord.id);

    if (!migration) {
      throw new Error(`Migration not found: ${lastRecord.id}`);
    }

    try {
      await this.runMigration(migration, 'down');
      result.reverted.push(migration.id);
      this.log(`✓ Reverted: ${migration.name}`);
    } catch (error) {
      result.errors.push({
        migration: migration.id,
        error: error instanceof Error ? error : new Error(String(error)),
      });
      this.log(`✗ Failed to revert: ${migration.name}`);
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Revert all migrations
   */
  async reset(): Promise<MigrationResult> {
    const startTime = Date.now();
    const result: MigrationResult = {
      applied: [],
      reverted: [],
      errors: [],
      duration: 0,
    };

    const applied = await this.getAppliedMigrations();

    if (applied.length === 0) {
      this.log('No migrations to revert');
      result.duration = Date.now() - startTime;
      return result;
    }

    this.log(`Reverting ${applied.length} migration(s)...`);

    // Revert in reverse order
    for (const record of [...applied].reverse()) {
      const migration = this.migrations.find((m) => m.id === record.id);

      if (!migration) {
        this.log(`⚠ Migration not found: ${record.id}, skipping`);
        continue;
      }

      try {
        await this.runMigration(migration, 'down');
        result.reverted.push(migration.id);
        this.log(`✓ Reverted: ${migration.name}`);
      } catch (error) {
        result.errors.push({
          migration: migration.id,
          error: error instanceof Error ? error : new Error(String(error)),
        });
        this.log(`✗ Failed to revert: ${migration.name}`);
        break;
      }
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Run a specific migration in a direction
   */
  private async runMigration(migration: Migration, direction: 'up' | 'down'): Promise<void> {
    const operations = direction === 'up' ? migration.up : migration.down;

    // Start transaction
    const tx = await this.adapter.beginTransaction();

    try {
      for (const operation of operations) {
        const sql = generateSQL(operation, this.options.dialect);
        await tx.execute(sql);
      }

      // Update migrations table
      if (direction === 'up') {
        await this.recordMigration(migration, tx);
      } else {
        await this.removeMigrationRecord(migration.id, tx);
      }

      await tx.commit();
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  }

  /**
   * Record a migration as applied
   */
  private async recordMigration(
    migration: Migration,
    tx?: { execute: (sql: string, params?: unknown[]) => Promise<unknown> }
  ): Promise<void> {
    const executor = tx || this.adapter;
    const sql = this.getInsertMigrationSQL();
    await executor.execute(sql, [migration.id, migration.name, new Date()]);
  }

  /**
   * Remove a migration record
   */
  private async removeMigrationRecord(
    migrationId: string,
    tx?: { execute: (sql: string, params?: unknown[]) => Promise<unknown> }
  ): Promise<void> {
    const executor = tx || this.adapter;
    const placeholder = this.getPlaceholder(1);
    const sql = `DELETE FROM ${this.options.tableName} WHERE id = ${placeholder}`;
    await executor.execute(sql, [migrationId]);
  }

  /**
   * Get applied migrations from the database
   */
  private async getAppliedMigrations(): Promise<MigrationRecord[]> {
    try {
      const sql = `SELECT id, name, applied_at FROM ${this.options.tableName} ORDER BY applied_at ASC`;
      const result = await this.adapter.execute<MigrationRecord>(sql);
      return result.rows;
    } catch {
      // Table might not exist yet
      return [];
    }
  }

  /**
   * Get SQL for creating migrations table
   */
  private getCreateMigrationsTableSQL(): string {
    const table = this.options.tableName;

    switch (this.options.dialect) {
      case Dialect.POSTGRES:
        return `
          CREATE TABLE IF NOT EXISTS ${table} (
            id VARCHAR(255) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
          )
        `;
      case Dialect.MYSQL:
        return `
          CREATE TABLE IF NOT EXISTS ${table} (
            id VARCHAR(255) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        `;
      case Dialect.SQLITE:
        return `
          CREATE TABLE IF NOT EXISTS ${table} (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            applied_at TEXT NOT NULL DEFAULT (datetime('now'))
          )
        `;
      default:
        return `
          CREATE TABLE IF NOT EXISTS ${table} (
            id VARCHAR(255) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            applied_at TIMESTAMP NOT NULL
          )
        `;
    }
  }

  /**
   * Get SQL for inserting migration record
   */
  private getInsertMigrationSQL(): string {
    const table = this.options.tableName;
    const p1 = this.getPlaceholder(1);
    const p2 = this.getPlaceholder(2);
    const p3 = this.getPlaceholder(3);
    return `INSERT INTO ${table} (id, name, applied_at) VALUES (${p1}, ${p2}, ${p3})`;
  }

  /**
   * Get placeholder for dialect
   */
  private getPlaceholder(index: number): string {
    switch (this.options.dialect) {
      case Dialect.POSTGRES:
        return `$${index}`;
      case Dialect.MYSQL:
      case Dialect.SQLITE:
      default:
        return '?';
    }
  }

  /**
   * Log a message if verbose mode is enabled
   */
  private log(message: string): void {
    if (this.options.verbose) {
      console.log(`[migrations] ${message}`);
    }
  }
}

/**
 * Create a migration runner
 */
export function createMigrationRunner(
  adapter: DatabaseAdapter,
  options?: MigrationRunnerOptions
): MigrationRunner {
  return new MigrationRunner(adapter, options);
}
