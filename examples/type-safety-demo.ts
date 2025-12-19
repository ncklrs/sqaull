/**
 * Type Safety Demonstration
 *
 * This file demonstrates the compile-time type safety features
 * of sqwind's schema-aware type system.
 */

import { defineSchema } from '../src/types';

// Define a typed database schema
const db = defineSchema({
  users: {
    id: 'number' as const,
    name: 'string' as const,
    email: 'string' as const,
    age: 'number' as const,
    created_at: 'date' as const,
  },
  orders: {
    id: 'number' as const,
    user_id: 'number' as const,
    total: 'number' as const,
    status: 'string' as const,
    created_at: 'date' as const,
  },
  products: {
    id: 'number' as const,
    name: 'string' as const,
    price: 'number' as const,
    in_stock: 'boolean' as const,
    metadata: 'json' as const,
  },
});

// ✅ VALID: Type-safe tagged template queries
const query1 = db.sqw`from:users sel:name,email`;
console.log('Query 1:', query1);

// ✅ VALID: Type-safe builder API with column validation
const query2 = db.users
  .sel('name', 'email', 'age')
  .whr('age', '>', 18)
  .ord('name', 'asc')
  .lim(10)
  .toQuery();
console.log('Query 2:', query2);

// ✅ VALID: All columns selected (no sel clause)
const query3 = db.users
  .whr('id', '=', 1)
  .toQuery();
console.log('Query 3:', query3);

// ✅ VALID: Multiple where conditions
const query4 = db.orders
  .sel('id', 'total', 'status', 'user_id')
  .whr('user_id', '=', 123)
  .whr('status', '=', 'pending')
  .toQuery();
console.log('Query 4:', query4);

// ✅ VALID: Boolean column
const query5 = db.products
  .sel('name', 'price', 'in_stock')
  .whr('in_stock', '=', true)
  .toQuery();
console.log('Query 5:', query5);

// ✅ VALID: Date column
const query6 = db.users
  .sel('name', 'created_at')
  .ord('created_at', 'desc')
  .toQuery();
console.log('Query 6:', query6);

// ✅ VALID: JSON column
const query7 = db.products
  .sel('name', 'metadata')
  .toQuery();
console.log('Query 7:', query7);

// ❌ COMPILE ERROR: Invalid column name (uncomment to test)
// const badQuery1 = db.users.sel('invalid_column');
// Type error: Argument of type '"invalid_column"' is not assignable to parameter of type 'keyof { ... }'

// ❌ COMPILE ERROR: Invalid table (uncomment to test)
// const badQuery2 = db.sqw`from:invalid_table sel:name`;
// Runtime error: Table 'invalid_table' not found in schema

// ❌ COMPILE ERROR: Wrong value type (uncomment to test)
// const badQuery3 = db.users.whr('age', '>', 'not-a-number');
// Type error: Argument of type 'string' is not assignable to parameter of type 'number'

console.log('\n✅ All type-safe queries executed successfully!');
console.log('\nSchema:', db.schema);
