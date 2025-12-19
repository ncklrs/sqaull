# sqwind

### A Tailwind-inspired query language that compiles to SQL

---

## Vision

**What if writing SQL felt like writing Tailwind?**

Tailwind transformed CSS by replacing verbose, scattered stylesheets with composable utility classes you write right where you need them. `sqwind` brings that same philosophy to SQL.

Instead of:
```sql
SELECT name, email FROM users WHERE age > 18 ORDER BY created_at DESC LIMIT 10
```

You write:
```
from:users sel:name,email whr:age>18 ord:created_at/desc lim:10
```

The syntax is intentionally familiar. Colons separate utilities from values (like `hover:bg-blue`). Slashes add modifiers (like `md:text-lg`). Commas group related items. It's SQL distilled to its essence—composable, scannable, and expressive.

But `sqwind` isn't just shorthand. It's a complete query builder with type safety, parameterization, and multi-dialect support. Define your schema once, and get compile-time validation that catches typos and type mismatches before they hit your database.

---

## Installation

```bash
npm install sqwind
```

## Quick Start

```typescript
import { sqw, sq, defineSchema } from 'sqwind';

// Template literal API (primary)
const query = sqw`from:users sel:name,email whr:age>18 ord:name lim:10`;

query.toSQL();
// "SELECT name, email FROM users WHERE age > 18 ORDER BY name LIMIT 10"

query.toParams();
// { sql: "SELECT name, email FROM users WHERE age > $1 ORDER BY name LIMIT $2", params: [18, 10] }

// Fluent builder API
const query2 = sq
  .from('users')
  .sel('name', 'email')
  .whr('age', '>', 18)
  .ord('name')
  .lim(10);
```

## Type-Safe Queries

Define your schema and get compile-time validation:

```typescript
import { defineSchema } from 'sqwind';

const db = defineSchema({
  users: {
    id: 'number',
    name: 'string',
    email: 'string',
    age: 'number',
    created_at: 'date',
  },
  orders: {
    id: 'number',
    user_id: 'number',
    total: 'number',
    status: 'string',
  },
});

// ✅ Valid - columns exist in schema
db.sqw`from:users sel:name,email whr:age>18`;

// ✅ Type-safe fluent builder
db.sq.from('users').sel('name', 'email').whr('age', '>', 18);

// ❌ Runtime error - 'foo' is not a column in users
db.sqw`from:users sel:foo`;
```

## Syntax Reference

### Basic Clauses

| Utility | SQL Equivalent | Example |
|---------|---------------|---------|
| `from:table` | FROM table | `from:users` |
| `sel:cols` | SELECT cols | `sel:name,email` or `sel:*` |
| `whr:condition` | WHERE | `whr:age>18` `whr:status=active` |
| `ord:col` | ORDER BY | `ord:name` `ord:created_at/desc` |
| `lim:n` | LIMIT | `lim:10` |
| `off:n` | OFFSET | `off:20` |
| `grp:cols` | GROUP BY | `grp:user_id,status` |
| `hav:condition` | HAVING | `hav:cnt:*>5` |

### Joins

```typescript
sqw`from:users join:orders/left on:users.id=orders.user_id sel:users.name,orders.total`
```

| Join Type | Example |
|-----------|---------|
| Inner (default) | `join:orders` |
| Left | `join:orders/left` |
| Right | `join:orders/right` |
| Full | `join:orders/full` |

### Aggregate Functions

```typescript
sqw`from:orders grp:user_id sel:user_id,sum:total,cnt:*`
// SELECT user_id, SUM(total), COUNT(*) FROM orders GROUP BY user_id
```

| Prefix | Function |
|--------|----------|
| `sum:` | SUM() |
| `cnt:` | COUNT() |
| `avg:` | AVG() |
| `min:` | MIN() |
| `max:` | MAX() |

### Operators

