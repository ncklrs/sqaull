import { describe, it, expect } from 'vitest';
import { compile, parse, Dialect } from '../src';

describe('compiler', () => {
  describe('basic SELECT queries', () => {
    it('compiles simple select query', () => {
      const ast = parse('from:users sel:name,email');
      const result = compile(ast);
      expect(result.sql).toBe('SELECT name, email FROM users');
      expect(result.params).toEqual([]);
    });

    it('compiles select wildcard', () => {
      const ast = parse('from:users sel:*');
      const result = compile(ast);
      expect(result.sql).toBe('SELECT * FROM users');
    });

    it('compiles select without columns (defaults to wildcard)', () => {
      const ast = parse('from:users');
      const result = compile(ast);
      expect(result.sql).toMatch(/SELECT.*FROM users/);
    });

    it('compiles with table prefix in columns', () => {
      const ast = parse('from:users sel:users.name,users.email');
      const result = compile(ast);
      expect(result.sql).toBe('SELECT users.name, users.email FROM users');
    });
  });

  describe('WHERE clauses', () => {
    it('compiles equality comparison', () => {
      const ast = parse('from:users whr:status=active');
      const result = compile(ast);
      expect(result.sql).toBe('SELECT * FROM users WHERE status = $1');
      expect(result.params).toEqual(['active']);
    });

    it('compiles greater than comparison', () => {
      const ast = parse('from:users whr:age>18');
      const result = compile(ast);
      expect(result.sql).toBe('SELECT * FROM users WHERE age > $1');
      expect(result.params).toEqual([18]);
    });

    it('compiles less than comparison', () => {
      const ast = parse('from:products whr:price<100');
      const result = compile(ast);
      expect(result.sql).toBe('SELECT * FROM products WHERE price < $1');
      expect(result.params).toEqual([100]);
    });

    it('compiles greater than or equal comparison', () => {
      const ast = parse('from:users whr:age>=21');
      const result = compile(ast);
      expect(result.sql).toBe('SELECT * FROM users WHERE age >= $1');
      expect(result.params).toEqual([21]);
    });

    it('compiles less than or equal comparison', () => {
      const ast = parse('from:users whr:age<=65');
      const result = compile(ast);
      expect(result.sql).toBe('SELECT * FROM users WHERE age <= $1');
      expect(result.params).toEqual([65]);
    });

    it('compiles not equal comparison', () => {
      const ast = parse('from:users whr:status!=deleted');
      const result = compile(ast);
      expect(result.sql).toBe('SELECT * FROM users WHERE status != $1');
      expect(result.params).toEqual(['deleted']);
    });

    it('compiles LIKE comparison', () => {
      const ast = parse('from:users whr:name~john');
      const result = compile(ast);
      expect(result.sql).toBe('SELECT * FROM users WHERE name LIKE $1');
      expect(result.params).toEqual(['john']);
    });

    it('compiles numeric values correctly', () => {
      const ast = parse('from:products whr:price>99.99');
      const result = compile(ast);
      expect(result.params).toEqual([99.99]);
    });

    it('compiles negative numbers correctly', () => {
      const ast = parse('from:accounts whr:balance<-100');
      const result = compile(ast);
      expect(result.params).toEqual([-100]);
    });
  });

  describe('ORDER BY clauses', () => {
    it('compiles order by ascending', () => {
      const ast = parse('from:users ord:name');
      const result = compile(ast);
      expect(result.sql).toBe('SELECT * FROM users ORDER BY name ASC');
    });

    it('compiles order by descending', () => {
      const ast = parse('from:users ord:created_at/desc');
      const result = compile(ast);
      expect(result.sql).toBe('SELECT * FROM users ORDER BY created_at DESC');
    });

    it('compiles multiple order by columns', () => {
      const ast = parse('from:users ord:last_name,first_name');
      const result = compile(ast);
      expect(result.sql).toBe('SELECT * FROM users ORDER BY last_name ASC, first_name ASC');
    });

    it('compiles order by with mixed directions', () => {
      const ast = parse('from:users ord:created_at/desc,name/asc');
      const result = compile(ast);
      expect(result.sql).toBe('SELECT * FROM users ORDER BY created_at DESC, name ASC');
    });

    it('compiles order by with table prefix', () => {
      const ast = parse('from:users ord:users.created_at/desc');
      const result = compile(ast);
      expect(result.sql).toBe('SELECT * FROM users ORDER BY users.created_at DESC');
    });
  });

  describe('LIMIT and OFFSET', () => {
    it('compiles limit clause', () => {
      const ast = parse('from:users lim:10');
      const result = compile(ast);
      expect(result.sql).toBe('SELECT * FROM users LIMIT 10');
    });

    it('compiles offset clause', () => {
      const ast = parse('from:users off:5');
      const result = compile(ast);
      expect(result.sql).toBe('SELECT * FROM users OFFSET 5');
    });

    it('compiles limit and offset together', () => {
      const ast = parse('from:users lim:20 off:40');
      const result = compile(ast);
      expect(result.sql).toBe('SELECT * FROM users LIMIT 20 OFFSET 40');
    });
  });

  describe('GROUP BY and HAVING', () => {
    it('compiles group by single column', () => {
      const ast = parse('from:orders grp:user_id');
      const result = compile(ast);
      expect(result.sql).toContain('GROUP BY user_id');
    });

    it('compiles group by multiple columns', () => {
      const ast = parse('from:orders grp:user_id,status');
      const result = compile(ast);
      expect(result.sql).toContain('GROUP BY user_id, status');
    });

    it('compiles having clause', () => {
      const ast = parse('from:orders sel:user_id,sum:total grp:user_id hav:sum:total>1000');
      const result = compile(ast);
      expect(result.sql).toContain('HAVING');
      expect(result.sql).toMatch(/HAVING.*>.*\$\d/);
      expect(result.params).toContain(1000);
    });

    it('compiles group by with having and order', () => {
      const ast = parse('from:orders grp:user_id hav:cnt:*>5 ord:cnt:*/desc');
      const result = compile(ast);
      expect(result.sql).toContain('GROUP BY');
      expect(result.sql).toContain('HAVING');
      expect(result.sql).toContain('ORDER BY');
    });
  });

  describe('aggregates', () => {
    it('compiles SUM aggregate', () => {
      const ast = parse('from:orders sel:sum:total');
      const result = compile(ast);
      expect(result.sql).toBe('SELECT SUM(total) FROM orders');
    });

    it('compiles COUNT aggregate', () => {
      const ast = parse('from:orders sel:cnt:*');
      const result = compile(ast);
      expect(result.sql).toBe('SELECT COUNT(*) FROM orders');
    });

    it('compiles AVG aggregate', () => {
      const ast = parse('from:products sel:avg:price');
      const result = compile(ast);
      expect(result.sql).toBe('SELECT AVG(price) FROM products');
    });

    it('compiles MIN aggregate', () => {
      const ast = parse('from:products sel:min:price');
      const result = compile(ast);
      expect(result.sql).toBe('SELECT MIN(price) FROM products');
    });

    it('compiles MAX aggregate', () => {
      const ast = parse('from:products sel:max:price');
      const result = compile(ast);
      expect(result.sql).toBe('SELECT MAX(price) FROM products');
    });

    it('compiles mixed columns and aggregates', () => {
      const ast = parse('from:orders sel:user_id,sum:total,cnt:*');
      const result = compile(ast);
      expect(result.sql).toBe('SELECT user_id, SUM(total), COUNT(*) FROM orders');
    });

    it('compiles aggregate with alias', () => {
      const ast = parse('from:orders sel:sum:total/total_amount');
      const result = compile(ast);
      expect(result.sql).toBe('SELECT SUM(total) AS total_amount FROM orders');
    });

    it('compiles multiple aggregates with aliases', () => {
      const ast = parse('from:orders sel:sum:total/revenue,cnt:*/order_count');
      const result = compile(ast);
      expect(result.sql).toContain('SUM(total) AS revenue');
      expect(result.sql).toContain('COUNT(*) AS order_count');
    });
  });

  describe('JOINs', () => {
    it('compiles INNER JOIN', () => {
      const ast = parse('from:users join:orders on:users.id=orders.user_id');
      const result = compile(ast);
      expect(result.sql).toContain('INNER JOIN orders ON users.id = orders.user_id');
    });

    it('compiles LEFT JOIN', () => {
      const ast = parse('from:users join:orders/left on:users.id=orders.user_id');
      const result = compile(ast);
      expect(result.sql).toContain('LEFT JOIN orders ON users.id = orders.user_id');
    });

    it('compiles RIGHT JOIN', () => {
      const ast = parse('from:users join:orders/right on:users.id=orders.user_id');
      const result = compile(ast);
      expect(result.sql).toContain('RIGHT JOIN orders ON users.id = orders.user_id');
    });

    it('compiles FULL JOIN', () => {
      const ast = parse('from:users join:orders/full on:users.id=orders.user_id');
      const result = compile(ast);
      expect(result.sql).toContain('FULL JOIN orders ON users.id = orders.user_id');
    });

    it('compiles multiple joins', () => {
      const ast = parse('from:users join:orders on:users.id=orders.user_id join:products on:orders.product_id=products.id');
      const result = compile(ast);
      expect(result.sql).toContain('INNER JOIN orders');
      expect(result.sql).toContain('INNER JOIN products');
    });

    it('compiles join with select columns from multiple tables', () => {
      const ast = parse('from:users join:orders on:users.id=orders.user_id sel:users.name,orders.total');
      const result = compile(ast);
      expect(result.sql).toContain('SELECT users.name, orders.total');
      expect(result.sql).toContain('INNER JOIN orders');
    });

    it('compiles join with where clause', () => {
      const ast = parse('from:users join:orders on:users.id=orders.user_id whr:users.status=active');
      const result = compile(ast);
      expect(result.sql).toContain('INNER JOIN');
      expect(result.sql).toContain('WHERE');
    });
  });

  describe('special conditions', () => {
    it('compiles IN condition', () => {
      const ast = parse('from:users whr:status.in(active,pending)');
      const result = compile(ast);
      expect(result.sql).toBe('SELECT * FROM users WHERE status IN ($1, $2)');
      expect(result.params).toEqual(['active', 'pending']);
    });

    it('compiles IN condition with numbers', () => {
      const ast = parse('from:users whr:id.in(1,2,3)');
      const result = compile(ast);
      expect(result.sql).toBe('SELECT * FROM users WHERE id IN ($1, $2, $3)');
      expect(result.params).toEqual([1, 2, 3]);
    });

    it('compiles NOT IN condition', () => {
      const ast = parse('from:users whr:status.!in(deleted,banned)');
      const result = compile(ast);
      expect(result.sql).toBe('SELECT * FROM users WHERE status NOT IN ($1, $2)');
      expect(result.params).toEqual(['deleted', 'banned']);
    });

    it('compiles IS NULL condition', () => {
      const ast = parse('from:users whr:deleted_at.null');
      const result = compile(ast);
      expect(result.sql).toBe('SELECT * FROM users WHERE deleted_at IS NULL');
      expect(result.params).toEqual([]);
    });

    it('compiles IS NOT NULL condition', () => {
      const ast = parse('from:users whr:email.!null');
      const result = compile(ast);
      expect(result.sql).toBe('SELECT * FROM users WHERE email IS NOT NULL');
      expect(result.params).toEqual([]);
    });
  });

  describe('logical operators', () => {
    it('compiles AND conditions', () => {
      const ast = parse('from:users whr:age>18,status=active');
      const result = compile(ast);
      expect(result.sql).toContain('WHERE');
      expect(result.sql).toContain('AND');
      expect(result.params).toHaveLength(2);
    });

    it('compiles OR conditions', () => {
      const ast = parse('from:users whr:age>65|status=vip');
      const result = compile(ast);
      expect(result.sql).toContain('WHERE');
      expect(result.sql).toContain('OR');
      expect(result.params).toHaveLength(2);
    });

    it('compiles multiple AND conditions', () => {
      const ast = parse('from:users whr:age>18,status=active,verified=true');
      const result = compile(ast);
      expect(result.sql).toMatch(/AND.*AND/);
      expect(result.params).toHaveLength(3);
    });

    it('compiles multiple OR conditions', () => {
      const ast = parse('from:users whr:age<18|age>65|status=special');
      const result = compile(ast);
      expect(result.sql).toMatch(/OR.*OR/);
      expect(result.params).toHaveLength(3);
    });

    it('compiles nested AND/OR conditions', () => {
      const ast = parse('from:users whr:age>18,status=active|status=premium');
      const result = compile(ast);
      expect(result.sql).toContain('WHERE');
      // Should handle precedence correctly
      expect(result.params.length).toBeGreaterThan(1);
    });
  });

  describe('dialect support', () => {
    it('uses PostgreSQL placeholders by default', () => {
      const ast = parse('from:users whr:age>18,status=active');
      const result = compile(ast);
      expect(result.sql).toContain('$1');
      expect(result.sql).toContain('$2');
    });

    it('uses PostgreSQL placeholders when specified', () => {
      const ast = parse('from:users whr:age>18');
      const result = compile(ast, { dialect: Dialect.POSTGRES });
      expect(result.sql).toContain('$1');
    });

    it('uses MySQL placeholders', () => {
      const ast = parse('from:users whr:age>18,status=active');
      const result = compile(ast, { dialect: Dialect.MYSQL });
      expect(result.sql).toContain('?');
      expect(result.sql).not.toContain('$1');
    });

    it('uses SQLite placeholders', () => {
      const ast = parse('from:users whr:age>18');
      const result = compile(ast, { dialect: Dialect.SQLITE });
      expect(result.sql).toContain('?');
    });

    it('handles multiple parameters with MySQL dialect', () => {
      const ast = parse('from:users whr:age>18,status=active,verified=true');
      const result = compile(ast, { dialect: Dialect.MYSQL });
      const questionMarks = (result.sql.match(/\?/g) || []).length;
      expect(questionMarks).toBe(3);
    });
  });

  describe('complex queries', () => {
    it('compiles complete query with all clauses', () => {
      const ast = parse('from:users sel:name,email whr:age>18 ord:name lim:10 off:5');
      const result = compile(ast);
      expect(result.sql).toContain('SELECT name, email');
      expect(result.sql).toContain('FROM users');
      expect(result.sql).toContain('WHERE age > $1');
      expect(result.sql).toContain('ORDER BY name ASC');
      expect(result.sql).toContain('LIMIT 10');
      expect(result.sql).toContain('OFFSET 5');
      expect(result.params).toEqual([18]);
    });

    it('compiles analytics query', () => {
      const ast = parse('from:orders sel:user_id,sum:total,cnt:* grp:user_id hav:sum:total>1000 ord:sum:total/desc lim:10');
      const result = compile(ast);
      expect(result.sql).toContain('SELECT user_id, SUM(total), COUNT(*)');
      expect(result.sql).toContain('GROUP BY user_id');
      expect(result.sql).toContain('HAVING');
      expect(result.sql).toContain('ORDER BY');
      expect(result.sql).toContain('LIMIT 10');
    });

    it('compiles multi-join query', () => {
      const ast = parse('from:users join:orders on:users.id=orders.user_id join:products on:orders.product_id=products.id sel:users.name,products.name,orders.quantity');
      const result = compile(ast);
      expect(result.sql).toContain('INNER JOIN orders');
      expect(result.sql).toContain('INNER JOIN products');
      expect(result.sql).toContain('SELECT users.name, products.name, orders.quantity');
    });

    it('compiles pagination query', () => {
      const ast = parse('from:users sel:id,name,email whr:status=active ord:created_at/desc lim:20 off:40');
      const result = compile(ast);
      expect(result.sql).toContain('LIMIT 20 OFFSET 40');
      expect(result.params).toEqual(['active']);
    });

    it('compiles search query', () => {
      const ast = parse('from:products whr:name~laptop|description~laptop ord:price lim:50');
      const result = compile(ast);
      expect(result.sql).toContain('LIKE');
      expect(result.sql).toContain('OR');
      expect(result.sql).toContain('LIMIT 50');
    });
  });

  describe('parameterization', () => {
    it('parameterizes string values', () => {
      const ast = parse('from:users whr:name=john');
      const result = compile(ast);
      expect(result.params).toContain('john');
    });

    it('parameterizes numeric values', () => {
      const ast = parse('from:users whr:age>18');
      const result = compile(ast);
      expect(result.params).toContain(18);
    });

    it('parameterizes multiple values', () => {
      const ast = parse('from:users whr:age>18,status=active');
      const result = compile(ast);
      expect(result.params).toEqual([18, 'active']);
    });

    it('parameterizes IN clause values', () => {
      const ast = parse('from:users whr:id.in(1,2,3)');
      const result = compile(ast);
      expect(result.params).toEqual([1, 2, 3]);
    });

    it('does not parameterize column names', () => {
      const ast = parse('from:users sel:name,email');
      const result = compile(ast);
      expect(result.sql).toContain('name');
      expect(result.sql).toContain('email');
      expect(result.params).toEqual([]);
    });

    it('does not parameterize table names', () => {
      const ast = parse('from:users');
      const result = compile(ast);
      expect(result.sql).toContain('users');
      expect(result.params).toEqual([]);
    });

    it('handles quoted strings in parameters', () => {
      const ast = parse('from:users whr:name=\'john doe\'');
      const result = compile(ast);
      expect(result.params).toContain('john doe');
    });
  });

  describe('SQL injection prevention', () => {
    it('parameterizes potentially dangerous values', () => {
      const ast = parse('from:users whr:name=\'; DROP TABLE users; --');
      const result = compile(ast);
      expect(result.params).toContain('\'; DROP TABLE users; --');
      expect(result.sql).not.toContain('DROP TABLE');
    });

    it('does not allow SQL injection through operators', () => {
      const ast = parse('from:users whr:status=active');
      const result = compile(ast);
      expect(result.sql).toMatch(/WHERE status = \$\d+/);
    });
  });

  describe('output format', () => {
    it('returns compiled query object', () => {
      const ast = parse('from:users whr:age>18');
      const result = compile(ast);
      expect(result).toHaveProperty('sql');
      expect(result).toHaveProperty('params');
      expect(typeof result.sql).toBe('string');
      expect(Array.isArray(result.params)).toBe(true);
    });

    it('returns empty params array when no parameters', () => {
      const ast = parse('from:users sel:name,email');
      const result = compile(ast);
      expect(result.params).toEqual([]);
    });

    it('maintains parameter order', () => {
      const ast = parse('from:users whr:age>18,status=active,verified=true');
      const result = compile(ast);
      expect(result.params).toEqual([18, 'active', true]);
    });
  });

  describe('edge cases', () => {
    it('handles empty AST', () => {
      const ast = {};
      const result = compile(ast);
      expect(result.sql).toBeTruthy();
    });

    it('handles table names with underscores', () => {
      const ast = parse('from:user_accounts');
      const result = compile(ast);
      expect(result.sql).toContain('user_accounts');
    });

    it('handles column names with underscores', () => {
      const ast = parse('from:users sel:first_name,last_name');
      const result = compile(ast);
      expect(result.sql).toContain('first_name');
      expect(result.sql).toContain('last_name');
    });

    it('handles decimal numbers', () => {
      const ast = parse('from:products whr:price>99.99');
      const result = compile(ast);
      expect(result.params).toContain(99.99);
    });

    it('handles negative numbers', () => {
      const ast = parse('from:accounts whr:balance<-100.50');
      const result = compile(ast);
      expect(result.params).toContain(-100.50);
    });
  });

  describe('INSERT statements', () => {
    it('compiles basic insert with columns and values', () => {
      const ast = parse('ins:users cols:name,email vals:john,john@example.com');
      const result = compile(ast);
      expect(result.sql).toBe('INSERT INTO users (name, email) VALUES ($1, $2)');
      expect(result.params).toEqual(['john', 'john@example.com']);
    });

    it('compiles insert with numeric values', () => {
      const ast = parse('ins:products cols:name,price,quantity vals:Widget,29.99,100');
      const result = compile(ast);
      expect(result.sql).toBe('INSERT INTO products (name, price, quantity) VALUES ($1, $2, $3)');
      expect(result.params).toEqual(['Widget', 29.99, 100]);
    });

    it('compiles insert with null values', () => {
      const ast = parse('ins:users cols:name,email,phone vals:john,john@test.com,null');
      const result = compile(ast);
      expect(result.sql).toBe('INSERT INTO users (name, email, phone) VALUES ($1, $2, $3)');
      expect(result.params).toEqual(['john', 'john@test.com', null]);
    });

    it('compiles insert with boolean values', () => {
      const ast = parse('ins:users cols:name,active,verified vals:john,true,false');
      const result = compile(ast);
      expect(result.sql).toBe('INSERT INTO users (name, active, verified) VALUES ($1, $2, $3)');
      expect(result.params).toEqual(['john', true, false]);
    });

    it('compiles insert with RETURNING clause', () => {
      const ast = parse('ins:users cols:name,email vals:john,john@test.com ret:id');
      const result = compile(ast);
      expect(result.sql).toBe('INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id');
      expect(result.params).toEqual(['john', 'john@test.com']);
    });

    it('compiles insert with RETURNING *', () => {
      const ast = parse('ins:users cols:name vals:john ret:*');
      const result = compile(ast);
      expect(result.sql).toBe('INSERT INTO users (name) VALUES ($1) RETURNING *');
    });

    it('compiles insert with RETURNING multiple columns', () => {
      const ast = parse('ins:users cols:name,email vals:john,john@test.com ret:id,created_at');
      const result = compile(ast);
      expect(result.sql).toBe('INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id, created_at');
    });

    it('uses MySQL placeholders for insert', () => {
      const ast = parse('ins:users cols:name,email vals:john,john@test.com');
      const result = compile(ast, { dialect: Dialect.MYSQL });
      expect(result.sql).toBe('INSERT INTO users (name, email) VALUES (?, ?)');
      expect(result.params).toEqual(['john', 'john@test.com']);
    });
  });

  describe('UPDATE statements', () => {
    it('compiles basic update', () => {
      const ast = parse('upd:users set:name=john');
      const result = compile(ast);
      expect(result.sql).toBe('UPDATE users SET name = $1');
      expect(result.params).toEqual(['john']);
    });

    it('compiles update with multiple SET values', () => {
      const ast = parse('upd:users set:name=john,email=john@test.com');
      const result = compile(ast);
      expect(result.sql).toBe('UPDATE users SET name = $1, email = $2');
      expect(result.params).toEqual(['john', 'john@test.com']);
    });

    it('compiles update with WHERE clause', () => {
      const ast = parse('upd:users set:status=active whr:id=1');
      const result = compile(ast);
      expect(result.sql).toBe('UPDATE users SET status = $1 WHERE id = $2');
      expect(result.params).toEqual(['active', 1]);
    });

    it('compiles update with numeric values', () => {
      const ast = parse('upd:products set:price=99.99,quantity=50 whr:id=1');
      const result = compile(ast);
      expect(result.sql).toBe('UPDATE products SET price = $1, quantity = $2 WHERE id = $3');
      expect(result.params).toEqual([99.99, 50, 1]);
    });

    it('compiles update with null values', () => {
      const ast = parse('upd:users set:deleted_at=null whr:id=1');
      const result = compile(ast);
      expect(result.sql).toBe('UPDATE users SET deleted_at = $1 WHERE id = $2');
      expect(result.params).toEqual([null, 1]);
    });

    it('compiles update with boolean values', () => {
      const ast = parse('upd:users set:active=true,verified=false whr:id=1');
      const result = compile(ast);
      expect(result.sql).toBe('UPDATE users SET active = $1, verified = $2 WHERE id = $3');
      expect(result.params).toEqual([true, false, 1]);
    });

    it('compiles update with RETURNING clause', () => {
      const ast = parse('upd:users set:name=john whr:id=1 ret:id,name,updated_at');
      const result = compile(ast);
      expect(result.sql).toBe('UPDATE users SET name = $1 WHERE id = $2 RETURNING id, name, updated_at');
    });

    it('compiles update with RETURNING *', () => {
      const ast = parse('upd:users set:name=john whr:id=1 ret:*');
      const result = compile(ast);
      expect(result.sql).toBe('UPDATE users SET name = $1 WHERE id = $2 RETURNING *');
    });

    it('compiles update with complex WHERE conditions', () => {
      const ast = parse('upd:users set:status=banned whr:failed_logins>5,last_login.null');
      const result = compile(ast);
      expect(result.sql).toContain('UPDATE users SET status = $1');
      expect(result.sql).toContain('WHERE');
      expect(result.sql).toContain('AND');
    });

    it('uses MySQL placeholders for update', () => {
      const ast = parse('upd:users set:name=john whr:id=1');
      const result = compile(ast, { dialect: Dialect.MYSQL });
      expect(result.sql).toBe('UPDATE users SET name = ? WHERE id = ?');
    });
  });

  describe('Gen Alpha slang (no cap fr fr)', () => {
    it('slays a basic SELECT query', () => {
      const ast = parse('main:users slay:name,email');
      const result = compile(ast);
      expect(result.sql).toBe('SELECT name, email FROM users');
    });

    it('filters sus rows', () => {
      const ast = parse('main:users slay:* sus:age>18');
      const result = compile(ast);
      expect(result.sql).toBe('SELECT * FROM users WHERE age > $1');
      expect(result.params).toEqual([18]);
    });

    it('vibechecks the order', () => {
      const ast = parse('main:users slay:name vibe:created_at/desc');
      const result = compile(ast);
      expect(result.sql).toBe('SELECT name FROM users ORDER BY created_at DESC');
    });

    it('bets on a limit', () => {
      const ast = parse('main:users slay:* bet:10');
      const result = compile(ast);
      expect(result.sql).toContain('LIMIT');
    });

    it('squads up with GROUP BY', () => {
      const ast = parse('main:orders slay:user_id,cnt:* squad:user_id');
      const result = compile(ast);
      expect(result.sql).toContain('GROUP BY user_id');
    });

    it('spills the tea with HAVING', () => {
      const ast = parse('main:orders slay:user_id,sum:total squad:user_id tea:sum:total>1000');
      const result = compile(ast);
      expect(result.sql).toContain('HAVING');
    });

    it('links up tables with JOIN', () => {
      const ast = parse('main:users link:orders match:users.id=orders.user_id slay:users.name,orders.total');
      const result = compile(ast);
      expect(result.sql).toContain('INNER JOIN orders');
    });

    it('nocap inserts fire values with that drip', () => {
      const ast = parse('nocap:users drip:name,email fire:john,john@test.com');
      const result = compile(ast);
      expect(result.sql).toBe('INSERT INTO users (name, email) VALUES ($1, $2)');
      expect(result.params).toEqual(['john', 'john@test.com']);
    });

    it('nocap inserts and flexes the results', () => {
      const ast = parse('nocap:users drip:name fire:john flex:id');
      const result = compile(ast);
      expect(result.sql).toBe('INSERT INTO users (name) VALUES ($1) RETURNING id');
    });

    it('glows up with rizz', () => {
      const ast = parse('glow:users rizz:name=john sus:id=1');
      const result = compile(ast);
      expect(result.sql).toBe('UPDATE users SET name = $1 WHERE id = $2');
      expect(result.params).toEqual(['john', 1]);
    });

    it('glows up and flexes', () => {
      const ast = parse('glow:users rizz:status=active sus:id=1 flex:*');
      const result = compile(ast);
      expect(result.sql).toBe('UPDATE users SET status = $1 WHERE id = $2 RETURNING *');
    });

    it('yeets data into the void', () => {
      const ast = parse('yeet:users sus:id=1');
      const result = compile(ast);
      expect(result.sql).toBe('DELETE FROM users WHERE id = $1');
      expect(result.params).toEqual([1]);
    });

    it('yeets and flexes', () => {
      const ast = parse('yeet:users sus:id=1 flex:id,email');
      const result = compile(ast);
      expect(result.sql).toBe('DELETE FROM users WHERE id = $1 RETURNING id, email');
    });

    it('full gen alpha query is bussin', () => {
      const ast = parse('main:users slay:name,email sus:age>21 vibe:name bet:10 skip:20');
      const result = compile(ast);
      expect(result.sql).toContain('SELECT name, email');
      expect(result.sql).toContain('FROM users');
      expect(result.sql).toContain('WHERE age > $1');
      expect(result.sql).toContain('ORDER BY name');
      expect(result.sql).toContain('LIMIT');
      expect(result.sql).toContain('OFFSET');
    });
  });

  describe('DELETE statements', () => {
    it('compiles basic delete with WHERE', () => {
      const ast = parse('del:users whr:id=1');
      const result = compile(ast);
      expect(result.sql).toBe('DELETE FROM users WHERE id = $1');
      expect(result.params).toEqual([1]);
    });

    it('compiles delete without WHERE (dangerous but valid)', () => {
      const ast = parse('del:temp_data');
      const result = compile(ast);
      expect(result.sql).toBe('DELETE FROM temp_data');
      expect(result.params).toEqual([]);
    });

    it('compiles delete with multiple WHERE conditions', () => {
      const ast = parse('del:sessions whr:expired=true,created_at<2024-01-01');
      const result = compile(ast);
      expect(result.sql).toContain('DELETE FROM sessions');
      expect(result.sql).toContain('WHERE');
      expect(result.sql).toContain('AND');
    });

    it('compiles delete with OR conditions', () => {
      const ast = parse('del:notifications whr:read=true|created_at<2024-01-01');
      const result = compile(ast);
      expect(result.sql).toContain('DELETE FROM notifications');
      expect(result.sql).toContain('OR');
    });

    it('compiles delete with RETURNING clause', () => {
      const ast = parse('del:users whr:id=1 ret:id,email');
      const result = compile(ast);
      expect(result.sql).toBe('DELETE FROM users WHERE id = $1 RETURNING id, email');
    });

    it('compiles delete with RETURNING *', () => {
      const ast = parse('del:users whr:id=1 ret:*');
      const result = compile(ast);
      expect(result.sql).toBe('DELETE FROM users WHERE id = $1 RETURNING *');
    });

    it('compiles delete with IN condition', () => {
      const ast = parse('del:users whr:id.in(1,2,3)');
      const result = compile(ast);
      expect(result.sql).toBe('DELETE FROM users WHERE id IN ($1, $2, $3)');
      expect(result.params).toEqual([1, 2, 3]);
    });

    it('compiles delete with NULL condition', () => {
      const ast = parse('del:users whr:verified_at.null');
      const result = compile(ast);
      expect(result.sql).toBe('DELETE FROM users WHERE verified_at IS NULL');
    });

    it('uses MySQL placeholders for delete', () => {
      const ast = parse('del:users whr:id=1');
      const result = compile(ast, { dialect: Dialect.MYSQL });
      expect(result.sql).toBe('DELETE FROM users WHERE id = ?');
    });
  });
});
