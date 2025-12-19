/**
 * SQL Generator for migrations
 *
 * Converts migration operations into SQL statements for different dialects.
 */

import { Dialect } from '../compiler/types';
import type {
  ColumnDefinition,
  ColumnType,
  IndexDefinition,
  MigrationOperation,
  TableDefinition,
} from './types';

/**
 * Generate SQL for a migration operation
 */
export function generateSQL(
  operation: MigrationOperation,
  dialect: Dialect = Dialect.POSTGRES
): string {
  switch (operation.type) {
    case 'createTable':
      return generateCreateTable(operation.table, dialect);
    case 'dropTable':
      return generateDropTable(operation.tableName, dialect);
    case 'renameTable':
      return generateRenameTable(operation.from, operation.to, dialect);
    case 'addColumn':
      return generateAddColumn(operation.tableName, operation.column, dialect);
    case 'dropColumn':
      return generateDropColumn(operation.tableName, operation.columnName, dialect);
    case 'renameColumn':
      return generateRenameColumn(operation.tableName, operation.from, operation.to, dialect);
    case 'alterColumn':
      return generateAlterColumn(operation.tableName, operation.column, dialect);
    case 'createIndex':
      return generateCreateIndex(operation.tableName, operation.index, dialect);
    case 'dropIndex':
      return generateDropIndex(operation.indexName, dialect);
    case 'addForeignKey':
      return generateAddForeignKey(
        operation.tableName,
        operation.column,
        operation.references!,
        dialect
      );
    case 'dropForeignKey':
      return generateDropForeignKey(operation.tableName, operation.constraintName, dialect);
    case 'raw':
      return operation.sql;
    default:
      throw new Error(`Unknown migration operation type`);
  }
}

/**
 * Map sqwind column types to SQL types
 */
