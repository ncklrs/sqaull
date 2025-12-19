import { describe, it, expect } from 'vitest';
import { sq, sqw, createQueryBuilder } from '../src';

describe('fluent builder API', () => {
  describe('basic methods', () => {
    it('creates query with from method', () => {
      const query = sq.from('users');
      expect(query).toBeDefined();
      expect(typeof query.toSQL).toBe('function');
    });

    it('chains select method', () => {
      const query = sq.from('users').sel('name', 'email');
      const sql = query.toSQL();
      expect(sql).toContain('SELECT name, email');
    });

    it('chains where method', () => {
      const query = sq.from('users').whr('age', '>', 18);
      const sql = query.toSQL();
      expect(sql).toContain('WHERE');
    });

    it('chains order by method', () => {
      const query = sq.from('users').ord('name');
      const sql = query.toSQL();
      expect(sql).toContain('ORDER BY name');
    });

    it('chains limit method', () => {
      const query = sq.from('users').lim(10);
      const sql = query.toSQL();
      expect(sql).toContain('LIMIT 10');
    });

    it('chains offset method', () => {
      const query = sq.from('users').off(5);
      const sql = query.toSQL();
      expect(sql).toContain('OFFSET 5');
    });
  });

  describe('method chaining', () => {
    it('chains multiple methods', () => {
      const query = sq
        .from('users')
        .sel('name', 'email')
        .whr('age', '>', 18)
        .ord('name')
        .lim(10);

      const sql = query.toSQL();
      expect(sql).toContain('SELECT name, email');
      expect(sql).toContain('FROM users');
      expect(sql).toContain('WHERE');
      expect(sql).toContain('ORDER BY');
      expect(sql).toContain('LIMIT');
    });

    it('chains all available methods', () => {
      const query = sq
        .from('users')
        .sel('name', 'email')
        .whr('age', '>', 18)
        .ord('created_at', 'desc')
        .lim(20)
        .off(40);

      const sql = query.toSQL();
      expect(sql).toContain('SELECT');
      expect(sql).toContain('WHERE');
      expect(sql).toContain('ORDER BY');
      expect(sql).toContain('LIMIT 20');
      expect(sql).toContain('OFFSET 40');
    });

    it('returns new query object for each method', () => {
      const query1 = sq.from('users');
      const query2 = query1.sel('name');
      // Should be chainable but immutable
      expect(query1).toBeDefined();
      expect(query2).toBeDefined();
    });
  });

  describe('select method variations', () => {
    it('accepts multiple column arguments', () => {
      const query = sq.from('users').sel('name', 'email', 'age');
      const sql = query.toSQL();
      expect(sql).toContain('name, email, age');
    });

    it('accepts array of columns', () => {
      const query = sq.from('users').sel(['name', 'email', 'age']);
      const sql = query.toSQL();
      expect(sql).toContain('name, email, age');
    });

    it('accepts wildcard', () => {
      const query = sq.from('users').sel('*');
      const sql = query.toSQL();
      expect(sql).toContain('SELECT *');
    });

    it('accepts table.column syntax', () => {
      const query = sq.from('users').sel('users.name', 'users.email');
      const sql = query.toSQL();
      expect(sql).toContain('users.name, users.email');
    });
  });

  describe('where method variations', () => {
    it('accepts comparison with three arguments', () => {
      const query = sq.from('users').whr('age', '>', 18);
      const result = query.toParams();
      expect(result.sql).toContain('WHERE age > $1');
      expect(result.params).toEqual([18]);
    });

    it('accepts equality with two arguments', () => {
      const query = sq.from('users').whr('status', 'active');
      const result = query.toParams();
      expect(result.sql).toContain('WHERE status = $1');
      expect(result.params).toEqual(['active']);
    });

    it('chains multiple where conditions (AND)', () => {
      const query = sq.from('users')
        .whr('age', '>', 18)
        .whr('status', 'active');

      const result = query.toParams();
      expect(result.sql).toContain('AND');
      expect(result.params).toHaveLength(2);
    });

    it('supports different operators', () => {
      const operators = ['>', '<', '>=', '<=', '=', '!=', '~'];
      operators.forEach(op => {
        const query = sq.from('users').whr('age', op, 18);
        const sql = query.toSQL();
        expect(sql).toContain('WHERE');
      });
    });

    it('supports numeric values', () => {
      const query = sq.from('users').whr('age', '>', 18);
      const result = query.toParams();
      expect(result.params).toEqual([18]);
    });

    it('supports string values', () => {
      const query = sq.from('users').whr('name', '=', 'john');
      const result = query.toParams();
      expect(result.params).toEqual(['john']);
    });
  });

  describe('order by method variations', () => {
    it('accepts column name only (defaults to ASC)', () => {
      const query = sq.from('users').ord('name');
      const sql = query.toSQL();
      expect(sql).toContain('ORDER BY name ASC');
    });

    it('accepts column and direction', () => {
      const query = sq.from('users').ord('created_at', 'desc');
      const sql = query.toSQL();
      expect(sql).toContain('ORDER BY created_at DESC');
    });

    it('chains multiple order by clauses', () => {
      const query = sq.from('users')
        .ord('last_name', 'asc')
        .ord('first_name', 'asc');

      const sql = query.toSQL();
      expect(sql).toMatch(/ORDER BY.*last_name.*first_name/);
    });

    it('accepts table.column syntax', () => {
      const query = sq.from('users').ord('users.created_at', 'desc');
      const sql = query.toSQL();
      expect(sql).toContain('users.created_at DESC');
    });
  });

  describe('join methods', () => {
    it('adds inner join', () => {
      const query = sq.from('users')
        .join('orders', 'users.id', 'orders.user_id');

      const sql = query.toSQL();
      expect(sql).toContain('INNER JOIN orders');
      expect(sql).toContain('ON users.id = orders.user_id');
    });

    it('adds left join', () => {
      const query = sq.from('users')
        .leftJoin('orders', 'users.id', 'orders.user_id');

      const sql = query.toSQL();
      expect(sql).toContain('LEFT JOIN orders');
    });

    it('adds right join', () => {
      const query = sq.from('users')
        .rightJoin('orders', 'users.id', 'orders.user_id');

      const sql = query.toSQL();
      expect(sql).toContain('RIGHT JOIN orders');
    });

    it('adds full join', () => {
      const query = sq.from('users')
        .fullJoin('orders', 'users.id', 'orders.user_id');

      const sql = query.toSQL();
      expect(sql).toContain('FULL JOIN orders');
    });

    it('chains multiple joins', () => {
      const query = sq.from('users')
        .join('orders', 'users.id', 'orders.user_id')
        .join('products', 'orders.product_id', 'products.id');

      const sql = query.toSQL();
      expect(sql).toContain('INNER JOIN orders');
      expect(sql).toContain('INNER JOIN products');
    });

    it('combines joins with other clauses', () => {
      const query = sq.from('users')
        .leftJoin('orders', 'users.id', 'orders.user_id')
        .sel('users.name', 'orders.total')
        .whr('users.status', 'active');

      const sql = query.toSQL();
      expect(sql).toContain('LEFT JOIN');
      expect(sql).toContain('SELECT');
      expect(sql).toContain('WHERE');
    });
  });

  describe('group by and having', () => {
    it('adds group by single column', () => {
      const query = sq.from('orders').grp('user_id');
      const sql = query.toSQL();
      expect(sql).toContain('GROUP BY user_id');
    });

    it('adds group by multiple columns', () => {
      const query = sq.from('orders').grp('user_id', 'status');
      const sql = query.toSQL();
      expect(sql).toContain('GROUP BY user_id, status');
    });

    it('adds having clause', () => {
      const query = sq.from('orders')
        .grp('user_id')
        .hav('sum:total', '>', 1000);

      const sql = query.toSQL();
      expect(sql).toContain('HAVING');
    });

    it('combines group by, having, and order by', () => {
      const query = sq.from('orders')
        .sel('user_id', 'sum:total')
        .grp('user_id')
        .hav('sum:total', '>', 1000)
        .ord('sum:total', 'desc');

      const sql = query.toSQL();
      expect(sql).toContain('GROUP BY');
      expect(sql).toContain('HAVING');
      expect(sql).toContain('ORDER BY');
    });
  });

  describe('aggregate functions', () => {
    it('selects sum aggregate', () => {
      const query = sq.from('orders').sel('sum:total');
      const sql = query.toSQL();
      expect(sql).toContain('SUM(total)');
    });

    it('selects count aggregate', () => {
      const query = sq.from('orders').sel('cnt:*');
      const sql = query.toSQL();
      expect(sql).toContain('COUNT(*)');
    });

    it('selects avg aggregate', () => {
      const query = sq.from('products').sel('avg:price');
      const sql = query.toSQL();
      expect(sql).toContain('AVG(price)');
    });

    it('selects min aggregate', () => {
      const query = sq.from('products').sel('min:price');
      const sql = query.toSQL();
      expect(sql).toContain('MIN(price)');
    });

    it('selects max aggregate', () => {
      const query = sq.from('products').sel('max:price');
      const sql = query.toSQL();
      expect(sql).toContain('MAX(price)');
    });

    it('mixes aggregates with regular columns', () => {
      const query = sq.from('orders').sel('user_id', 'sum:total', 'cnt:*');
      const sql = query.toSQL();
      expect(sql).toContain('user_id');
      expect(sql).toContain('SUM(total)');
      expect(sql).toContain('COUNT(*)');
    });

    it('uses aggregate with alias', () => {
      const query = sq.from('orders').sel('sum:total/revenue');
      const sql = query.toSQL();
      expect(sql).toContain('SUM(total) AS revenue');
    });
  });

  describe('special conditions', () => {
    it('adds IN condition', () => {
      const query = sq.from('users').whereIn('status', ['active', 'pending']);
      const result = query.toParams();
      expect(result.sql).toContain('IN');
      expect(result.params).toEqual(['active', 'pending']);
    });

    it('adds NOT IN condition', () => {
      const query = sq.from('users').whereNotIn('status', ['deleted', 'banned']);
      const result = query.toParams();
      expect(result.sql).toContain('NOT IN');
    });

    it('adds IS NULL condition', () => {
      const query = sq.from('users').whereNull('deleted_at');
      const sql = query.toSQL();
      expect(sql).toContain('IS NULL');
    });

    it('adds IS NOT NULL condition', () => {
      const query = sq.from('users').whereNotNull('email');
      const sql = query.toSQL();
      expect(sql).toContain('IS NOT NULL');
    });
  });

  describe('toSQL and toParams', () => {
    it('converts to SQL string', () => {
      const query = sq.from('users').sel('name', 'email');
      const sql = query.toSQL();
      expect(typeof sql).toBe('string');
      expect(sql).toContain('SELECT');
    });

    it('converts to parameterized query', () => {
      const query = sq.from('users').whr('age', '>', 18);
      const result = query.toParams();
      expect(result).toHaveProperty('sql');
      expect(result).toHaveProperty('params');
    });

    it('accepts dialect option', () => {
      const query = sq.from('users').whr('age', '>', 18);
      const result = query.toParams({ dialect: 'mysql' });
      expect(result.sql).toContain('?');
    });

    it('maintains state across multiple calls', () => {
      const query = sq.from('users').whr('age', '>', 18);
      const sql1 = query.toSQL();
      const sql2 = query.toSQL();
      expect(sql1).toBe(sql2);
    });
  });

  describe('equivalence with template syntax', () => {
    it('produces same SQL as template for basic query', () => {
      const chain = sq.from('users').sel('name', 'email');
      const template = sqw`from:users sel:name,email`;
      expect(chain.toSQL()).toBe(template.toSQL());
    });

    it('produces same SQL for query with where', () => {
      const chain = sq.from('users').whr('age', '>', 18);
      const template = sqw`from:users whr:age>18`;
      const chainResult = chain.toParams();
      const templateResult = template.toParams();
      expect(chainResult.sql).toBe(templateResult.sql);
      expect(chainResult.params).toEqual(templateResult.params);
    });

    it('produces same SQL for complex query', () => {
      const chain = sq.from('users')
        .sel('name', 'email')
        .whr('age', '>', 18)
        .ord('name')
        .lim(10);

      const template = sqw`from:users sel:name,email whr:age>18 ord:name lim:10`;
      expect(chain.toSQL()).toBe(template.toSQL());
    });

    it('produces same parameters', () => {
      const chain = sq.from('users').whr('age', '>', 18).whr('status', 'active');
      const template = sqw`from:users whr:age>18,status=active`;
      const chainResult = chain.toParams();
      const templateResult = template.toParams();
      expect(chainResult.params).toEqual(templateResult.params);
    });
  });

  describe('complex real-world queries', () => {
    it('builds analytics query', () => {
      const query = sq.from('orders')
        .sel('user_id', 'sum:total', 'cnt:*')
        .grp('user_id')
        .hav('sum:total', '>', 1000)
        .ord('sum:total', 'desc')
        .lim(10);

      const sql = query.toSQL();
      expect(sql).toContain('SELECT');
      expect(sql).toContain('GROUP BY');
      expect(sql).toContain('HAVING');
      expect(sql).toContain('ORDER BY');
      expect(sql).toContain('LIMIT');
    });

    it('builds join query', () => {
      const query = sq.from('users')
        .leftJoin('orders', 'users.id', 'orders.user_id')
        .sel('users.name', 'sum:orders.total')
        .whr('users.status', 'active')
        .grp('users.id')
        .ord('sum:orders.total', 'desc');

      const sql = query.toSQL();
      expect(sql).toContain('LEFT JOIN');
      expect(sql).toContain('WHERE');
      expect(sql).toContain('GROUP BY');
    });

    it('builds pagination query', () => {
      const page = 2;
      const pageSize = 25;
      const query = sq.from('users')
        .sel('id', 'name', 'email')
        .whr('status', 'active')
        .ord('created_at', 'desc')
        .lim(pageSize)
        .off((page - 1) * pageSize);

      const sql = query.toSQL();
      expect(sql).toContain('LIMIT 25');
      expect(sql).toContain('OFFSET 25');
    });

    it('builds multi-join query', () => {
      const query = sq.from('users')
        .join('orders', 'users.id', 'orders.user_id')
        .join('products', 'orders.product_id', 'products.id')
        .join('categories', 'products.category_id', 'categories.id')
        .sel('users.name', 'products.name', 'categories.name');

      const sql = query.toSQL();
      expect(sql).toMatch(/INNER JOIN.*INNER JOIN.*INNER JOIN/);
    });

    it('builds search with multiple conditions', () => {
      const query = sq.from('products')
        .whr('name', '~', 'laptop')
        .whr('price', '<', 1000)
        .whr('in_stock', true)
        .ord('price', 'asc')
        .lim(50);

      const sql = query.toSQL();
      expect(sql).toContain('WHERE');
      expect(sql).toContain('AND');
    });
  });

  describe('dynamic query building', () => {
    it('conditionally adds clauses', () => {
      let query = sq.from('users').sel('name', 'email');

      const includeInactive = false;
      if (!includeInactive) {
        query = query.whr('status', 'active');
      }

      const sql = query.toSQL();
      expect(sql).toContain('WHERE');
    });

    it('builds query with dynamic columns', () => {
      const columns = ['name', 'email', 'age'];
      const query = sq.from('users').sel(...columns);
      const sql = query.toSQL();
      expect(sql).toContain('name, email, age');
    });

    it('builds query with dynamic filters', () => {
      const filters = [
        { column: 'age', operator: '>', value: 18 },
        { column: 'status', operator: '=', value: 'active' }
      ];

      let query = sq.from('users');
      filters.forEach(f => {
        query = query.whr(f.column, f.operator, f.value);
      });

      const result = query.toParams();
      expect(result.params).toHaveLength(2);
    });

    it('builds dynamic pagination', () => {
      const buildPageQuery = (page: number, size: number) => {
        return sq.from('users')
          .sel('*')
          .ord('id')
          .lim(size)
          .off((page - 1) * size);
      };

      const query = buildPageQuery(3, 20);
      const sql = query.toSQL();
      expect(sql).toContain('LIMIT 20');
      expect(sql).toContain('OFFSET 40');
    });
  });

  describe('method aliases', () => {
    it('supports select alias', () => {
      const query = sq.from('users').select('name', 'email');
      const sql = query.toSQL();
      expect(sql).toContain('SELECT name, email');
    });

    it('supports where alias', () => {
      const query = sq.from('users').where('age', '>', 18);
      const sql = query.toSQL();
      expect(sql).toContain('WHERE');
    });

    it('supports orderBy alias', () => {
      const query = sq.from('users').orderBy('name');
      const sql = query.toSQL();
      expect(sql).toContain('ORDER BY');
    });

    it('supports limit alias', () => {
      const query = sq.from('users').limit(10);
      const sql = query.toSQL();
      expect(sql).toContain('LIMIT 10');
    });

    it('supports offset alias', () => {
      const query = sq.from('users').offset(5);
      const sql = query.toSQL();
      expect(sql).toContain('OFFSET 5');
    });

    it('supports groupBy alias', () => {
      const query = sq.from('orders').groupBy('user_id');
      const sql = query.toSQL();
      expect(sql).toContain('GROUP BY');
    });

    it('supports having alias', () => {
      const query = sq.from('orders')
        .groupBy('user_id')
        .having('cnt:*', '>', 5);
      const sql = query.toSQL();
      expect(sql).toContain('HAVING');
    });
  });

  describe('INSERT operations', () => {
    it('creates basic insert', () => {
      const query = createQueryBuilder().ins('users').cols('name', 'email').vals('john', 'john@test.com');
      const result = query.toParams();
      expect(result.sql).toBe('INSERT INTO users (name, email) VALUES ($1, $2)');
      expect(result.params).toEqual(['john', 'john@test.com']);
    });

    it('creates insert with numeric values', () => {
      const query = createQueryBuilder().ins('products').cols('name', 'price').vals('Widget', 29.99);
      const result = query.toParams();
      expect(result.sql).toBe('INSERT INTO products (name, price) VALUES ($1, $2)');
      expect(result.params).toEqual(['Widget', 29.99]);
    });

    it('creates insert with null values', () => {
      const query = createQueryBuilder().ins('users').cols('name', 'phone').vals('john', null);
      const result = query.toParams();
      expect(result.params).toEqual(['john', null]);
    });

    it('creates insert with RETURNING', () => {
      const query = createQueryBuilder().ins('users').cols('name').vals('john').ret('id');
      const result = query.toParams();
      expect(result.sql).toBe('INSERT INTO users (name) VALUES ($1) RETURNING id');
    });

    it('creates insert with RETURNING *', () => {
      const query = createQueryBuilder().ins('users').cols('name').vals('john').ret('*');
      const result = query.toParams();
      expect(result.sql).toBe('INSERT INTO users (name) VALUES ($1) RETURNING *');
    });
  });

  describe('UPDATE operations', () => {
    it('creates basic update', () => {
      const query = createQueryBuilder().upd('users').set('name', 'john').whr('id', '=', 1);
      const result = query.toParams();
      expect(result.sql).toBe('UPDATE users SET name = $1 WHERE id = $2');
      expect(result.params).toEqual(['john', 1]);
    });

    it('creates update with multiple SET values', () => {
      const query = createQueryBuilder().upd('users').set('name', 'john').set('email', 'john@test.com').whr('id', '=', 1);
      const result = query.toParams();
      expect(result.sql).toBe('UPDATE users SET name = $1, email = $2 WHERE id = $3');
    });

    it('creates update with object SET form', () => {
      const query = createQueryBuilder().upd('users').set({ name: 'john', age: 30 }).whr('id', '=', 1);
      const result = query.toParams();
      expect(result.sql).toContain('SET name = $1, age = $2');
    });

    it('creates update with RETURNING', () => {
      const query = createQueryBuilder().upd('users').set('name', 'john').whr('id', '=', 1).ret('id', 'updated_at');
      const result = query.toParams();
      expect(result.sql).toContain('RETURNING id, updated_at');
    });

    it('creates update with null value', () => {
      const query = createQueryBuilder().upd('users').set('deleted_at', null).whr('id', '=', 1);
      const result = query.toParams();
      expect(result.params).toContain(null);
    });
  });

  describe('DELETE operations', () => {
    it('creates basic delete', () => {
      const query = createQueryBuilder().del('users').whr('id', '=', 1);
      const result = query.toParams();
      expect(result.sql).toBe('DELETE FROM users WHERE id = $1');
      expect(result.params).toEqual([1]);
    });

    it('creates delete without WHERE', () => {
      const query = createQueryBuilder().del('temp_data');
      const result = query.toParams();
      expect(result.sql).toBe('DELETE FROM temp_data');
    });

    it('creates delete with RETURNING', () => {
      const query = createQueryBuilder().del('users').whr('id', '=', 1).ret('id', 'email');
      const result = query.toParams();
      expect(result.sql).toBe('DELETE FROM users WHERE id = $1 RETURNING id, email');
    });

    it('creates delete with RETURNING *', () => {
      const query = createQueryBuilder().del('users').whr('id', '=', 1).ret('*');
      const result = query.toParams();
      expect(result.sql).toBe('DELETE FROM users WHERE id = $1 RETURNING *');
    });

    it('creates delete with complex WHERE', () => {
      const query = createQueryBuilder().del('sessions').whr('expired', '=', true).whr('user_id', '=', 1);
      const result = query.toParams();
      expect(result.sql).toContain('DELETE FROM sessions');
      expect(result.sql).toContain('AND');
    });
  });

  describe('immutability', () => {
    it('does not mutate original query', () => {
      const base = sq.from('users');
      const query1 = base.sel('name');
      const query2 = base.sel('email');

      expect(query1.toSQL()).not.toBe(query2.toSQL());
    });

    it('allows query reuse', () => {
      const baseQuery = sq.from('users').sel('name', 'email');
      const activeUsers = baseQuery.whr('status', 'active');
      const inactiveUsers = baseQuery.whr('status', 'inactive');

      expect(activeUsers.toSQL()).not.toBe(inactiveUsers.toSQL());
    });
  });

  describe('error handling', () => {
    it('throws on invalid operator', () => {
      expect(() => {
        sq.from('users').whr('age', '@', 18);
      }).toThrow();
    });

    it('throws on invalid direction', () => {
      expect(() => {
        sq.from('users').ord('name', 'invalid');
      }).toThrow();
    });

    it('throws on having without group by', () => {
      expect(() => {
        sq.from('users').hav('cnt:*', '>', 5).toSQL();
      }).toThrow();
    });
  });
});