| Operator | Meaning | Example |
|----------|---------|---------|
| `>` | Greater than | `whr:age>18` |
| `<` | Less than | `whr:price<100` |
| `>=` | Greater or equal | `whr:age>=21` |
| `<=` | Less or equal | `whr:qty<=0` |
| `=` | Equals | `whr:status=active` |
| `!=` | Not equals | `whr:role!=admin` |
| `~` | LIKE | `whr:name~john%` |
| `.in()` | IN | `whr:id.in(1,2,3)` |
| `.null` | IS NULL | `whr:deleted_at.null` |
| `.!null` | IS NOT NULL | `whr:email.!null` |

### Logical Operators

```typescript
// AND - multiple whr clauses or comma-separated
sqw`from:users whr:age>18 whr:status=active`
sqw`from:users whr:age>18,status=active`

// OR - pipe within whr
sqw`from:users whr:role=admin|role=moderator`
```

## Dialect Support

```typescript
import { sqw, Dialect } from 'sqwind';

// PostgreSQL (default) - uses $1, $2 placeholders
const pgQuery = sqw`from:users whr:age>18`;
pgQuery.toParams();
// { sql: "... WHERE age > $1", params: [18] }

// MySQL - uses ? placeholders
const mysqlQuery = sqw`from:users whr:age>18`.withOptions({ dialect: Dialect.MYSQL });
mysqlQuery.toParams();
// { sql: "... WHERE age > ?", params: [18] }

// SQLite
const sqliteQuery = sqw`from:users whr:age>18`.withOptions({ dialect: Dialect.SQLITE });
```

## API Reference

### `sqw` - Tagged Template Literal

```typescript
import { sqw } from 'sqwind';

const query = sqw`from:users sel:name whr:age>18`;
query.toSQL();      // Raw SQL string
query.toParams();   // { sql: string, params: unknown[] }
```

### `sq` - Fluent Builder

```typescript
import { sq } from 'sqwind';

sq.from('users')
  .sel('name', 'email')
  .whr('age', '>', 18)
  .whr('status', '=', 'active')
  .ord('name', 'asc')
  .lim(10)
  .off(20)
  .toSQL();
```

### `defineSchema` - Type-Safe Schema

```typescript
import { defineSchema } from 'sqwind';

const db = defineSchema({
  tableName: {
    column: 'type', // 'string' | 'number' | 'boolean' | 'date' | 'json'
  },
});

db.sqw`...`;           // Template literal with validation
db.sq.from('...');     // Fluent builder with validation
db.schema;             // Access raw schema definition
```

### Query Methods

| Method | Description |
|--------|-------------|
| `.toSQL()` | Returns raw SQL string |
| `.toParams()` | Returns `{ sql, params }` for parameterized queries |
| `.limit(n)` | Add/update LIMIT clause |
| `.offset(n)` | Add/update OFFSET clause |
| `.withOptions(opts)` | Clone with new compiler options |

### Compiler Options

```typescript
interface CompilerOptions {
  dialect?: 'postgres' | 'mysql' | 'sqlite';  // Default: 'postgres'
  parameterize?: boolean;                      // Default: true
  quoteIdentifiers?: boolean;                  // Default: false
  keywordCase?: 'upper' | 'lower';            // Default: 'upper'
  pretty?: boolean;                            // Default: false
}
```

## Examples

### Pagination

```typescript
const page = 2;
const pageSize = 25;

sqw`from:users sel:id,name ord:created_at/desc lim:${pageSize} off:${(page - 1) * pageSize}`
```

### Complex Joins

```typescript
sqw`
  from:orders
  join:users/left on:orders.user_id=users.id
  join:products/left on:orders.product_id=products.id
  sel:orders.id,users.name,products.title,orders.total
  whr:orders.status=completed
  ord:orders.created_at/desc
`
```

### Aggregation Report

```typescript
sqw`
  from:orders
  grp:user_id
  sel:user_id,sum:total,cnt:*,avg:total
  hav:sum:total>1000
  ord:sum:total/desc
`
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