function mapColumnType(type: ColumnType, dialect: Dialect): string {
  const typeMap: Record<ColumnType, Record<Dialect, string>> = {
    string: {
      [Dialect.POSTGRES]: 'VARCHAR(255)',
      [Dialect.MYSQL]: 'VARCHAR(255)',
      [Dialect.SQLITE]: 'TEXT',
      [Dialect.GENERIC]: 'VARCHAR(255)',
    },
    text: {
      [Dialect.POSTGRES]: 'TEXT',
      [Dialect.MYSQL]: 'TEXT',
      [Dialect.SQLITE]: 'TEXT',
      [Dialect.GENERIC]: 'TEXT',
    },
    number: {
      [Dialect.POSTGRES]: 'INTEGER',
      [Dialect.MYSQL]: 'INT',
      [Dialect.SQLITE]: 'INTEGER',
      [Dialect.GENERIC]: 'INTEGER',
    },
    integer: {
      [Dialect.POSTGRES]: 'INTEGER',
      [Dialect.MYSQL]: 'INT',
      [Dialect.SQLITE]: 'INTEGER',
      [Dialect.GENERIC]: 'INTEGER',
    },
    bigint: {
      [Dialect.POSTGRES]: 'BIGINT',
      [Dialect.MYSQL]: 'BIGINT',
      [Dialect.SQLITE]: 'INTEGER',
      [Dialect.GENERIC]: 'BIGINT',
    },
    float: {
      [Dialect.POSTGRES]: 'REAL',
      [Dialect.MYSQL]: 'FLOAT',
      [Dialect.SQLITE]: 'REAL',
      [Dialect.GENERIC]: 'FLOAT',
    },
    double: {
      [Dialect.POSTGRES]: 'DOUBLE PRECISION',
      [Dialect.MYSQL]: 'DOUBLE',
      [Dialect.SQLITE]: 'REAL',
      [Dialect.GENERIC]: 'DOUBLE',
    },
    decimal: {
      [Dialect.POSTGRES]: 'DECIMAL',
      [Dialect.MYSQL]: 'DECIMAL',
      [Dialect.SQLITE]: 'REAL',
      [Dialect.GENERIC]: 'DECIMAL',
    },
    boolean: {
      [Dialect.POSTGRES]: 'BOOLEAN',
      [Dialect.MYSQL]: 'TINYINT(1)',
      [Dialect.SQLITE]: 'INTEGER',
      [Dialect.GENERIC]: 'BOOLEAN',
    },
    date: {
      [Dialect.POSTGRES]: 'DATE',
      [Dialect.MYSQL]: 'DATE',
      [Dialect.SQLITE]: 'TEXT',
      [Dialect.GENERIC]: 'DATE',
    },
    datetime: {
      [Dialect.POSTGRES]: 'TIMESTAMP',
      [Dialect.MYSQL]: 'DATETIME',
      [Dialect.SQLITE]: 'TEXT',
      [Dialect.GENERIC]: 'DATETIME',
    },
    timestamp: {
      [Dialect.POSTGRES]: 'TIMESTAMP WITH TIME ZONE',
      [Dialect.MYSQL]: 'TIMESTAMP',
      [Dialect.SQLITE]: 'TEXT',
      [Dialect.GENERIC]: 'TIMESTAMP',
    },
    time: {
      [Dialect.POSTGRES]: 'TIME',
      [Dialect.MYSQL]: 'TIME',
      [Dialect.SQLITE]: 'TEXT',
      [Dialect.GENERIC]: 'TIME',
    },
    json: {
      [Dialect.POSTGRES]: 'JSON',
      [Dialect.MYSQL]: 'JSON',
      [Dialect.SQLITE]: 'TEXT',
      [Dialect.GENERIC]: 'JSON',
    },
    jsonb: {
      [Dialect.POSTGRES]: 'JSONB',
      [Dialect.MYSQL]: 'JSON',
      [Dialect.SQLITE]: 'TEXT',
      [Dialect.GENERIC]: 'JSON',
    },
    uuid: {
      [Dialect.POSTGRES]: 'UUID',
      [Dialect.MYSQL]: 'CHAR(36)',
      [Dialect.SQLITE]: 'TEXT',
      [Dialect.GENERIC]: 'UUID',
    },
    binary: {
      [Dialect.POSTGRES]: 'BYTEA',
      [Dialect.MYSQL]: 'BLOB',
      [Dialect.SQLITE]: 'BLOB',
      [Dialect.GENERIC]: 'BLOB',
    },
    blob: {
      [Dialect.POSTGRES]: 'BYTEA',
      [Dialect.MYSQL]: 'LONGBLOB',
      [Dialect.SQLITE]: 'BLOB',
      [Dialect.GENERIC]: 'BLOB',
    },
  };

  return typeMap[type]?.[dialect] || typeMap[type]?.[Dialect.GENERIC] || 'TEXT';
}

/**
 * Generate column definition SQL
 */
function generateColumnDef(column: ColumnDefinition, dialect: Dialect): string {
  const parts: string[] = [column.name];

  // Handle auto-increment types
  if (column.autoIncrement) {
    switch (dialect) {
      case Dialect.POSTGRES:
        parts.push(column.type === 'bigint' ? 'BIGSERIAL' : 'SERIAL');
        break;
      case Dialect.MYSQL:
        parts.push(mapColumnType(column.type, dialect), 'AUTO_INCREMENT');
        break;
      case Dialect.SQLITE:
        parts.push('INTEGER');
        break;
      default:
        parts.push(mapColumnType(column.type, dialect));
    }
  } else {
    parts.push(mapColumnType(column.type, dialect));
  }

  // Primary key (inline for SQLite)
  if (column.primaryKey && dialect === Dialect.SQLITE) {
    parts.push('PRIMARY KEY');
  }

  // Nullable
  if (column.nullable === false) {
    parts.push('NOT NULL');
  }

  // Default value
  if (column.default !== undefined) {
    const defaultVal = formatDefaultValue(column.default, column.type, dialect);
    parts.push(`DEFAULT ${defaultVal}`);
  }

  // Unique
  if (column.unique) {
    parts.push('UNIQUE');
  }

  // Check constraint
  if (column.check) {
    parts.push(`CHECK (${column.check})`);
  }

  return parts.join(' ');
}

/**
 * Format a default value for SQL
 */
