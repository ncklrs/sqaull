/**
 * Database execution layer tests
 *
 * Tests for adapters, client, and error handling.
 * Note: These tests don't require actual database connections.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  createClient,
  Client,
  PostgresAdapter,
  MySQLAdapter,
  SQLiteAdapter,
  DatabaseError,
  ConnectionError,
  TransactionError,
  Dialect,
} from '../src';

describe('database execution layer', () => {
  describe('error classes', () => {
    it('creates DatabaseError with message', () => {
      const error = new DatabaseError('Query failed');
      expect(error.message).toBe('Query failed');
      expect(error.name).toBe('DatabaseError');
    });

    it('creates DatabaseError with code and query info', () => {
      const error = new DatabaseError(
        'Syntax error',
        '42601',
        'SELECT * FROM',
        []
      );
      expect(error.message).toBe('Syntax error');
      expect(error.code).toBe('42601');
      expect(error.query).toBe('SELECT * FROM');
      expect(error.params).toEqual([]);
    });

    it('creates ConnectionError with config', () => {
      const config = { host: 'localhost', database: 'test' };
      const error = new ConnectionError('Connection refused', config);
      expect(error.message).toBe('Connection refused');
      expect(error.name).toBe('ConnectionError');
      expect(error.config).toBe(config);
    });

    it('creates TransactionError', () => {
      const error = new TransactionError('Transaction aborted');
      expect(error.message).toBe('Transaction aborted');
      expect(error.name).toBe('TransactionError');
    });

    it('error classes extend DatabaseError', () => {
      expect(new ConnectionError('test') instanceof DatabaseError).toBe(true);
      expect(new TransactionError('test') instanceof DatabaseError).toBe(true);
    });
  });

  describe('PostgresAdapter', () => {
    it('creates adapter with connection config', () => {
      const adapter = new PostgresAdapter({
        host: 'localhost',
        port: 5432,
        database: 'test',
        user: 'postgres',
        password: 'secret',
      });

      expect(adapter.dialect).toBe(Dialect.POSTGRES);
      expect(adapter.connected).toBe(false);
    });

    it('creates adapter with connection string', () => {
      const adapter = new PostgresAdapter({
        connectionString: 'postgres://user:pass@localhost:5432/mydb',
      });

      expect(adapter.dialect).toBe(Dialect.POSTGRES);
      expect(adapter.connected).toBe(false);
    });

    it('throws on connect without pg package', async () => {
      const adapter = new PostgresAdapter({
        connectionString: 'postgres://localhost/test',
      });

      await expect(adapter.connect()).rejects.toThrow('pg package not found');
    });

    it('throws on execute when not connected', async () => {
      const adapter = new PostgresAdapter({
        connectionString: 'postgres://localhost/test',
      });

      await expect(adapter.execute('SELECT 1')).rejects.toThrow(
        'Not connected to database'
      );
    });
  });

  describe('MySQLAdapter', () => {
    it('creates adapter with connection config', () => {
      const adapter = new MySQLAdapter({
        host: 'localhost',
        port: 3306,
        database: 'test',
        user: 'root',
        password: 'secret',
      });

      expect(adapter.dialect).toBe(Dialect.MYSQL);
      expect(adapter.connected).toBe(false);
    });

    it('throws on connect without mysql2 package', async () => {
      const adapter = new MySQLAdapter({
        host: 'localhost',
        database: 'test',
      });

      await expect(adapter.connect()).rejects.toThrow('mysql2 package not found');
    });
  });

  describe('SQLiteAdapter', () => {
    it('creates adapter with filename', () => {
      const adapter = new SQLiteAdapter({
        filename: ':memory:',
      });

      expect(adapter.dialect).toBe(Dialect.SQLITE);
      expect(adapter.connected).toBe(false);
    });

    it('throws without filename', () => {
      expect(() => new SQLiteAdapter({})).toThrow(
        'SQLite adapter requires a filename'
      );
    });

    it('throws on connect without better-sqlite3 package', async () => {
      const adapter = new SQLiteAdapter({
        filename: ':memory:',
      });

      await expect(adapter.connect()).rejects.toThrow(
        'better-sqlite3 package not found'
      );
    });
  });

  describe('createClient', () => {
    it('creates PostgreSQL client', () => {
      const client = createClient({
        dialect: Dialect.POSTGRES,
        connectionString: 'postgres://localhost/test',
      });

      expect(client).toBeInstanceOf(Client);
      expect(client.dialect).toBe(Dialect.POSTGRES);
      expect(client.connected).toBe(false);
    });

    it('creates MySQL client', () => {
      const client = createClient({
        dialect: Dialect.MYSQL,
        host: 'localhost',
        database: 'test',
      });

      expect(client).toBeInstanceOf(Client);
      expect(client.dialect).toBe(Dialect.MYSQL);
    });

    it('creates SQLite client', () => {
      const client = createClient({
        dialect: Dialect.SQLITE,
        filename: './test.db',
      });

      expect(client).toBeInstanceOf(Client);
      expect(client.dialect).toBe(Dialect.SQLITE);
    });

    it('throws for unsupported dialect', () => {
      expect(() =>
        createClient({
          dialect: Dialect.GENERIC,
          connectionString: 'generic://localhost',
        })
      ).toThrow('Unsupported dialect');
    });
  });

  describe('Client', () => {
    it('exposes adapter', () => {
      const client = createClient({
        dialect: Dialect.POSTGRES,
        connectionString: 'postgres://localhost/test',
      });

      expect(client.adapter).toBeInstanceOf(PostgresAdapter);
    });

    it('has sq builder property', () => {
      const client = createClient({
        dialect: Dialect.POSTGRES,
        connectionString: 'postgres://localhost/test',
      });

      // sq should be a query builder with execute methods
      expect(client.sq).toBeDefined();
      expect(typeof client.sq.from).toBe('function');
      expect(typeof client.sq.sel).toBe('function');
    });
  });
});

describe('database integration patterns', () => {
  it('demonstrates sqwind + client usage pattern', () => {
    // This test shows the intended usage pattern
    // (without actual database connection)

    const client = createClient({
      dialect: Dialect.POSTGRES,
      connectionString: 'postgres://localhost/test',
    });

    // The sq builder should be chainable
    const builder = client.sq
      .from('users')
      .sel('id', 'name', 'email')
      .whr('age', '>', 18)
      .ord('name', 'asc')
      .lim(10);

    // Builder should have execute method (fails without connection)
    expect(typeof builder.execute).toBe('function');
    expect(typeof builder.executeOne).toBe('function');

    // Can still get SQL without executing
    const query = builder.build();
    expect(query.toSQL()).toContain('SELECT');
    expect(query.toSQL()).toContain('FROM users');
  });

  it('demonstrates INSERT pattern', () => {
    const client = createClient({
      dialect: Dialect.POSTGRES,
      connectionString: 'postgres://localhost/test',
    });

    const builder = client.sq
      .ins('users')
      .cols('name', 'email')
      .vals('John', 'john@example.com')
      .ret('id');

    const query = builder.build();
    const result = query.toParams();

    expect(result.sql).toContain('INSERT INTO users');
    expect(result.sql).toContain('RETURNING id');
    expect(result.params).toContain('John');
    expect(result.params).toContain('john@example.com');
  });

  it('demonstrates UPDATE pattern', () => {
    const client = createClient({
      dialect: Dialect.POSTGRES,
      connectionString: 'postgres://localhost/test',
    });

    const builder = client.sq
      .upd('users')
      .set('status', 'active')
      .whr('id', '=', 1)
      .ret('*');

    const query = builder.build();
    const result = query.toParams();

    expect(result.sql).toContain('UPDATE users');
    expect(result.sql).toContain('SET status');
    expect(result.sql).toContain('RETURNING *');
  });

  it('demonstrates DELETE pattern', () => {
    const client = createClient({
      dialect: Dialect.POSTGRES,
      connectionString: 'postgres://localhost/test',
    });

    const builder = client.sq.del('sessions').whr('expired', '=', true);

    const query = builder.build();
    const result = query.toParams();

    expect(result.sql).toContain('DELETE FROM sessions');
    expect(result.sql).toContain('WHERE expired');
  });
});
