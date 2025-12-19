import { describe, it, expect } from 'vitest';
import { sqw } from '../src';

describe('template literal API', () => {
  describe('basic queries', () => {
    it('creates query from template literal', () => {
      const query = sqw`from:users sel:name,email`;
      expect(query).toBeDefined();
      expect(typeof query.toSQL).toBe('function');
    });

    it('converts to SQL string', () => {
      const query = sqw`from:users sel:name,email`;
      const sql = query.toSQL();
      expect(sql).toBe('SELECT name, email FROM users');
    });

    it('converts to parameterized query', () => {
      const query = sqw`from:users whr:age>18`;
      const result = query.toParams();
      expect(result).toHaveProperty('sql');
      expect(result).toHaveProperty('params');
      expect(result.sql).toContain('$1');
      expect(result.params).toEqual([18]);
    });

    it('handles simple from clause', () => {
      const query = sqw`from:users`;
      expect(query.toSQL()).toMatch(/SELECT.*FROM users/);
    });

    it('handles where clause', () => {
      const query = sqw`from:users whr:status=active`;
      expect(query.toSQL()).toContain('WHERE');
    });

    it('handles order by clause', () => {
      const query = sqw`from:users ord:name`;
      expect(query.toSQL()).toContain('ORDER BY name');
    });

    it('handles limit clause', () => {
      const query = sqw`from:users lim:10`;
      expect(query.toSQL()).toContain('LIMIT 10');
    });
  });

  describe('interpolated values', () => {
    it('interpolates values in where clause', () => {
      const minAge = 18;
      const query = sqw`from:users whr:age>${minAge}`;
      const result = query.toParams();
      expect(result.params).toContain(18);
    });

    it('interpolates string values', () => {
      const status = 'active';
      const query = sqw`from:users whr:status=${status}`;
      const result = query.toParams();
      expect(result.params).toContain('active');
    });

    it('interpolates multiple values', () => {
      const minAge = 18;
      const status = 'active';
      const query = sqw`from:users whr:age>${minAge},status=${status}`;
      const result = query.toParams();
      expect(result.params).toEqual([18, 'active']);
    });

    it('interpolates table name', () => {
      const table = 'users';
      const query = sqw`from:${table} sel:name`;
      expect(query.toSQL()).toContain('FROM users');
    });

    it('interpolates column names', () => {
      const col1 = 'name';
      const col2 = 'email';
      const query = sqw`from:users sel:${col1},${col2}`;
      expect(query.toSQL()).toContain('name, email');
    });

    it('interpolates limit value', () => {
      const limit = 50;
      const query = sqw`from:users lim:${limit}`;
      expect(query.toSQL()).toContain('LIMIT 50');
    });

    it('interpolates offset value', () => {
      const offset = 20;
      const query = sqw`from:users off:${offset}`;
      expect(query.toSQL()).toContain('OFFSET 20');
    });

    it('handles array interpolation for IN clause', () => {
      const statuses = ['active', 'pending', 'approved'];
      const query = sqw`from:users whr:status.in(${statuses.join(',')})`;
      const result = query.toParams();
      expect(result.params.length).toBeGreaterThan(0);
    });
  });

  describe('complex queries', () => {
    it('builds complete query with all clauses', () => {
      const query = sqw`from:users sel:name,email whr:age>18 ord:name lim:10`;
      const sql = query.toSQL();
      expect(sql).toContain('SELECT name, email');
      expect(sql).toContain('FROM users');
      expect(sql).toContain('WHERE');
      expect(sql).toContain('ORDER BY');
      expect(sql).toContain('LIMIT');
    });

    it('builds query with joins', () => {
      const query = sqw`from:users join:orders/left on:users.id=orders.user_id sel:users.name,orders.total`;
      const sql = query.toSQL();
      expect(sql).toContain('LEFT JOIN');
      expect(sql).toContain('ON users.id');
    });

    it('builds query with aggregates', () => {
      const query = sqw`from:orders sel:user_id,sum:total,cnt:* grp:user_id`;
      const sql = query.toSQL();
      expect(sql).toContain('SUM(total)');
      expect(sql).toContain('COUNT(*)');
      expect(sql).toContain('GROUP BY');
    });

    it('builds query with having clause', () => {
      const query = sqw`from:orders grp:user_id hav:sum:total>1000`;
      const sql = query.toSQL();
      expect(sql).toContain('HAVING');
    });

    it('builds pagination query', () => {
      const query = sqw`from:users sel:name ord:created_at/desc lim:20 off:40`;
      const sql = query.toSQL();
      expect(sql).toContain('LIMIT 20');
      expect(sql).toContain('OFFSET 40');
    });
  });

  describe('dynamic query building', () => {
    it('builds query with conditional parts', () => {
      const includeEmail = true;
      const columns = includeEmail ? 'name,email' : 'name';
      const query = sqw`from:users sel:${columns}`;
      const sql = query.toSQL();
      expect(sql).toContain('email');
    });

    it('builds query with dynamic where clause', () => {
      const filters = 'age>18,status=active';
      const query = sqw`from:users whr:${filters}`;
      const sql = query.toSQL();
      expect(sql).toContain('WHERE');
    });

    it('builds query with dynamic order by', () => {
      const sortBy = 'created_at/desc';
      const query = sqw`from:users ord:${sortBy}`;
      const sql = query.toSQL();
      expect(sql).toContain('ORDER BY created_at DESC');
    });

    it('builds query with dynamic pagination', () => {
      const page = 3;
      const pageSize = 20;
      const offset = (page - 1) * pageSize;
      const query = sqw`from:users lim:${pageSize} off:${offset}`;
      const sql = query.toSQL();
      expect(sql).toContain('LIMIT 20');
      expect(sql).toContain('OFFSET 40');
    });
  });

  describe('method chaining after template', () => {
    it('allows chaining toSQL method', () => {
      const sql = sqw`from:users sel:name`.toSQL();
      expect(typeof sql).toBe('string');
    });

    it('allows chaining toParams method', () => {
      const result = sqw`from:users whr:age>18`.toParams();
      expect(result).toHaveProperty('sql');
      expect(result).toHaveProperty('params');
    });

    it('can be stored and called later', () => {
      const query = sqw`from:users sel:name,email whr:status=active`;
      const sql1 = query.toSQL();
      const sql2 = query.toSQL();
      expect(sql1).toBe(sql2);
    });

    it('maintains query state across calls', () => {
      const query = sqw`from:users whr:age>18`;
      const result1 = query.toParams();
      const result2 = query.toParams();
      expect(result1).toEqual(result2);
    });
  });

  describe('toParams output', () => {
    it('returns PostgreSQL placeholders by default', () => {
      const query = sqw`from:users whr:age>18,status=active`;
      const result = query.toParams();
      expect(result.sql).toContain('$1');
      expect(result.sql).toContain('$2');
    });

    it('returns correct parameter array', () => {
      const query = sqw`from:users whr:age>18,status=active`;
      const result = query.toParams();
      expect(result.params).toHaveLength(2);
      expect(result.params[0]).toBe(18);
      expect(result.params[1]).toBe('active');
    });

    it('returns empty params for queries without parameters', () => {
      const query = sqw`from:users sel:name,email`;
      const result = query.toParams();
      expect(result.params).toEqual([]);
    });

    it('handles IN clause parameters', () => {
      const query = sqw`from:users whr:id.in(1,2,3)`;
      const result = query.toParams();
      expect(result.params).toEqual([1, 2, 3]);
      expect(result.sql).toContain('IN ($1, $2, $3)');
    });

    it('handles NULL checks without parameters', () => {
      const query = sqw`from:users whr:deleted_at.null`;
      const result = query.toParams();
      expect(result.params).toEqual([]);
      expect(result.sql).toContain('IS NULL');
    });
  });

  describe('dialect options', () => {
    it('accepts dialect option for toParams', () => {
      const query = sqw`from:users whr:age>18`;
      const result = query.toParams({ dialect: 'mysql' });
      expect(result.sql).toContain('?');
    });

    it('accepts dialect option for toSQL', () => {
      const query = sqw`from:users sel:name`;
      const sql = query.toSQL({ dialect: 'postgres' });
      expect(typeof sql).toBe('string');
    });
  });

  describe('multiline queries', () => {
    it('handles multiline template literals', () => {
      const query = sqw`
        from:users
        sel:name,email
        whr:age>18
        ord:name
      `;
      const sql = query.toSQL();
      expect(sql).toContain('SELECT');
      expect(sql).toContain('FROM');
      expect(sql).toContain('WHERE');
      expect(sql).toContain('ORDER BY');
    });

    it('handles multiline with interpolation', () => {
      const minAge = 21;
      const query = sqw`
        from:users
        whr:age>${minAge}
        ord:created_at/desc
      `;
      const result = query.toParams();
      expect(result.params).toContain(21);
    });

    it('ignores extra whitespace', () => {
      const query1 = sqw`from:users sel:name`;
      const query2 = sqw`from:users    sel:name`;
      expect(query1.toSQL()).toBe(query2.toSQL());
    });
  });

  describe('error handling', () => {
    it('throws on invalid syntax', () => {
      expect(() => sqw`invalid query`).toThrow();
    });

    it('throws on missing table', () => {
      expect(() => sqw`sel:name`).toThrow();
    });

    it('throws on invalid operator', () => {
      expect(() => sqw`from:users whr:age@18`).toThrow();
    });

    it('handles empty template', () => {
      expect(() => sqw``).toThrow();
    });
  });

  describe('real-world examples', () => {
    it('builds user search query', () => {
      const searchTerm = 'john';
      const query = sqw`from:users whr:name~${searchTerm}|email~${searchTerm} ord:name lim:20`;
      const result = query.toParams();
      expect(result.sql).toContain('LIKE');
      expect(result.sql).toContain('OR');
    });

    it('builds analytics dashboard query', () => {
      const query = sqw`
        from:orders
        sel:user_id,sum:total,cnt:*,avg:total
        grp:user_id
        hav:sum:total>1000
        ord:sum:total/desc
        lim:10
      `;
      const sql = query.toSQL();
      expect(sql).toContain('SUM');
      expect(sql).toContain('COUNT');
      expect(sql).toContain('AVG');
      expect(sql).toContain('HAVING');
    });

    it('builds pagination with filters', () => {
      const page = 2;
      const pageSize = 25;
      const status = 'active';
      const query = sqw`
        from:users
        sel:id,name,email,created_at
        whr:status=${status}
        ord:created_at/desc
        lim:${pageSize}
        off:${(page - 1) * pageSize}
      `;
      const result = query.toParams();
      expect(result.sql).toContain('LIMIT 25');
      expect(result.sql).toContain('OFFSET 25');
      expect(result.params).toContain('active');
    });

    it('builds complex join query', () => {
      const query = sqw`
        from:users
        join:orders/left on:users.id=orders.user_id
        join:products on:orders.product_id=products.id
        sel:users.name,products.name,sum:orders.quantity
        whr:users.status=active
        grp:users.id,products.id
        ord:sum:orders.quantity/desc
      `;
      const sql = query.toSQL();
      expect(sql).toContain('LEFT JOIN orders');
      expect(sql).toContain('INNER JOIN products');
      expect(sql).toContain('GROUP BY');
    });

    it('builds report query with date range', () => {
      const startDate = '2024-01-01';
      const endDate = '2024-12-31';
      const query = sqw`
        from:transactions
        sel:date,sum:amount,cnt:*
        whr:date>=${startDate},date<=${endDate}
        grp:date
        ord:date/desc
      `;
      const result = query.toParams();
      expect(result.params).toContain('2024-01-01');
      expect(result.params).toContain('2024-12-31');
    });
  });

  describe('query object properties', () => {
    it('has toSQL method', () => {
      const query = sqw`from:users`;
      expect(typeof query.toSQL).toBe('function');
    });

    it('has toParams method', () => {
      const query = sqw`from:users`;
      expect(typeof query.toParams).toBe('function');
    });

    it('is reusable', () => {
      const query = sqw`from:users whr:age>18`;
      const sql1 = query.toSQL();
      const sql2 = query.toSQL();
      const params1 = query.toParams();
      const params2 = query.toParams();
      expect(sql1).toBe(sql2);
      expect(params1).toEqual(params2);
    });

    it('can be passed around as value', () => {
      const createQuery = () => sqw`from:users sel:name`;
      const query = createQuery();
      expect(query.toSQL()).toContain('SELECT name');
    });
  });

  describe('type coercion', () => {
    it('handles numeric string interpolation', () => {
      const age = '18';
      const query = sqw`from:users whr:age>${age}`;
      const result = query.toParams();
      // Should coerce to number
      expect(typeof result.params[0]).toBe('number');
    });

    it('handles boolean values', () => {
      const verified = true;
      const query = sqw`from:users whr:verified=${verified}`;
      const result = query.toParams();
      expect(result.params).toContain(true);
    });

    it('preserves null values', () => {
      const query = sqw`from:users whr:deleted_at.null`;
      const sql = query.toSQL();
      expect(sql).toContain('IS NULL');
    });
  });
});