function formatDefaultValue(value: unknown, _type: ColumnType, dialect: Dialect): string {
  if (value === null) return 'NULL';

  // Handle special default values
  if (typeof value === 'string') {
    if (value.toUpperCase() === 'NOW()' || value.toUpperCase() === 'CURRENT_TIMESTAMP') {
      switch (dialect) {
        case Dialect.POSTGRES:
          return 'NOW()';
        case Dialect.MYSQL:
          return 'CURRENT_TIMESTAMP';
        case Dialect.SQLITE:
          return "datetime('now')";
        default:
          return 'CURRENT_TIMESTAMP';
      }
    }

    // String literal
    return `'${value.replace(/'/g, "''")}'`;
  }

  if (typeof value === 'boolean') {
    switch (dialect) {
      case Dialect.POSTGRES:
        return value ? 'TRUE' : 'FALSE';
      case Dialect.MYSQL:
      case Dialect.SQLITE:
        return value ? '1' : '0';
      default:
        return value ? 'TRUE' : 'FALSE';
    }
  }

  return String(value);
}

/**
 * Generate CREATE TABLE SQL
 */
function generateCreateTable(table: TableDefinition, dialect: Dialect): string {
  const columnDefs = table.columns.map((col) => generateColumnDef(col, dialect));

  // Add primary key constraint if not inline
  if (dialect !== Dialect.SQLITE) {
    const pkColumns = table.primaryKey || table.columns.filter((c) => c.primaryKey).map((c) => c.name);
    if (pkColumns.length > 0) {
      columnDefs.push(`PRIMARY KEY (${pkColumns.join(', ')})`);
    }
  }

  // Add foreign key constraints
  for (const column of table.columns) {
    if (column.references) {
      const fkDef = generateForeignKeyConstraint(column.name, column.references, dialect);
      columnDefs.push(fkDef);
    }
  }

  // Add table constraints
  if (table.constraints) {
    columnDefs.push(...table.constraints);
  }

  const sql = `CREATE TABLE ${table.name} (\n  ${columnDefs.join(',\n  ')}\n)`;

  return sql;
}

/**
 * Generate foreign key constraint SQL
 */
function generateForeignKeyConstraint(
  column: string,
  references: NonNullable<ColumnDefinition['references']>,
  _dialect: Dialect
): string {
  let sql = `FOREIGN KEY (${column}) REFERENCES ${references.table}(${references.column})`;

  if (references.onDelete) {
    sql += ` ON DELETE ${references.onDelete}`;
  }
  if (references.onUpdate) {
    sql += ` ON UPDATE ${references.onUpdate}`;
  }

  return sql;
}

/**
 * Generate DROP TABLE SQL
 */
function generateDropTable(tableName: string, _dialect: Dialect): string {
  return `DROP TABLE IF EXISTS ${tableName}`;
}

/**
 * Generate RENAME TABLE SQL
 */
function generateRenameTable(from: string, to: string, dialect: Dialect): string {
  switch (dialect) {
    case Dialect.POSTGRES:
      return `ALTER TABLE ${from} RENAME TO ${to}`;
    case Dialect.MYSQL:
      return `RENAME TABLE ${from} TO ${to}`;
    case Dialect.SQLITE:
      return `ALTER TABLE ${from} RENAME TO ${to}`;
    default:
      return `ALTER TABLE ${from} RENAME TO ${to}`;
  }
}

/**
 * Generate ADD COLUMN SQL
 */
function generateAddColumn(tableName: string, column: ColumnDefinition, dialect: Dialect): string {
  return `ALTER TABLE ${tableName} ADD COLUMN ${generateColumnDef(column, dialect)}`;
}

/**
 * Generate DROP COLUMN SQL
 */
function generateDropColumn(tableName: string, columnName: string, _dialect: Dialect): string {
  return `ALTER TABLE ${tableName} DROP COLUMN ${columnName}`;
}

/**
 * Generate RENAME COLUMN SQL
 */
function generateRenameColumn(tableName: string, from: string, to: string, dialect: Dialect): string {
  switch (dialect) {
    case Dialect.POSTGRES:
      return `ALTER TABLE ${tableName} RENAME COLUMN ${from} TO ${to}`;
    case Dialect.MYSQL:
      // MySQL requires the column definition for CHANGE
      return `ALTER TABLE ${tableName} RENAME COLUMN ${from} TO ${to}`;
    case Dialect.SQLITE:
      return `ALTER TABLE ${tableName} RENAME COLUMN ${from} TO ${to}`;
    default:
      return `ALTER TABLE ${tableName} RENAME COLUMN ${from} TO ${to}`;
  }
}

