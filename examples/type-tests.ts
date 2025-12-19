/**
 * Type System Tests
 *
 * This file demonstrates the type system's compile-time validation.
 * Uncomment the error examples to see TypeScript catch invalid queries.
 */

import type {
  ColumnType,
  TableSchema,
  DatabaseSchema,
  MapColumnType,
  SchemaToType,
  ColumnNames,
  StringColumns,
  NumberColumns,
  BooleanColumns,
  DateColumns,
  FilterByType,
  InsertType,
  UpdateType,
  InferResult,
} from '../src/types';
import { defineSchema } from '../src/types';

// =============================================================================
// Type Mapping Tests
// =============================================================================

// Test: MapColumnType correctly maps schema types to TypeScript types
type StringType = MapColumnType<'string'>;    // string
type NumberType = MapColumnType<'number'>;    // number
type BooleanType = MapColumnType<'boolean'>;  // boolean
type DateType = MapColumnType<'date'>;        // Date
type JsonType = MapColumnType<'json'>;        // unknown

// Verify assignments work correctly
const str: StringType = 'hello';
const num: NumberType = 42;
const bool: BooleanType = true;
const date: DateType = new Date();
const json: JsonType = { any: 'value' };

// =============================================================================
// Schema to Type Tests
// =============================================================================

type UserSchema = {
  id: 'number';
  name: 'string';
  email: 'string';
  age: 'number';
  is_active: 'boolean';
  created_at: 'date';
  metadata: 'json';
};

// Test: SchemaToType converts schema to object type
type UserRow = SchemaToType<UserSchema>;
const user: UserRow = {
  id: 1,
  name: 'John',
  email: 'john@example.com',
  age: 30,
  is_active: true,
  created_at: new Date(),
  metadata: { role: 'admin' },
};

// =============================================================================
// Column Name Extraction Tests
// =============================================================================

// Test: ColumnNames extracts all column names as union
type UserColumns = ColumnNames<UserSchema>;
const col1: UserColumns = 'id';
const col2: UserColumns = 'name';
const col3: UserColumns = 'email';
// const col4: UserColumns = 'invalid';  // ❌ Type error

// =============================================================================
// Column Filtering Tests
// =============================================================================

// Test: Filter columns by type
type UserStrings = StringColumns<UserSchema>;     // 'name' | 'email'
type UserNumbers = NumberColumns<UserSchema>;     // 'id' | 'age'
type UserBooleans = BooleanColumns<UserSchema>;   // 'is_active'
type UserDates = DateColumns<UserSchema>;         // 'created_at'

const strCol: UserStrings = 'name';
const numCol: UserNumbers = 'id';
const boolCol: UserBooleans = 'is_active';
const dateCol: UserDates = 'created_at';

// Test: FilterByType preserves schema structure
type StringOnlySchema = FilterByType<UserSchema, 'string'>;
const stringSchema: StringOnlySchema = {
  name: 'string',
  email: 'string',
};

// =============================================================================
// Insert/Update Type Tests
// =============================================================================

// Test: InsertType excludes auto-increment columns
type NewUser = InsertType<UserSchema, 'id'>;
const newUser: NewUser = {
  name: 'Jane',
  email: 'jane@example.com',
  age: 25,
  is_active: true,
  created_at: new Date(),
  metadata: {},
};
// const badInsert: NewUser = { name: 'Jane' };  // ❌ Missing required fields

// Test: UpdateType makes all optional except key
type UpdateUser = UpdateType<UserSchema, 'id'>;
const updateUser: UpdateUser = {
  id: 1,  // Required
  name: 'Jane Doe',  // Optional
};
const updateUser2: UpdateUser = {
  id: 2,
  age: 26,
  is_active: false,
};

// =============================================================================
// Database Schema Tests
// =============================================================================

const testSchema = {
  users: {
    id: 'number' as const,
    name: 'string' as const,
    email: 'string' as const,
    age: 'number' as const,
  },
  orders: {
    id: 'number' as const,
    user_id: 'number' as const,
    total: 'number' as const,
    status: 'string' as const,
  },
  products: {
    id: 'number' as const,
    name: 'string' as const,
    price: 'number' as const,
    in_stock: 'boolean' as const,
  },
} satisfies DatabaseSchema;

const db = defineSchema(testSchema);

// =============================================================================
// Query Builder Type Tests
// =============================================================================

// Test: sel() narrows available columns
const q1 = db.users.sel('name', 'email');
// q1 now only has 'name' and 'email' - cannot use other columns

// Test: whr() validates column existence
const q2 = db.users.whr('age', '>', 18);  // ✅
// const q3 = db.users.whr('invalid', '=', 1);  // ❌ Type error

// Test: whr() validates value type
const q4 = db.users.whr('age', '>', 18);       // ✅ number
const q5 = db.users.whr('name', '=', 'John');  // ✅ string
// const q6 = db.users.whr('age', '>', 'text');   // ❌ Type error

// Test: ord() validates column existence
const q7 = db.users.ord('name', 'asc');   // ✅
// const q8 = db.users.ord('invalid', 'asc');  // ❌ Type error

// Test: Method chaining
const q9 = db.users
  .sel('name', 'email', 'age')
  .whr('age', '>=', 21)
  .ord('name', 'asc')
  .lim(10)
  .off(5)
  .toQuery();

// Test: Table accessors work
const usersBuilder = db.users;
const ordersBuilder = db.orders;
const productsBuilder = db.products;
// const invalid = db.invalid;  // ❌ Property 'invalid' does not exist

// =============================================================================
// Tagged Template Tests
// =============================================================================

// Test: Tagged template queries
const tq1 = db.sqw`from:users sel:name,email`;
const tq2 = db.sqw`from:orders sel:id,total,status`;

// Runtime validation - these throw errors
// const tq3 = db.sqw`from:invalid sel:name`;      // ❌ Runtime error
// const tq4 = db.sqw`from:users sel:invalid`;     // ❌ Runtime error

// =============================================================================
// Result Type Inference Tests
// =============================================================================

// Test: InferResult extracts correct result type from query string
type UsersResult = InferResult<typeof testSchema, 'from:users sel:name,email'>;
// Should be: { name: string; email: string }[]

type OrdersResult = InferResult<typeof testSchema, 'from:orders sel:total'>;
// Should be: { total: number }[]

// =============================================================================
// Complex Scenarios
// =============================================================================

// Test: Multiple where conditions
const complex1 = db.orders
  .whr('user_id', '=', 123)  // Filter first
  .whr('total', '>', 100)
  .whr('status', '=', 'pending')
  .sel('id', 'total', 'status')  // Then select
  .ord('total', 'desc')
  .lim(20)
  .toQuery();

// Test: Boolean columns
const complex2 = db.products
  .sel('name', 'price', 'in_stock')
  .whr('in_stock', '=', true)
  .whr('price', '<', 1000)
  .ord('price', 'asc')
  .toQuery();

// Test: All columns (no sel)
const complex3 = db.users
  .whr('age', '>', 18)
  .ord('name', 'asc')
  .toQuery();

// Test: Schema access
const userSchema = db.schema.users;
const orderSchema = db.schema.orders;

console.log('✅ All type tests passed!');
console.log('Uncomment the error examples to verify compile-time validation.');

// =============================================================================
// Export for type checking
// =============================================================================

export type {
  UserSchema,
  UserRow,
  UserColumns,
  UserStrings,
  UserNumbers,
  NewUser,
  UpdateUser,
  UsersResult,
  OrdersResult,
};
