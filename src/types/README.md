# sqwind Type Safety Layer

Complete TypeScript type system for schema-aware, compile-time validated SQL queries.

## Overview

The sqwind type safety layer enables:

- **Compile-time validation** - Invalid column names and table names error at compile time
- **Type inference** - Query result types automatically match selected columns
- **Runtime safety** - Schema validation at runtime for additional protection
- **Seamless integration** - Works with both template literal and builder APIs

## Quick Start

```typescript
import { defineSchema } from 'sqwind/types';

// Define your database schema
const db = defineSchema({
  users: {
    id: 'number',
    name: 'string',
    email: 'string',
    age: 'number',
  },
  orders: {
    id: 'number',
    user_id: 'number',
    total: 'number',
    status: 'string',
  },
});

// Type-safe queries - invalid columns error at compile time!
const query1 = db.users.sel('name', 'email').toQuery();  // ✅
const query2 = db.users.sel('invalid').toQuery();        // ❌ Type error

// Type-safe tagged templates
const query3 = db.sqw`from:users sel:name,email`;        // ✅
const query4 = db.sqw`from:users sel:invalid`;           // ❌ Runtime error
```

## Core Types

### ColumnType

Supported column types in schema definitions:

```typescript
type ColumnType = 'string' | 'number' | 'boolean' | 'date' | 'json';
```

### TableSchema

Schema definition for a single table:

```typescript
type TableSchema = Record<string, ColumnType>;

// Example:
const usersSchema = {
  id: 'number',
  name: 'string',
  email: 'string',
  age: 'number',
} satisfies TableSchema;
```

### DatabaseSchema

Complete database schema with multiple tables:

```typescript
type DatabaseSchema = Record<string, TableSchema>;

// Example:
const dbSchema = {
  users: { id: 'number', name: 'string' },
  orders: { id: 'number', total: 'number' },
} satisfies DatabaseSchema;
```

## Type-Safe Query Builder

### TypedQueryBuilder<T>

The typed query builder provides compile-time validation for all operations:

```typescript
interface TypedQueryBuilder<T extends TableSchema> {
  // Select specific columns (narrows the result type)
  sel<K extends keyof T>(...columns: K[]): TypedQueryBuilder<Pick<T, K>>;

  // Add WHERE condition (validates column and value type)
  whr<K extends keyof T>(
    column: K,
    op: WhereOperator,
    value: MapColumnType<T[K]>
  ): TypedQueryBuilder<T>;

  // Add ORDER BY (validates column exists)
  ord<K extends keyof T>(column: K, direction?: 'asc' | 'desc'): TypedQueryBuilder<T>;

  // Add LIMIT
  lim(limit: number): TypedQueryBuilder<T>;

  // Add OFFSET
  off(offset: number): TypedQueryBuilder<T>;

  // Convert to executable query
  toQuery(): Query;
}
```

### Usage Examples

```typescript
const db = defineSchema({
  users: {
    id: 'number',
    name: 'string',
    email: 'string',
    age: 'number',
  },
});

// Select specific columns
const q1 = db.users
  .sel('name', 'email')  // Only name and email are now available
  .toQuery();

// Where with type checking
const q2 = db.users
  .whr('age', '>', 18)     // ✅ 18 is a number (matches 'age' type)
  .whr('age', '>', 'foo')  // ❌ Type error: string not assignable to number
  .toQuery();

// Order by
const q3 = db.users
  .ord('name', 'asc')      // ✅ 'name' exists
  .ord('invalid', 'asc')   // ❌ Type error: 'invalid' not in schema
  .toQuery();

// Chain multiple operations
const q4 = db.users
  .sel('name', 'email', 'age')
  .whr('age', '>=', 21)
  .ord('name', 'asc')
  .lim(10)
  .off(20)
  .toQuery();
```

## Type Mapping

The `MapColumnType<T>` utility maps schema types to TypeScript types:

```typescript
type MapColumnType<T extends ColumnType> =
  T extends 'string' ? string :
  T extends 'number' ? number :
  T extends 'boolean' ? boolean :
  T extends 'date' ? Date :
  T extends 'json' ? unknown :
  never;
```

This ensures type safety when passing values to WHERE clauses:

```typescript
const db = defineSchema({
  products: {
    name: 'string',
    price: 'number',
    in_stock: 'boolean',
    created_at: 'date',
  },
});

// Type-checked values
db.products.whr('name', '=', 'Widget');           // ✅ string
db.products.whr('price', '>', 99.99);             // ✅ number
db.products.whr('in_stock', '=', true);           // ✅ boolean
db.products.whr('created_at', '>', new Date());   // ✅ Date

db.products.whr('price', '>', 'expensive');       // ❌ Type error
```

## Advanced Type Utilities

### Column Filtering

Filter columns by type:

```typescript
type StringColumns<T> = keyof FilterByType<T, 'string'>;
type NumberColumns<T> = keyof FilterByType<T, 'number'>;
type BooleanColumns<T> = keyof FilterByType<T, 'boolean'>;
type DateColumns<T> = keyof FilterByType<T, 'date'>;
type JsonColumns<T> = keyof FilterByType<T, 'json'>;

// Example:
type UserSchema = {
  id: 'number';
  name: 'string';
  email: 'string';
  age: 'number';
};

type UserStrings = StringColumns<UserSchema>;  // 'name' | 'email'
type UserNumbers = NumberColumns<UserSchema>;  // 'id' | 'age'
```

### Schema to TypeScript Object

Convert a schema to a TypeScript object type:

```typescript
type SchemaToType<T extends TableSchema> = {
  [K in keyof T]: MapColumnType<T[K]>;
};

// Example:
type UserRow = SchemaToType<{
  id: 'number';
  name: 'string';
  email: 'string';
}>;
// Result: { id: number; name: string; email: string }
```

### Insert and Update Types

Generate types for insert and update operations:

```typescript
// InsertType: All columns required except auto-increment
type InsertType<T extends TableSchema, AutoColumns extends keyof T = never> =
  Omit<RequiredSchema<T>, AutoColumns>;

// UpdateType: All columns optional except primary key
type UpdateType<T extends TableSchema, KeyColumn extends keyof T = never> =
  Partial<Omit<SchemaToType<T>, KeyColumn>> & Pick<SchemaToType<T>, KeyColumn>;

// Example:
type UserSchema = {
  id: 'number';
  name: 'string';
  email: 'string';
};

type NewUser = InsertType<UserSchema, 'id'>;
// Result: { name: string; email: string }

type UpdateUser = UpdateType<UserSchema, 'id'>;
// Result: { id: number; name?: string; email?: string }
```

### Join Types

Types for join operations:

```typescript
// Inner join: both tables required
type JoinResult<T1, T2> = SchemaToType<T1> & SchemaToType<T2>;

// Left join: second table optional
type LeftJoinResult<T1, T2> = SchemaToType<T1> & Partial<SchemaToType<T2>>;
```

## Query Validation

### Runtime Validation

The `defineSchema` function creates a database instance that validates:

1. **Table names** - Ensures referenced tables exist in schema
2. **Column names** - Ensures referenced columns exist in table
3. **Query structure** - Basic validation of query syntax

```typescript
const db = defineSchema({
  users: { id: 'number', name: 'string' },
});

// Runtime errors for invalid queries
db.sqw`from:invalid sel:name`;     // ❌ Error: Table 'invalid' not found
db.sqw`from:users sel:invalid`;    // ❌ Error: Column 'invalid' not found
```

### Compile-Time Validation

TypeScript's type system validates:

1. **Column existence** - Only existing columns can be selected
2. **Type compatibility** - Values must match column types
3. **Method chaining** - Return types narrow based on selections

```typescript
const db = defineSchema({
  users: { id: 'number', name: 'string' },
});

// Compile-time type errors
db.users.sel('invalid');           // ❌ Type error
db.users.whr('id', '=', 'text');   // ❌ Type error
```

## Best Practices

### 1. Use `as const` for Schema Literals

```typescript
// ✅ Good: Preserves literal types
const db = defineSchema({
  users: {
    id: 'number' as const,
    name: 'string' as const,
  },
});

// ⚠️ Works but less precise
const db = defineSchema({
  users: {
    id: 'number',
    name: 'string',
  },
});
```

### 2. Extract Schema Types

```typescript
// Define schema once
const schema = {
  users: {
    id: 'number' as const,
    name: 'string' as const,
  },
} as const;

// Use in multiple places
const db = defineSchema(schema);
type UserRow = SchemaToType<typeof schema.users>;
```

### 3. Leverage Type Inference

```typescript
// Let TypeScript infer the result type
const users = db.users
  .sel('name', 'email')
  .whr('age', '>', 18)
  .toQuery();

// The result type is automatically: { name: string; email: string }[]
```

### 4. Use Helper Types

```typescript
// Create reusable type aliases
type UserTable = GetTableSchema<typeof db, 'users'>;
type UserColumns = ColumnNames<UserTable>;
type UserInsert = InsertType<UserTable, 'id'>;
```

## API Reference

See the individual files for complete API documentation:

- **[schema.ts](./schema.ts)** - Core schema definition and typed database
- **[inference.ts](./inference.ts)** - Advanced type utilities and inference
- **[index.ts](./index.ts)** - Public exports

## Examples

See [examples/type-safety-demo.ts](../../examples/type-safety-demo.ts) for a complete working example.

## Integration with sqwind

The type system integrates seamlessly with sqwind's runtime:

```typescript
import { defineSchema } from 'sqwind/types';
import { compile } from 'sqwind';

const db = defineSchema({
  users: { id: 'number', name: 'string', email: 'string' },
});

// Build query with type safety
const query = db.users
  .sel('name', 'email')
  .whr('id', '=', 123)
  .toQuery();

// Compile to SQL (if needed)
const sql = compile(query.sql);
console.log(sql);  // SELECT name, email FROM users WHERE id = 123
```

## TypeScript Configuration

For best results, ensure your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "lib": ["ES2022"]
  }
}
```

## License

MIT