/**
 * Generate ALTER COLUMN SQL
 */
function generateAlterColumn(tableName: string, column: ColumnDefinition, dialect: Dialect): string {
  switch (dialect) {
    case Dialect.POSTGRES: {
      const alterClauses: string[] = [];
      alterClauses.push(
        `ALTER TABLE ${tableName} ALTER COLUMN ${column.name} TYPE ${mapColumnType(column.type, dialect)}`
      );
      if (column.nullable === false) {
        alterClauses.push(`ALTER TABLE ${tableName} ALTER COLUMN ${column.name} SET NOT NULL`);
      } else if (column.nullable === true) {
        alterClauses.push(`ALTER TABLE ${tableName} ALTER COLUMN ${column.name} DROP NOT NULL`);
      }
      if (column.default !== undefined) {
        const defaultVal = formatDefaultValue(column.default, column.type, dialect);
        alterClauses.push(`ALTER TABLE ${tableName} ALTER COLUMN ${column.name} SET DEFAULT ${defaultVal}`);
      }
      return alterClauses.join(';\n');
    }
    case Dialect.MYSQL:
      return `ALTER TABLE ${tableName} MODIFY COLUMN ${generateColumnDef(column, dialect)}`;
    case Dialect.SQLITE:
      // SQLite doesn't support ALTER COLUMN, need to recreate table
      throw new Error('SQLite does not support ALTER COLUMN. Use raw SQL with table recreation.');
    default:
      return `ALTER TABLE ${tableName} ALTER COLUMN ${column.name} ${mapColumnType(column.type, dialect)}`;
  }
}

/**
 * Generate CREATE INDEX SQL
 */
function generateCreateIndex(tableName: string, index: IndexDefinition, dialect: Dialect): string {
  const unique = index.unique ? 'UNIQUE ' : '';
  const columns = index.columns.join(', ');
  let sql = `CREATE ${unique}INDEX ${index.name} ON ${tableName} (${columns})`;

  if (index.where && dialect === Dialect.POSTGRES) {
    sql += ` WHERE ${index.where}`;
  }

  return sql;
}

/**
 * Generate DROP INDEX SQL
 */
function generateDropIndex(indexName: string, dialect: Dialect): string {
  switch (dialect) {
    case Dialect.MYSQL:
      // MySQL requires table name, but we don't have it here
      // Use IF EXISTS which works without table name in newer MySQL
      return `DROP INDEX ${indexName}`;
    default:
      return `DROP INDEX IF EXISTS ${indexName}`;
  }
}

/**
 * Generate ADD FOREIGN KEY SQL
 */
function generateAddForeignKey(
  tableName: string,
  column: string,
  references: NonNullable<ColumnDefinition['references']>,
  _dialect: Dialect
): string {
  const constraintName = `fk_${tableName}_${column}`;
  let sql = `ALTER TABLE ${tableName} ADD CONSTRAINT ${constraintName} FOREIGN KEY (${column}) REFERENCES ${references.table}(${references.column})`;

  if (references.onDelete) {
    sql += ` ON DELETE ${references.onDelete}`;
  }
  if (references.onUpdate) {
    sql += ` ON UPDATE ${references.onUpdate}`;
  }

  return sql;
}

/**
 * Generate DROP FOREIGN KEY SQL
 */
function generateDropForeignKey(tableName: string, constraintName: string, dialect: Dialect): string {
  switch (dialect) {
    case Dialect.MYSQL:
      return `ALTER TABLE ${tableName} DROP FOREIGN KEY ${constraintName}`;
    default:
      return `ALTER TABLE ${tableName} DROP CONSTRAINT ${constraintName}`;
  }
}

/**
 * Generate all SQL statements for a migration
 */
export function generateMigrationSQL(
  operations: MigrationOperation[],
  dialect: Dialect = Dialect.POSTGRES
): string[] {
  return operations.map((op) => generateSQL(op, dialect));
}
