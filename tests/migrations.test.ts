/**
 * Migration system tests
 *
 * Tests for migration builder, SQL generation, and runner.
 */

import { describe, it, expect } from 'vitest';
import {
  createMigration,
  defineMigration,
  generateSQL,
  generateMigrationSQL,
  glow,
  evolve,
  Dialect,
} from '../src';

describe('migration builder', () => {
  describe('createMigration', () => {
    it('creates a migration with timestamp and name', () => {
      const migration = createMigration('create_users_table', 1704067200000).build();

      expect(migration.id).toBe('1704067200000_create_users_table');
      expect(migration.name).toBe('create_users_table');
      expect(migration.timestamp).toBe(1704067200000);
    });

    it('auto-generates timestamp if not provided', () => {
      const migration = createMigration('test_migration').build();

      expect(migration.timestamp).toBeGreaterThan(0);
      expect(migration.id).toContain('test_migration');
    });
  });

  describe('createTable', () => {
    it('creates a table with columns', () => {
      const migration = createMigration('create_users', 1000)
        .createTable('users', (table) => {
          table.id();
          table.string('name').notNull();
          table.string('email').notNull().unique();
        })
        .build();

      expect(migration.up).toHaveLength(1);
      expect(migration.up[0].type).toBe('createTable');
      expect(migration.down).toHaveLength(1);
      expect(migration.down[0].type).toBe('dropTable');
    });

    it('supports various column types', () => {
      const migration = createMigration('all_types', 1000)
        .createTable('test', (table) => {
          table.id();
          table.string('varchar_col');
          table.text('text_col');
          table.integer('int_col');
          table.bigint('bigint_col');
          table.float('float_col');
          table.double('double_col');
          table.decimal('decimal_col');
          table.boolean('bool_col');
          table.date('date_col');
          table.datetime('datetime_col');
          table.timestamp('timestamp_col');
          table.time('time_col');
          table.json('json_col');
          table.jsonb('jsonb_col');
          table.binary('binary_col');
        })
        .build();

      const createOp = migration.up[0];
      expect(createOp.type).toBe('createTable');
      if (createOp.type === 'createTable') {
        expect(createOp.table.columns).toHaveLength(16);
      }
    });

    it('supports timestamps() helper', () => {
      const migration = createMigration('with_timestamps', 1000)
        .createTable('posts', (table) => {
          table.id();
          table.string('title');
          table.timestamps();
        })
        .build();

      const createOp = migration.up[0];
      if (createOp.type === 'createTable') {
        const columnNames = createOp.table.columns.map(c => c.name);
        expect(columnNames).toContain('created_at');
        expect(columnNames).toContain('updated_at');
      }
    });

    it('supports softDeletes() helper', () => {
      const migration = createMigration('with_soft_deletes', 1000)
        .createTable('items', (table) => {
          table.id();
          table.softDeletes();
        })
        .build();

      const createOp = migration.up[0];
      if (createOp.type === 'createTable') {
        const columnNames = createOp.table.columns.map(c => c.name);
        expect(columnNames).toContain('deleted_at');
      }
    });

    it('supports foreign keys', () => {
      const migration = createMigration('with_fk', 1000)
        .createTable('posts', (table) => {
          table.id();
          table.foreignKey('user_id', { table: 'users', onDelete: 'CASCADE' });
        })
        .build();

      const createOp = migration.up[0];
      if (createOp.type === 'createTable') {
        const fkColumn = createOp.table.columns.find(c => c.name === 'user_id');
        expect(fkColumn?.references?.table).toBe('users');
        expect(fkColumn?.references?.onDelete).toBe('CASCADE');
      }
    });
  });

  describe('column modifiers', () => {
    it('supports notNull', () => {
      const migration = createMigration('test', 1000)
        .createTable('test', (table) => {
          table.string('required').notNull();
        })
        .build();

      const createOp = migration.up[0];
      if (createOp.type === 'createTable') {
        const col = createOp.table.columns[0];
        expect(col.nullable).toBe(false);
      }
    });

    it('supports default values', () => {
      const migration = createMigration('test', 1000)
        .createTable('test', (table) => {
          table.string('status').default('active');
          table.integer('count').default(0);
          table.boolean('enabled').default(true);
        })
        .build();

      const createOp = migration.up[0];
      if (createOp.type === 'createTable') {
        expect(createOp.table.columns[0].default).toBe('active');
        expect(createOp.table.columns[1].default).toBe(0);
        expect(createOp.table.columns[2].default).toBe(true);
      }
    });

    it('supports unique constraint', () => {
      const migration = createMigration('test', 1000)
        .createTable('test', (table) => {
          table.string('email').unique();
        })
        .build();

      const createOp = migration.up[0];
      if (createOp.type === 'createTable') {
        expect(createOp.table.columns[0].unique).toBe(true);
      }
    });
  });

  describe('indexes', () => {
    it('creates index', () => {
      const migration = createMigration('add_index', 1000)
        .createTable('users', (table) => {
          table.id();
          table.string('email');
        })
        .createIndex('users', 'idx_users_email', ['email'])
        .build();

      expect(migration.up).toHaveLength(2);
      expect(migration.up[1].type).toBe('createIndex');
    });

    it('creates unique index', () => {
      const migration = createMigration('add_unique_index', 1000)
        .createIndex('users', 'idx_users_email', ['email'], { unique: true })
        .build();

      const indexOp = migration.up[0];
      if (indexOp.type === 'createIndex') {
        expect(indexOp.index.unique).toBe(true);
      }
    });
  });

  describe('column operations', () => {
    it('adds a column', () => {
      const migration = createMigration('add_col', 1000)
        .addColumn('users', 'age', 'integer', (col) => col.notNull().default(0))
        .build();

      expect(migration.up[0].type).toBe('addColumn');
      expect(migration.down[0].type).toBe('dropColumn');
    });

    it('drops a column', () => {
      const migration = createMigration('drop_col', 1000)
        .dropColumn('users', 'deprecated_field')
        .build();

      expect(migration.up[0].type).toBe('dropColumn');
    });

    it('renames a column', () => {
      const migration = createMigration('rename_col', 1000)
        .renameColumn('users', 'name', 'full_name')
        .build();

      expect(migration.up[0].type).toBe('renameColumn');
      expect(migration.down[0].type).toBe('renameColumn');

      // Down should reverse the rename
      if (migration.down[0].type === 'renameColumn') {
        expect(migration.down[0].from).toBe('full_name');
        expect(migration.down[0].to).toBe('name');
      }
    });
  });

  describe('table operations', () => {
    it('drops a table', () => {
      const migration = createMigration('drop_table', 1000)
        .dropTable('old_table')
        .build();

      expect(migration.up[0].type).toBe('dropTable');
    });

    it('renames a table', () => {
      const migration = createMigration('rename_table', 1000)
        .renameTable('old_name', 'new_name')
        .build();

      expect(migration.up[0].type).toBe('renameTable');
      expect(migration.down[0].type).toBe('renameTable');
    });
  });

  describe('raw SQL', () => {
    it('supports raw SQL', () => {
      const migration = createMigration('raw_sql', 1000)
        .raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
        .build();

      expect(migration.up[0].type).toBe('raw');
      if (migration.up[0].type === 'raw') {
        expect(migration.up[0].sql).toContain('uuid-ossp');
      }
    });

    it('supports raw SQL with down', () => {
      const migration = createMigration('raw_with_down', 1000)
        .raw(
          'CREATE VIEW active_users AS SELECT * FROM users WHERE active = true',
          'DROP VIEW active_users'
        )
        .build();

      expect(migration.up[0].type).toBe('raw');
      expect(migration.down[0].type).toBe('raw');
    });
  });
});

