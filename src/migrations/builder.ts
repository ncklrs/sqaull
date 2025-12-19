/**
 * Migration builder
 *
 * Fluent API for creating migrations programmatically.
 *
 * @example
 * ```typescript
 * const migration = createMigration('create_users_table')
 *   .createTable('users', (table) => {
 *     table.id();
 *     table.string('name').notNull();
 *     table.string('email').notNull().unique();
 *     table.timestamp('created_at').default('NOW()');
 *   })
 *   .createIndex('users', 'idx_users_email', ['email'], { unique: true })
 *   .build();
 * ```
 */

import type {
  ColumnDefinition,
  ColumnType,
  IndexDefinition,
  Migration,
  MigrationOperation,
  TableDefinition,
} from './types';

/**
 * Column builder for fluent column definitions
 */
export class ColumnBuilder {
  private definition: ColumnDefinition;

  constructor(name: string, type: ColumnType) {
    this.definition = { name, type };
  }

  /**
   * Mark as primary key
   */
  primaryKey(): this {
    this.definition.primaryKey = true;
    return this;
  }

  /**
   * Mark as auto-increment
   */
  autoIncrement(): this {
    this.definition.autoIncrement = true;
    return this;
  }

  /**
   * Mark as not nullable
   */
  notNull(): this {
    this.definition.nullable = false;
    return this;
  }

  /**
   * Mark as nullable
   */
  nullable(): this {
    this.definition.nullable = true;
    return this;
  }

  /**
   * Set default value
   */
  default(value: unknown): this {
    this.definition.default = value;
    return this;
  }

  /**
   * Mark as unique
   */
  unique(): this {
    this.definition.unique = true;
    return this;
  }

  /**
   * Add check constraint
   */
  check(constraint: string): this {
    this.definition.check = constraint;
    return this;
  }

  /**
   * Add foreign key reference
   */
  references(
    table: string,
    column: string = 'id',
    options?: { onDelete?: NonNullable<ColumnDefinition['references']>['onDelete']; onUpdate?: NonNullable<ColumnDefinition['references']>['onUpdate'] }
  ): this {
    this.definition.references = {
      table,
      column,
      onDelete: options?.onDelete,
      onUpdate: options?.onUpdate,
    };
    return this;
  }

  /**
   * Get the column definition
   */
  build(): ColumnDefinition {
    return this.definition;
  }
}

/**
 * Table builder for fluent table definitions
 */
export class TableBuilder {
  private columns: ColumnDefinition[] = [];
  private indexes: IndexDefinition[] = [];
  private _primaryKey?: string[];

  /**
   * Add an auto-increment primary key column (id)
   */
  id(name: string = 'id'): ColumnBuilder {
    const builder = new ColumnBuilder(name, 'integer')
      .primaryKey()
      .autoIncrement()
      .notNull();
    this.columns.push(builder.build());
    return builder;
  }

  /**
   * Add a UUID primary key column
   */
  uuid(name: string = 'id'): ColumnBuilder {
    const builder = new ColumnBuilder(name, 'uuid').primaryKey().notNull();
    this.columns.push(builder.build());
    return builder;
  }

  /**
   * Add a bigint auto-increment primary key
   */
  bigId(name: string = 'id'): ColumnBuilder {
    const builder = new ColumnBuilder(name, 'bigint')
      .primaryKey()
      .autoIncrement()
      .notNull();
    this.columns.push(builder.build());
    return builder;
  }

  /**
   * Add a string column (VARCHAR)
   */
  string(name: string): ColumnBuilder {
    const builder = new ColumnBuilder(name, 'string');
    this.columns.push(builder.build());
    return builder;
  }

  /**
   * Add a text column
   */
  text(name: string): ColumnBuilder {
    const builder = new ColumnBuilder(name, 'text');
    this.columns.push(builder.build());
    return builder;
  }

  /**
   * Add an integer column
   */
  integer(name: string): ColumnBuilder {
    const builder = new ColumnBuilder(name, 'integer');
    this.columns.push(builder.build());
    return builder;
  }

  /**
   * Add a bigint column
   */
  bigint(name: string): ColumnBuilder {
    const builder = new ColumnBuilder(name, 'bigint');
    this.columns.push(builder.build());
    return builder;
  }

  /**
   * Add a float column
   */
  float(name: string): ColumnBuilder {
    const builder = new ColumnBuilder(name, 'float');
    this.columns.push(builder.build());
    return builder;
  }

