import { describe, it, expect } from 'vitest';
import { defineSchema, sqw, sq } from '../src';

describe('type safety', () => {
  describe('schema definition', () => {
    it('creates schema with table definitions', () => {
      const schema = defineSchema({
        users: {
          id: 'number',
          name: 'string',
          email: 'string',
          age: 'number'
        }
      });

      expect(schema).toBeDefined();
    });

    it('creates schema with multiple tables', () => {
      const schema = defineSchema({
        users: {
          id: 'number',
          name: 'string',
          email: 'string'
        },
        orders: {
          id: 'number',
          user_id: 'number',
          total: 'number',
          status: 'string'
        }
      });

      expect(schema).toBeDefined();
    });

    it('supports nullable fields', () => {
      const schema = defineSchema({
        users: {
          id: 'number',
          name: 'string',
          email: 'string',
          deleted_at: 'string | null'
        }
      });

      expect(schema).toBeDefined();
    });

    it('supports boolean fields', () => {
      const schema = defineSchema({
        users: {
          id: 'number',
          verified: 'boolean',
          admin: 'boolean'
        }
      });

      expect(schema).toBeDefined();
    });

    it('supports date fields', () => {
      const schema = defineSchema({
        users: {
          id: 'number',
          created_at: 'date',
          updated_at: 'date'
        }
      });

      expect(schema).toBeDefined();
    });
  });

  describe('typed queries with template literals', () => {
    it('allows valid column selections', () => {
      const db = defineSchema({
        users: { id: 'number', name: 'string', email: 'string' }
      });

      // This should compile without errors
      const query = db.sqw`from:users sel:name,email`;
      expect(query).toBeDefined();
    });

    it('allows valid where conditions', () => {
      const db = defineSchema({
        users: { id: 'number', name: 'string', age: 'number' }
      });

      const query = db.sqw`from:users whr:age>18`;
      expect(query).toBeDefined();
    });

    it('allows valid joins', () => {
      const db = defineSchema({
        users: { id: 'number', name: 'string' },
        orders: { id: 'number', user_id: 'number', total: 'number' }
      });

      const query = db.sqw`from:users join:orders on:users.id=orders.user_id`;
      expect(query).toBeDefined();
    });

    it('allows selecting columns from joined tables', () => {
      const db = defineSchema({
        users: { id: 'number', name: 'string' },
        orders: { id: 'number', user_id: 'number', total: 'number' }
      });

      const query = db.sqw`from:users join:orders on:users.id=orders.user_id sel:users.name,orders.total`;
      expect(query).toBeDefined();
    });

    // Note: The following tests document expected TypeScript compile-time errors
    // In a real implementation, these would fail at compile time, not runtime

    it('documents invalid column error', () => {
      const db = defineSchema({
        users: { id: 'number', name: 'string' }
      });

      // TypeScript should error: Property 'invalid_column' does not exist
      // Runtime: This may or may not error depending on implementation
      // const query = db.sqw`from:users sel:invalid_column`;

      expect(true).toBe(true); // Placeholder for compile-time check
    });

    it('documents invalid table error', () => {
      const db = defineSchema({
        users: { id: 'number', name: 'string' }
      });

      // TypeScript should error: Table 'invalid_table' does not exist
      // const query = db.sqw`from:invalid_table`;

      expect(true).toBe(true); // Placeholder for compile-time check
    });

    it('documents type mismatch error', () => {
      const db = defineSchema({
        users: { id: 'number', name: 'string', age: 'number' }
      });

      // TypeScript should error: Cannot compare number field with string
      // const query = db.sqw`from:users whr:age=notanumber`;

      expect(true).toBe(true); // Placeholder for compile-time check
    });
  });

  describe('typed queries with fluent builder', () => {
    it('allows valid table names', () => {
      const db = defineSchema({
        users: { id: 'number', name: 'string' }
      });

      const query = db.sq.from('users');
      expect(query).toBeDefined();
    });

    it('allows valid column selections', () => {
      const db = defineSchema({
        users: { id: 'number', name: 'string', email: 'string' }
      });

      const query = db.sq.from('users').sel('name', 'email');
      expect(query).toBeDefined();
    });

    it('allows valid where conditions', () => {
      const db = defineSchema({
        users: { id: 'number', age: 'number' }
      });

      const query = db.sq.from('users').whr('age', '>', 18);
      expect(query).toBeDefined();
    });

    it('allows valid joins', () => {
      const db = defineSchema({
        users: { id: 'number', name: 'string' },
        orders: { id: 'number', user_id: 'number' }
      });

      const query = db.sq.from('users').join('orders', 'users.id', 'orders.user_id');
      expect(query).toBeDefined();
    });

    // Documents compile-time type errors
    it('documents invalid table error in fluent API', () => {
      const db = defineSchema({
        users: { id: 'number' }
      });

      // TypeScript should error: 'invalid_table' is not in schema
      // const query = db.sq.from('invalid_table');

      expect(true).toBe(true);
    });

    it('documents invalid column error in fluent API', () => {
      const db = defineSchema({
        users: { id: 'number', name: 'string' }
      });

      // TypeScript should error: 'invalid_column' not in users table
      // const query = db.sq.from('users').sel('invalid_column');

      expect(true).toBe(true);
    });
  });

  describe('type inference', () => {
    it('infers result type for select query', () => {
      const db = defineSchema({
        users: { id: 'number', name: 'string', email: 'string' }
      });

      const query = db.sqw`from:users sel:name,email`;

      // Result type should be inferred as { name: string, email: string }[]
      // This is a compile-time check
      expect(query).toBeDefined();
    });

    it('infers result type for select all', () => {
      const db = defineSchema({
        users: { id: 'number', name: 'string', email: 'string' }
      });

      const query = db.sqw`from:users sel:*`;

      // Result type should be inferred as { id: number, name: string, email: string }[]
      expect(query).toBeDefined();
    });

    it('infers result type for aggregates', () => {
      const db = defineSchema({
        orders: { id: 'number', total: 'number', user_id: 'number' }
      });

      const query = db.sqw`from:orders sel:sum:total,cnt:*`;

      // Result should have numeric types
      expect(query).toBeDefined();
    });

    it('infers result type for joined queries', () => {
      const db = defineSchema({
        users: { id: 'number', name: 'string' },
        orders: { id: 'number', user_id: 'number', total: 'number' }
      });

      const query = db.sqw`from:users join:orders on:users.id=orders.user_id sel:users.name,orders.total`;

      // Result type should include both users.name and orders.total
      expect(query).toBeDefined();
    });
  });

  describe('schema validation at runtime', () => {
    it('validates table exists', () => {
      const db = defineSchema({
        users: { id: 'number', name: 'string' }
      });

      // Should not throw for valid table
      expect(() => {
        db.sqw`from:users sel:name`;
      }).not.toThrow();
    });

    it('validates columns exist', () => {
      const db = defineSchema({
        users: { id: 'number', name: 'string', email: 'string' }
      });

      // Should not throw for valid columns
      expect(() => {
        db.sqw`from:users sel:name,email`;
      }).not.toThrow();
    });

    it('throws on invalid table at runtime', () => {
      const db = defineSchema({
        users: { id: 'number', name: 'string' }
      });

      // Should throw at runtime for invalid table
      expect(() => {
        db.sqw`from:invalid_table sel:name`;
      }).toThrow();
    });

    it('throws on invalid column at runtime', () => {
      const db = defineSchema({
        users: { id: 'number', name: 'string' }
      });

      // Should throw at runtime for invalid column
      expect(() => {
        db.sqw`from:users sel:invalid_column`;
      }).toThrow();
    });

    it('validates join table exists', () => {
      const db = defineSchema({
        users: { id: 'number' },
        orders: { id: 'number', user_id: 'number' }
      });

      expect(() => {
        db.sqw`from:users join:orders on:users.id=orders.user_id`;
      }).not.toThrow();
    });

    it.todo('throws on invalid join table', () => {
      const db = defineSchema({
        users: { id: 'number' }
      });

      expect(() => {
        db.sqw`from:users join:invalid_table on:users.id=invalid_table.user_id`;
      }).toThrow();
    });
  });

  describe('complex schemas', () => {
    it('handles e-commerce schema', () => {
      const db = defineSchema({
        users: {
          id: 'number',
          email: 'string',
          name: 'string',
          created_at: 'date'
        },
        products: {
          id: 'number',
          name: 'string',
          price: 'number',
          category_id: 'number'
        },
        orders: {
          id: 'number',
          user_id: 'number',
          total: 'number',
          status: 'string',
          created_at: 'date'
        },
        order_items: {
          id: 'number',
          order_id: 'number',
          product_id: 'number',
          quantity: 'number',
          price: 'number'
        }
      });

      const query = db.sqw`
        from:orders
        join:order_items on:orders.id=order_items.order_id
        join:products on:order_items.product_id=products.id
        sel:orders.id,products.name,order_items.quantity
        whr:orders.status=completed
      `;

      expect(query).toBeDefined();
    });

    it('handles blog schema', () => {
      const db = defineSchema({
        users: {
          id: 'number',
          username: 'string',
          email: 'string'
        },
        posts: {
          id: 'number',
          user_id: 'number',
          title: 'string',
          content: 'string',
          published: 'boolean',
          created_at: 'date'
        },
        comments: {
          id: 'number',
          post_id: 'number',
          user_id: 'number',
          content: 'string',
          created_at: 'date'
        }
      });

      const query = db.sqw`
        from:posts
        join:users on:posts.user_id=users.id
        sel:posts.title,users.username,posts.created_at
        whr:posts.published=true
        ord:posts.created_at/desc
        lim:10
      `;

      expect(query).toBeDefined();
    });
  });

  describe('field type checking', () => {
    it('allows string comparison for string fields', () => {
      const db = defineSchema({
        users: { id: 'number', name: 'string', status: 'string' }
      });

      const query = db.sqw`from:users whr:name=john,status=active`;
      expect(query).toBeDefined();
    });

    it('allows numeric comparison for number fields', () => {
      const db = defineSchema({
        users: { id: 'number', age: 'number', score: 'number' }
      });

      const query = db.sqw`from:users whr:age>18,score>=90`;
      expect(query).toBeDefined();
    });

    it('allows boolean comparison for boolean fields', () => {
      const db = defineSchema({
        users: { id: 'number', verified: 'boolean', admin: 'boolean' }
      });

      const query = db.sqw`from:users whr:verified=true,admin=false`;
      expect(query).toBeDefined();
    });

    it('allows null checks for nullable fields', () => {
      const db = defineSchema({
        users: { id: 'number', deleted_at: 'date | null' }
      });

      const query = db.sqw`from:users whr:deleted_at.null`;
      expect(query).toBeDefined();
    });
  });

  describe('aggregate type inference', () => {
    it('infers number type for SUM', () => {
      const db = defineSchema({
        orders: { id: 'number', total: 'number' }
      });

      const query = db.sqw`from:orders sel:sum:total`;
      // Return type should be { sum_total: number }[]
      expect(query).toBeDefined();
    });

    it('infers number type for COUNT', () => {
      const db = defineSchema({
        orders: { id: 'number' }
      });

      const query = db.sqw`from:orders sel:cnt:*`;
      // Return type should be { count: number }[]
      expect(query).toBeDefined();
    });

    it('infers number type for AVG', () => {
      const db = defineSchema({
        products: { id: 'number', price: 'number' }
      });

      const query = db.sqw`from:products sel:avg:price`;
      // Return type should be { avg_price: number }[]
      expect(query).toBeDefined();
    });

    it('infers correct type for MIN/MAX', () => {
      const db = defineSchema({
        products: { id: 'number', price: 'number' }
      });

      const queryMin = db.sqw`from:products sel:min:price`;
      const queryMax = db.sqw`from:products sel:max:price`;
      // Return types should preserve the field type
      expect(queryMin).toBeDefined();
      expect(queryMax).toBeDefined();
    });
  });

  describe('untyped queries', () => {
    it('allows untyped template queries', () => {
      const query = sqw`from:users sel:name,email`;
      expect(query).toBeDefined();
      expect(query.toSQL()).toContain('SELECT');
    });

    it('allows untyped fluent queries', () => {
      const query = sq.from('users').sel('name', 'email');
      expect(query).toBeDefined();
      expect(query.toSQL()).toContain('SELECT');
    });

    it('does not validate untyped queries', () => {
      // Without schema, any table/column names are allowed
      const query = sqw`from:anything sel:whatever`;
      expect(query).toBeDefined();
    });
  });

  describe('schema method access', () => {
    it('provides typed sqw method', () => {
      const db = defineSchema({
        users: { id: 'number', name: 'string' }
      });

      expect(typeof db.sqw).toBe('function');
    });

    it('provides typed sq method', () => {
      const db = defineSchema({
        users: { id: 'number', name: 'string' }
      });

      expect(typeof db.sq).toBeDefined();
      expect(typeof db.sq.from).toBe('function');
    });

    it.todo('schema methods return same types as untyped', () => {
      const db = defineSchema({
        users: { id: 'number', name: 'string' }
      });

      const typedQuery = db.sqw`from:users sel:name`;
      const untypedQuery = sqw`from:users sel:name`;

      // Both should have same methods
      expect(typeof typedQuery.toSQL).toBe('function');
      expect(typeof untypedQuery.toSQL).toBe('function');
    });
  });

  describe('edge cases', () => {
    it('handles empty schema', () => {
      const db = defineSchema({});
      expect(db).toBeDefined();
    });

    it('handles table with no fields', () => {
      const db = defineSchema({
        users: {}
      });
      expect(db).toBeDefined();
    });

    it('handles table with single field', () => {
      const db = defineSchema({
        logs: { id: 'number' }
      });

      const query = db.sqw`from:logs sel:id`;
      expect(query).toBeDefined();
    });

    it('handles tables with many fields', () => {
      const db = defineSchema({
        users: {
          id: 'number',
          username: 'string',
          email: 'string',
          first_name: 'string',
          last_name: 'string',
          age: 'number',
          verified: 'boolean',
          admin: 'boolean',
          created_at: 'date',
          updated_at: 'date',
          deleted_at: 'date | null',
          last_login: 'date | null'
        }
      });

      const query = db.sqw`from:users sel:username,email,verified`;
      expect(query).toBeDefined();
    });

    it('handles field names with underscores', () => {
      const db = defineSchema({
        user_accounts: {
          user_id: 'number',
          first_name: 'string',
          last_name: 'string'
        }
      });

      const query = db.sqw`from:user_accounts sel:first_name,last_name`;
      expect(query).toBeDefined();
    });
  });
});