describe('SQL generation', () => {
  describe('PostgreSQL dialect', () => {
    it('generates CREATE TABLE', () => {
      const sql = generateSQL({
        type: 'createTable',
        table: {
          name: 'users',
          columns: [
            { name: 'id', type: 'integer', primaryKey: true, autoIncrement: true, nullable: false },
            { name: 'name', type: 'string', nullable: false },
            { name: 'email', type: 'string', nullable: false, unique: true },
          ],
        },
      }, Dialect.POSTGRES);

      expect(sql).toContain('CREATE TABLE users');
      expect(sql).toContain('SERIAL');
      expect(sql).toContain('NOT NULL');
      expect(sql).toContain('UNIQUE');
      expect(sql).toContain('PRIMARY KEY');
    });

    it('generates DROP TABLE', () => {
      const sql = generateSQL({
        type: 'dropTable',
        tableName: 'users',
      }, Dialect.POSTGRES);

      expect(sql).toBe('DROP TABLE IF EXISTS users');
    });

    it('generates ADD COLUMN', () => {
      const sql = generateSQL({
        type: 'addColumn',
        tableName: 'users',
        column: { name: 'age', type: 'integer', nullable: false, default: 0 },
      }, Dialect.POSTGRES);

      expect(sql).toContain('ALTER TABLE users ADD COLUMN');
      expect(sql).toContain('age');
      expect(sql).toContain('INTEGER');
      expect(sql).toContain('NOT NULL');
      expect(sql).toContain('DEFAULT 0');
    });

    it('generates CREATE INDEX', () => {
      const sql = generateSQL({
        type: 'createIndex',
        tableName: 'users',
        index: { name: 'idx_users_email', columns: ['email'], unique: true },
      }, Dialect.POSTGRES);

      expect(sql).toContain('CREATE UNIQUE INDEX');
      expect(sql).toContain('idx_users_email');
      expect(sql).toContain('ON users');
    });
  });

  describe('MySQL dialect', () => {
    it('generates CREATE TABLE with AUTO_INCREMENT', () => {
      const sql = generateSQL({
        type: 'createTable',
        table: {
          name: 'users',
          columns: [
            { name: 'id', type: 'integer', primaryKey: true, autoIncrement: true },
          ],
        },
      }, Dialect.MYSQL);

      expect(sql).toContain('AUTO_INCREMENT');
      expect(sql).toContain('INT');
    });

    it('uses backticks for boolean type', () => {
      const sql = generateSQL({
        type: 'createTable',
        table: {
          name: 'test',
          columns: [
            { name: 'active', type: 'boolean' },
          ],
        },
      }, Dialect.MYSQL);

      expect(sql).toContain('TINYINT(1)');
    });
  });

  describe('SQLite dialect', () => {
    it('generates CREATE TABLE with INTEGER PRIMARY KEY', () => {
      const sql = generateSQL({
        type: 'createTable',
        table: {
          name: 'users',
          columns: [
            { name: 'id', type: 'integer', primaryKey: true, autoIncrement: true },
          ],
        },
      }, Dialect.SQLITE);

      expect(sql).toContain('INTEGER');
      expect(sql).toContain('PRIMARY KEY');
    });
  });

  describe('generateMigrationSQL', () => {
    it('generates SQL for all operations', () => {
      const migration = createMigration('full_migration', 1000)
        .createTable('users', (table) => {
          table.id();
          table.string('name');
        })
        .createIndex('users', 'idx_name', ['name'])
        .build();

      const sqls = generateMigrationSQL(migration.up, Dialect.POSTGRES);

      expect(sqls).toHaveLength(2);
      expect(sqls[0]).toContain('CREATE TABLE');
      expect(sqls[1]).toContain('CREATE INDEX');
    });
  });
});

describe('defineMigration', () => {
  it('creates migration from config object', () => {
    const migration = defineMigration({
      name: 'create_posts',
      timestamp: 2000,
      up: (m) => {
        m.createTable('posts', (t) => {
          t.id();
          t.string('title');
        });
      },
    });

    expect(migration.name).toBe('create_posts');
    expect(migration.up).toHaveLength(1);
  });
});

describe('Gen Alpha aliases', () => {
  it('glow is alias for createMigration', () => {
    const migration = glow('schema_glow_up').build();
    expect(migration.name).toBe('schema_glow_up');
  });

  it('evolve is alias for defineMigration', () => {
    const migration = evolve({
      name: 'evolution_arc',
      up: (m) => {
        m.createTable('evolutions', (t) => t.id());
      },
    });
    expect(migration.name).toBe('evolution_arc');
  });
});