  /**
   * Add a double column
   */
  double(name: string): ColumnBuilder {
    const builder = new ColumnBuilder(name, 'double');
    this.columns.push(builder.build());
    return builder;
  }

  /**
   * Add a decimal column
   */
  decimal(name: string): ColumnBuilder {
    const builder = new ColumnBuilder(name, 'decimal');
    this.columns.push(builder.build());
    return builder;
  }

  /**
   * Add a boolean column
   */
  boolean(name: string): ColumnBuilder {
    const builder = new ColumnBuilder(name, 'boolean');
    this.columns.push(builder.build());
    return builder;
  }

  /**
   * Add a date column
   */
  date(name: string): ColumnBuilder {
    const builder = new ColumnBuilder(name, 'date');
    this.columns.push(builder.build());
    return builder;
  }

  /**
   * Add a datetime column
   */
  datetime(name: string): ColumnBuilder {
    const builder = new ColumnBuilder(name, 'datetime');
    this.columns.push(builder.build());
    return builder;
  }

  /**
   * Add a timestamp column
   */
  timestamp(name: string): ColumnBuilder {
    const builder = new ColumnBuilder(name, 'timestamp');
    this.columns.push(builder.build());
    return builder;
  }

  /**
   * Add a time column
   */
  time(name: string): ColumnBuilder {
    const builder = new ColumnBuilder(name, 'time');
    this.columns.push(builder.build());
    return builder;
  }

  /**
   * Add a JSON column
   */
  json(name: string): ColumnBuilder {
    const builder = new ColumnBuilder(name, 'json');
    this.columns.push(builder.build());
    return builder;
  }

  /**
   * Add a JSONB column (PostgreSQL)
   */
  jsonb(name: string): ColumnBuilder {
    const builder = new ColumnBuilder(name, 'jsonb');
    this.columns.push(builder.build());
    return builder;
  }

  /**
   * Add a binary/blob column
   */
  binary(name: string): ColumnBuilder {
    const builder = new ColumnBuilder(name, 'binary');
    this.columns.push(builder.build());
    return builder;
  }

  /**
   * Add created_at and updated_at timestamp columns
   */
  timestamps(): this {
    this.timestamp('created_at').notNull().default('NOW()');
    this.timestamp('updated_at').notNull().default('NOW()');
    return this;
  }

  /**
   * Add a soft delete column (deleted_at)
   */
  softDeletes(): this {
    this.timestamp('deleted_at').nullable();
    return this;
  }

  /**
   * Add a foreign key column
   */
  foreignKey(
    name: string,
    references: { table: string; column?: string; onDelete?: NonNullable<ColumnDefinition['references']>['onDelete'] }
  ): ColumnBuilder {
    const builder = new ColumnBuilder(name, 'integer')
      .notNull()
      .references(references.table, references.column || 'id', {
        onDelete: references.onDelete,
      });
    this.columns.push(builder.build());
    return builder;
  }

  /**
   * Set composite primary key
   */
  primaryKey(...columns: string[]): this {
    this._primaryKey = columns;
    return this;
  }

  /**
   * Add an index
   */
  index(name: string, columns: string[], options?: { unique?: boolean }): this {
    this.indexes.push({
      name,
      columns,
      unique: options?.unique,
    });
    return this;
  }

  /**
   * Build the table definition
   */
  build(tableName: string): TableDefinition {
    return {
      name: tableName,
      columns: this.columns,
      indexes: this.indexes.length > 0 ? this.indexes : undefined,
      primaryKey: this._primaryKey,
    };
  }
}

/**
 * Migration builder for fluent migration definitions
 */
export class MigrationBuilder {
  private name: string;
  private timestamp: number;
  private upOperations: MigrationOperation[] = [];
  private downOperations: MigrationOperation[] = [];

  constructor(name: string, timestamp?: number) {
    this.name = name;
    this.timestamp = timestamp || Date.now();
  }

  /**
   * Create a table
   */
  createTable(tableName: string, callback: (table: TableBuilder) => void): this {
    const builder = new TableBuilder();
    callback(builder);
    const table = builder.build(tableName);

    this.upOperations.push({ type: 'createTable', table });
    this.downOperations.unshift({ type: 'dropTable', tableName });

    return this;
  }

  /**
   * Drop a table
   */
  dropTable(tableName: string, recreateCallback?: (table: TableBuilder) => void): this {
    this.upOperations.push({ type: 'dropTable', tableName });

    if (recreateCallback) {
      const builder = new TableBuilder();
      recreateCallback(builder);
      const table = builder.build(tableName);
      this.downOperations.unshift({ type: 'createTable', table });
    }

    return this;
  }

