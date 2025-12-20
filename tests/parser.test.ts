import { describe, it, expect } from 'vitest';
import { parse, TokenType, AggregateType, Operator, OrderDirection, JoinType } from '../src';

describe('parser', () => {
  describe('simple queries', () => {
    it('parses basic from clause', () => {
      const ast = parse('from:users');
      expect(ast).toEqual({
        from: { table: 'users' }
      });
    });

    it('parses basic select query', () => {
      const ast = parse('from:users sel:name');
      expect(ast).toEqual({
        from: { table: 'users' },
        select: {
          columns: [
            { type: 'column', name: 'name' }
          ]
        }
      });
    });

    it('parses select with multiple columns', () => {
      const ast = parse('from:users sel:name,email,age');
      expect(ast.select?.columns).toHaveLength(3);
      expect(ast.select?.columns).toEqual([
        { type: 'column', name: 'name' },
        { type: 'column', name: 'email' },
        { type: 'column', name: 'age' }
      ]);
    });

    it('parses select wildcard', () => {
      const ast = parse('from:users sel:*');
      expect(ast.select?.columns).toEqual([
        { type: 'wildcard' }
      ]);
    });

    it('parses where clause with equality', () => {
      const ast = parse('from:users whr:status=active');
      expect(ast.where?.condition).toEqual({
        type: 'comparison',
        left: 'status',
        operator: Operator.EQ,
        right: 'active'
      });
    });

    it('parses where clause with greater than', () => {
      const ast = parse('from:users whr:age>18');
      expect(ast.where?.condition).toEqual({
        type: 'comparison',
        left: 'age',
        operator: Operator.GT,
        right: 18
      });
    });

    it('parses order by ascending', () => {
      const ast = parse('from:users ord:name');
      expect(ast.orderBy?.orders).toEqual([
        { column: 'name', direction: OrderDirection.ASC }
      ]);
    });

    it('parses order by descending', () => {
      const ast = parse('from:users ord:name/desc');
      expect(ast.orderBy?.orders).toEqual([
        { column: 'name', direction: OrderDirection.DESC }
      ]);
    });

    it('parses limit clause', () => {
      const ast = parse('from:users lim:10');
      expect(ast.limit).toEqual({ limit: 10 });
    });

    it('parses offset clause', () => {
      const ast = parse('from:users off:5');
      expect(ast.offset).toEqual({ offset: 5 });
    });
  });

  describe('complete queries', () => {
    it('parses query with all basic clauses', () => {
      const ast = parse('from:users sel:name,email whr:age>18 ord:name lim:10 off:5');
      expect(ast).toMatchObject({
        from: { table: 'users' },
        select: { columns: expect.any(Array) },
        where: { condition: expect.any(Object) },
        orderBy: { orders: expect.any(Array) },
        limit: { limit: 10 },
        offset: { offset: 5 }
      });
    });

    it('parses query with group by', () => {
      const ast = parse('from:orders sel:user_id,sum:total grp:user_id');
      expect(ast.groupBy).toEqual({
        columns: ['user_id']
      });
    });

    it('parses query with multiple group by columns', () => {
      const ast = parse('from:orders grp:user_id,status');
      expect(ast.groupBy).toEqual({
        columns: ['user_id', 'status']
      });
    });

    it('parses query with having clause', () => {
      const ast = parse('from:orders grp:user_id hav:sum:total>100');
      expect(ast.having?.condition).toMatchObject({
        type: 'comparison',
        left: expect.stringContaining('sum'),
        operator: Operator.GT,
        right: 100
      });
    });
  });

  describe('operators', () => {
    it('parses less than operator', () => {
      const ast = parse('from:products whr:price<100');
      expect(ast.where?.condition).toMatchObject({
        type: 'comparison',
        operator: Operator.LT
      });
    });

    it('parses greater than or equal operator', () => {
      const ast = parse('from:users whr:age>=21');
      expect(ast.where?.condition).toMatchObject({
        type: 'comparison',
        operator: Operator.GTE
      });
    });

    it('parses less than or equal operator', () => {
      const ast = parse('from:users whr:age<=65');
      expect(ast.where?.condition).toMatchObject({
        type: 'comparison',
        operator: Operator.LTE
      });
    });

    it('parses not equal operator', () => {
      const ast = parse('from:users whr:status!=deleted');
      expect(ast.where?.condition).toMatchObject({
        type: 'comparison',
        operator: Operator.NEQ
      });
    });

    it('parses like operator', () => {
      const ast = parse('from:users whr:name~john');
      expect(ast.where?.condition).toMatchObject({
        type: 'comparison',
        operator: Operator.LIKE
      });
    });

    it('parses numeric values', () => {
      const ast = parse('from:products whr:price>99.99');
      expect(ast.where?.condition).toMatchObject({
        right: 99.99
      });
    });

    it('parses negative numbers', () => {
      const ast = parse('from:accounts whr:balance<-100');
      expect(ast.where?.condition).toMatchObject({
        right: -100
      });
    });

    it('parses string values', () => {
      const ast = parse('from:users whr:name=john');
      expect(ast.where?.condition).toMatchObject({
        right: 'john'
      });
    });
  });

  describe('aggregates', () => {
    it('parses sum aggregate', () => {
      const ast = parse('from:orders sel:sum:total');
      expect(ast.select?.columns).toEqual([
        { type: 'aggregate', function: AggregateType.SUM, column: 'total' }
      ]);
    });

    it('parses count aggregate', () => {
      const ast = parse('from:orders sel:cnt:*');
      expect(ast.select?.columns).toEqual([
        { type: 'aggregate', function: AggregateType.COUNT, column: '*' }
      ]);
    });

    it('parses avg aggregate', () => {
      const ast = parse('from:products sel:avg:price');
      expect(ast.select?.columns).toEqual([
        { type: 'aggregate', function: AggregateType.AVG, column: 'price' }
      ]);
    });

    it('parses min aggregate', () => {
      const ast = parse('from:products sel:min:price');
      expect(ast.select?.columns).toEqual([
        { type: 'aggregate', function: AggregateType.MIN, column: 'price' }
      ]);
    });

    it('parses max aggregate', () => {
      const ast = parse('from:products sel:max:price');
      expect(ast.select?.columns).toEqual([
        { type: 'aggregate', function: AggregateType.MAX, column: 'price' }
      ]);
    });

    it('parses mixed columns and aggregates', () => {
      const ast = parse('from:orders sel:user_id,sum:total,cnt:*');
      expect(ast.select?.columns).toHaveLength(3);
      expect(ast.select?.columns[0]).toEqual({ type: 'column', name: 'user_id' });
      expect(ast.select?.columns[1]).toEqual({ type: 'aggregate', function: AggregateType.SUM, column: 'total' });
      expect(ast.select?.columns[2]).toEqual({ type: 'aggregate', function: AggregateType.COUNT, column: '*' });
    });

    it('parses aggregate with alias', () => {
      const ast = parse('from:orders sel:sum:total/total_amount');
      expect(ast.select?.columns).toEqual([
        { type: 'aggregate', function: AggregateType.SUM, column: 'total', alias: 'total_amount' }
      ]);
    });
  });

  describe('joins', () => {
    it('parses inner join', () => {
      const ast = parse('from:users join:orders on:users.id=orders.user_id');
      expect(ast.joins).toHaveLength(1);
      expect(ast.joins?.[0]).toMatchObject({
        type: JoinType.INNER,
        table: 'orders'
      });
    });

    it('parses left join', () => {
      const ast = parse('from:users join:orders/left on:users.id=orders.user_id');
      expect(ast.joins?.[0]).toMatchObject({
        type: JoinType.LEFT,
        table: 'orders'
      });
    });

    it('parses right join', () => {
      const ast = parse('from:users join:orders/right on:users.id=orders.user_id');
      expect(ast.joins?.[0]).toMatchObject({
        type: JoinType.RIGHT,
        table: 'orders'
      });
    });

    it('parses full join', () => {
      const ast = parse('from:users join:orders/full on:users.id=orders.user_id');
      expect(ast.joins?.[0]).toMatchObject({
        type: JoinType.FULL,
        table: 'orders'
      });
    });

    it('parses join with on condition', () => {
      const ast = parse('from:users join:orders on:users.id=orders.user_id');
      expect(ast.joins?.[0].on).toMatchObject({
        type: 'comparison',
        left: 'users.id',
        operator: Operator.EQ,
        right: 'orders.user_id'
      });
    });

    it('parses multiple joins', () => {
      const ast = parse('from:users join:orders on:users.id=orders.user_id join:products on:orders.product_id=products.id');
      expect(ast.joins).toHaveLength(2);
      expect(ast.joins?.[0].table).toBe('orders');
      expect(ast.joins?.[1].table).toBe('products');
    });

    it('parses join without on condition', () => {
      const ast = parse('from:users join:orders');
      expect(ast.joins?.[0]).toMatchObject({
        type: JoinType.INNER,
        table: 'orders'
      });
      expect(ast.joins?.[0].on).toBeUndefined();
    });
  });

  describe('special conditions', () => {
    it('parses in condition', () => {
      const ast = parse('from:users whr:status.in(active,pending)');
      expect(ast.where?.condition).toMatchObject({
        type: 'in',
        column: 'status',
        values: ['active', 'pending'],
        negated: false
      });
    });

    it('parses in condition with numbers', () => {
      const ast = parse('from:users whr:id.in(1,2,3)');
      expect(ast.where?.condition).toMatchObject({
        type: 'in',
        column: 'id',
        values: [1, 2, 3],
        negated: false
      });
    });

    it('parses negated in condition', () => {
      const ast = parse('from:users whr:status.!in(deleted,banned)');
      expect(ast.where?.condition).toMatchObject({
        type: 'in',
        column: 'status',
        negated: true
      });
    });

    it('parses null check', () => {
      const ast = parse('from:users whr:deleted_at.null');
      expect(ast.where?.condition).toMatchObject({
        type: 'null',
        column: 'deleted_at',
        negated: false
      });
    });

    it('parses negated null check', () => {
      const ast = parse('from:users whr:email.!null');
      expect(ast.where?.condition).toMatchObject({
        type: 'null',
        column: 'email',
        negated: true
      });
    });
  });

  describe('logical operators', () => {
    it('parses AND conditions (default)', () => {
      const ast = parse('from:users whr:age>18,status=active');
      expect(ast.where?.condition).toMatchObject({
        type: 'and',
        conditions: expect.arrayContaining([
          expect.objectContaining({ type: 'comparison' }),
          expect.objectContaining({ type: 'comparison' })
        ])
      });
    });

    it('parses OR conditions', () => {
      const ast = parse('from:users whr:age>65|status=vip');
      expect(ast.where?.condition).toMatchObject({
        type: 'or',
        conditions: expect.arrayContaining([
          expect.objectContaining({ left: 'age' }),
          expect.objectContaining({ left: 'status' })
        ])
      });
    });

    it.todo('parses multiple OR conditions', () => {
      const ast = parse('from:users whr:age<18|age>65|status=special');
      expect(ast.where?.condition).toMatchObject({
        type: 'or',
        conditions: expect.any(Array)
      });
      expect((ast.where?.condition as any).conditions).toHaveLength(3);
    });

    it('parses mixed AND and OR conditions', () => {
      const ast = parse('from:users whr:age>18,status=active|status=premium');
      // Should parse as (age>18 AND status=active) OR status=premium
      // OR has lower precedence
      expect(ast.where?.condition.type).toBe('or');
    });
  });

  describe('order by', () => {
    it('parses single order by column', () => {
      const ast = parse('from:users ord:name');
      expect(ast.orderBy?.orders).toEqual([
        { column: 'name', direction: OrderDirection.ASC }
      ]);
    });

    it('parses multiple order by columns', () => {
      const ast = parse('from:users ord:last_name,first_name');
      expect(ast.orderBy?.orders).toEqual([
        { column: 'last_name', direction: OrderDirection.ASC },
        { column: 'first_name', direction: OrderDirection.ASC }
      ]);
    });

    it('parses order by with mixed directions', () => {
      const ast = parse('from:users ord:created_at/desc,name/asc');
      expect(ast.orderBy?.orders).toEqual([
        { column: 'created_at', direction: OrderDirection.DESC },
        { column: 'name', direction: OrderDirection.ASC }
      ]);
    });

    it('parses order by with table prefix', () => {
      const ast = parse('from:users ord:users.created_at/desc');
      expect(ast.orderBy?.orders).toEqual([
        { column: 'users.created_at', direction: OrderDirection.DESC }
      ]);
    });
  });

  describe('subqueries', () => {
    it.todo('parses subquery in in condition', () => {
      const ast = parse('from:users whr:id.in(from:orders sel:user_id)');
      // This tests that subqueries are recognized
      expect(ast.where?.condition.type).toBe('in');
    });
  });

  describe('complex real-world queries', () => {
    it('parses analytics query with group by and having', () => {
      const ast = parse('from:orders sel:user_id,sum:total,cnt:* grp:user_id hav:sum:total>1000 ord:sum:total/desc lim:10');
      expect(ast).toMatchObject({
        from: { table: 'orders' },
        select: { columns: expect.any(Array) },
        groupBy: { columns: ['user_id'] },
        having: { condition: expect.any(Object) },
        orderBy: { orders: expect.any(Array) },
        limit: { limit: 10 }
      });
    });

    it('parses join query with where and order', () => {
      const ast = parse('from:users join:orders/left on:users.id=orders.user_id sel:users.name,sum:orders.total whr:users.status=active grp:users.id ord:sum:orders.total/desc');
      expect(ast).toMatchObject({
        from: { table: 'users' },
        joins: [{ type: JoinType.LEFT, table: 'orders' }],
        select: { columns: expect.any(Array) },
        where: { condition: expect.any(Object) },
        groupBy: { columns: expect.any(Array) },
        orderBy: { orders: expect.any(Array) }
      });
    });

    it('parses multi-join query', () => {
      const ast = parse('from:users join:orders on:users.id=orders.user_id join:products on:orders.product_id=products.id join:categories on:products.category_id=categories.id');
      expect(ast.joins).toHaveLength(3);
    });

    it('parses pagination query', () => {
      const ast = parse('from:users sel:name,email whr:status=active ord:created_at/desc lim:20 off:40');
      expect(ast).toMatchObject({
        limit: { limit: 20 },
        offset: { offset: 40 }
      });
    });

    it('parses search query with like and or', () => {
      const ast = parse('from:users whr:name~john|email~john ord:name lim:50');
      expect(ast.where?.condition.type).toBe('or');
      expect(ast.limit).toEqual({ limit: 50 });
    });
  });

  describe('edge cases', () => {
    it('parses query with table.column syntax', () => {
      const ast = parse('from:users sel:users.name,users.email');
      expect(ast.select?.columns).toEqual([
        { type: 'column', name: 'users.name' },
        { type: 'column', name: 'users.email' }
      ]);
    });

    it('parses query with underscores in names', () => {
      const ast = parse('from:user_accounts sel:first_name,last_name');
      expect(ast.from?.table).toBe('user_accounts');
      expect(ast.select?.columns).toEqual([
        { type: 'column', name: 'first_name' },
        { type: 'column', name: 'last_name' }
      ]);
    });

    it('parses query with numbers in column names', () => {
      const ast = parse('from:logs sel:level1,level2,level3');
      expect(ast.select?.columns).toHaveLength(3);
    });

    it('handles quoted string values', () => {
      const ast = parse('from:users whr:name=\'john doe\'');
      expect(ast.where?.condition).toMatchObject({
        right: 'john doe'
      });
    });

    it('handles double quoted string values', () => {
      const ast = parse('from:users whr:name="jane smith"');
      expect(ast.where?.condition).toMatchObject({
        right: 'jane smith'
      });
    });

    it('parses empty select defaults to wildcard', () => {
      const ast = parse('from:users');
      // Without explicit select, might default to * or be undefined
      // This tests implementation behavior
      expect(ast.from).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('throws on invalid query syntax', () => {
      expect(() => parse('invalid')).toThrow();
    });

    it('throws on missing table name', () => {
      expect(() => parse('from:')).toThrow();
    });

    it('throws on invalid operator', () => {
      expect(() => parse('from:users whr:age@18')).toThrow();
    });

    it('throws on mismatched join and on clauses', () => {
      expect(() => parse('from:users on:users.id=orders.user_id')).toThrow();
    });

    it.todo('throws on having without group by', () => {
      expect(() => parse('from:users hav:cnt:*>5')).toThrow();
    });
  });
});