  /**
   * Rename a table
   */
  renameTable(from: string, to: string): this {
    this.upOperations.push({ type: 'renameTable', from, to });
    this.downOperations.unshift({ type: 'renameTable', from: to, to: from });
    return this;
  }

  /**
   * Add a column
   */
  addColumn(
    tableName: string,
    columnName: string,
    type: ColumnType,
    callback?: (column: ColumnBuilder) => void
  ): this {
    const builder = new ColumnBuilder(columnName, type);
    if (callback) {
      callback(builder);
    }
    const column = builder.build();

    this.upOperations.push({ type: 'addColumn', tableName, column });
    this.downOperations.unshift({ type: 'dropColumn', tableName, columnName });

    return this;
  }

  /**
   * Drop a column
   */
  dropColumn(
    tableName: string,
    columnName: string,
    recreate?: { type: ColumnType; callback?: (column: ColumnBuilder) => void }
  ): this {
    this.upOperations.push({ type: 'dropColumn', tableName, columnName });

    if (recreate) {
      const builder = new ColumnBuilder(columnName, recreate.type);
      if (recreate.callback) {
        recreate.callback(builder);
      }
      this.downOperations.unshift({
        type: 'addColumn',
        tableName,
        column: builder.build(),
      });
    }

    return this;
  }

  /**
   * Rename a column
   */
  renameColumn(tableName: string, from: string, to: string): this {
    this.upOperations.push({ type: 'renameColumn', tableName, from, to });
    this.downOperations.unshift({ type: 'renameColumn', tableName, from: to, to: from });
    return this;
  }

  /**
   * Alter a column
   */
  alterColumn(
    tableName: string,
    columnName: string,
    type: ColumnType,
    callback?: (column: ColumnBuilder) => void
  ): this {
    const builder = new ColumnBuilder(columnName, type);
    if (callback) {
      callback(builder);
    }

    this.upOperations.push({
      type: 'alterColumn',
      tableName,
      column: builder.build(),
    });
    // Note: down operation for alterColumn requires knowing the original definition
    // which we don't have here - user should provide manually if needed

    return this;
  }

  /**
   * Create an index
   */
  createIndex(
    tableName: string,
    indexName: string,
    columns: string[],
    options?: { unique?: boolean; where?: string }
  ): this {
    this.upOperations.push({
      type: 'createIndex',
      tableName,
      index: {
        name: indexName,
        columns,
        unique: options?.unique,
        where: options?.where,
      },
    });
    this.downOperations.unshift({ type: 'dropIndex', indexName });

    return this;
  }

  /**
   * Drop an index
   */
  dropIndex(indexName: string): this {
    this.upOperations.push({ type: 'dropIndex', indexName });
    return this;
  }

  /**
   * Add a foreign key
   */
  addForeignKey(
    tableName: string,
    column: string,
    references: NonNullable<ColumnDefinition['references']>
  ): this {
    this.upOperations.push({
      type: 'addForeignKey',
      tableName,
      column,
      references,
    });
    this.downOperations.unshift({
      type: 'dropForeignKey',
      tableName,
      constraintName: `fk_${tableName}_${column}`,
    });

    return this;
  }

  /**
   * Add raw SQL
   */
  raw(sql: string, downSql?: string): this {
    this.upOperations.push({ type: 'raw', sql, downSql });
    if (downSql) {
      this.downOperations.unshift({ type: 'raw', sql: downSql });
    }
    return this;
  }

  /**
   * Build the migration
   */
  build(): Migration {
    const id = `${this.timestamp}_${this.name.replace(/\s+/g, '_').toLowerCase()}`;

    return {
      id,
      name: this.name,
      timestamp: this.timestamp,
      up: this.upOperations,
      down: this.downOperations,
    };
  }
}

/**
 * Create a new migration builder
 */
export function createMigration(name: string, timestamp?: number): MigrationBuilder {
  return new MigrationBuilder(name, timestamp);
}

/**
 * Create a migration from up/down functions (Drizzle-style)
 */
export function defineMigration(config: {
  name: string;
  timestamp?: number;
  up: (builder: MigrationBuilder) => void;
  down?: (builder: MigrationBuilder) => void;
}): Migration {
  const builder = new MigrationBuilder(config.name, config.timestamp);
  config.up(builder);
  return builder.build();
}

// Gen Alpha aliases (bussin migration building fr fr)
export const glow = createMigration;  // Glow up your schema
export const evolve = defineMigration; // Evolution arc for your DB
