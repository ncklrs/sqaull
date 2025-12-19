<p align="center">
  <img src="./assets/logo.svg" alt="sqaull - SQL that hits different" width="400" />
</p>

<h3 align="center">A Tailwind-inspired query language that compiles to SQL</h3>

<p align="center">
  <a href="#installation">Installation</a> |
  <a href="#quick-start">Quick Start</a> |
  <a href="#gen-alpha-examples-bussin-fr-fr">Gen Alpha Mode</a> |
  <a href="#migrations">Migrations</a> |
  <a href="#database-execution">Database</a>
</p>

---

## Vision

**What if writing SQL felt like writing Tailwind?**

Tailwind transformed CSS by replacing verbose, scattered stylesheets with composable utility classes you write right where you need them. `sqaull` brings that same philosophy to SQL.

Instead of:
```sql
SELECT name, email FROM users WHERE age > 18 ORDER BY created_at DESC LIMIT 10
```

You write:
```
from:users sel:name,email whr:age>18 ord:created_at/desc lim:10
```

The syntax is intentionally familiar. Colons separate utilities from values (like `hover:bg-blue`). Slashes add modifiers (like `md:text-lg`). Commas group related items. It's SQL distilled to its essence—composable, scannable, and expressive.

But `sqaull` isn't just shorthand. It's a complete query builder with type safety, parameterization, and multi-dialect support. Define your schema once, and get compile-time validation that catches typos and type mismatches before they hit your database.

---

## Installation

```bash
npm install sqaull
```

## Quick Start

```typescript
import { sqw, sq, defineSchema } from 'sqaull';

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
import { defineSchema } from 'sqaull';

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

sqaull supports both **OG syntax** (for the SQL purists) and **Gen Alpha slang** (for the chronically online). Both produce identical SQL - use whichever speaks to your soul.

### Basic Clauses

| OG Syntax | Gen Alpha | SQL Equivalent | Example |
|-----------|-----------|----------------|---------|
| `from:` | `main:` | FROM | `main:users` |
| `sel:` | `slay:` | SELECT | `slay:name,email` |
| `whr:` | `sus:` | WHERE | `sus:age>18` |
| `ord:` | `vibe:` | ORDER BY | `vibe:name/desc` |
| `lim:` | `bet:` | LIMIT | `bet:10` |
| `off:` | `skip:` | OFFSET | `skip:20` |
| `grp:` | `squad:` | GROUP BY | `squad:user_id` |
| `hav:` | `tea:` | HAVING | `tea:cnt:*>5` |
| `join:` | `link:` | JOIN | `link:orders/left` |
| `on:` | `match:` | ON | `match:a.id=b.id` |
| `ins:` | `nocap:` | INSERT | `nocap:users` |
| `cols:` | `drip:` | (columns) | `drip:name,email` |
| `vals:` | `fire:` | VALUES | `fire:john,test@test.com` |
| `upd:` | `glow:` | UPDATE | `glow:users` |
| `set:` | `rizz:` | SET | `rizz:name=john` |
| `del:` | `yeet:` | DELETE | `yeet:users` |
| `ret:` | `flex:` | RETURNING | `flex:id` |
| `with:` | `fam:` | (eager load) | `fam:posts,profile` |

### Gen Alpha Examples (bussin fr fr)

```typescript
// SELECT with main character energy
sqw`main:users slay:name,email sus:age>21 vibe:created_at/desc bet:10`
// SELECT name, email FROM users WHERE age > 21 ORDER BY created_at DESC LIMIT 10

// INSERT - no cap, dropping fire values
sqw`nocap:users drip:name,email fire:john,john@test.com flex:id`
// INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id

// UPDATE - glow up with that rizz
sqw`glow:users rizz:status=active,verified=true sus:id=1 flex:*`
// UPDATE users SET status = $1, verified = $2 WHERE id = $3 RETURNING *

// DELETE - yeet into the void
sqw`yeet:sessions sus:expired=true`
// DELETE FROM sessions WHERE expired = $1

// JOIN - link up
sqw`main:users link:orders/left match:users.id=orders.user_id slay:users.name,orders.total`
// SELECT users.name, orders.total FROM users LEFT JOIN orders ON users.id = orders.user_id

// Aggregation - squad up and spill the tea
sqw`main:orders slay:user_id,sum:total,cnt:* squad:user_id tea:sum:total>1000 vibe:sum:total/desc`
// SELECT user_id, SUM(total), COUNT(*) FROM orders GROUP BY user_id HAVING SUM(total) > $1 ORDER BY SUM(total) DESC
```

### OG Syntax (for the boomers)

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

### INSERT Statements

```typescript
// Basic INSERT with columns and values
sqw`ins:users cols:name,email vals:john,john@test.com`
// INSERT INTO users (name, email) VALUES ($1, $2)

// INSERT with RETURNING
sqw`ins:users cols:name,email vals:john,john@test.com ret:id`
// INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id

// RETURNING all columns
sqw`ins:users cols:name vals:john ret:*`
// INSERT INTO users (name) VALUES ($1) RETURNING *
```

| Utility | SQL Equivalent | Example |
|---------|---------------|---------|
| `ins:table` | INSERT INTO table | `ins:users` |
| `cols:cols` | (col1, col2) | `cols:name,email` |
| `vals:values` | VALUES (v1, v2) | `vals:john,john@test.com` |
| `ret:cols` | RETURNING cols | `ret:id` or `ret:*` |

### UPDATE Statements

```typescript
// Basic UPDATE with SET and WHERE
sqw`upd:users set:name=john whr:id=1`
// UPDATE users SET name = $1 WHERE id = $2

// Multiple SET assignments
sqw`upd:users set:name=john,email=john@test.com whr:id=1`
// UPDATE users SET name = $1, email = $2 WHERE id = $3

// UPDATE with RETURNING
sqw`upd:users set:status=active whr:id=1 ret:id,updated_at`
// UPDATE users SET status = $1 WHERE id = $2 RETURNING id, updated_at
```

| Utility | SQL Equivalent | Example |
|---------|---------------|---------|
| `upd:table` | UPDATE table | `upd:users` |
| `set:assignments` | SET col = val | `set:name=john,age=30` |
| `whr:condition` | WHERE | `whr:id=1` |
| `ret:cols` | RETURNING cols | `ret:id,updated_at` |

### DELETE Statements

```typescript
// Basic DELETE with WHERE
sqw`del:users whr:id=1`
// DELETE FROM users WHERE id = $1

// DELETE with complex conditions
sqw`del:sessions whr:expired=true,user_id=1`
// DELETE FROM sessions WHERE expired = $1 AND user_id = $2

// DELETE with RETURNING
sqw`del:users whr:id=1 ret:*`
// DELETE FROM users WHERE id = $1 RETURNING *
```

| Utility | SQL Equivalent | Example |
|---------|---------------|---------|
| `del:table` | DELETE FROM table | `del:users` |
| `whr:condition` | WHERE | `whr:id=1` |
| `ret:cols` | RETURNING cols | `ret:id,email` |

## Dialect Support

```typescript
import { sqw, Dialect } from 'sqaull';

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
import { sqw } from 'sqaull';

const query = sqw`from:users sel:name whr:age>18`;
query.toSQL();      // Raw SQL string
query.toParams();   // { sql: string, params: unknown[] }
```

### `sq` - Fluent Builder

```typescript
import { sq, createQueryBuilder } from 'sqaull';

// SELECT queries
sq.from('users')
  .sel('name', 'email')
  .whr('age', '>', 18)
  .whr('status', '=', 'active')
  .ord('name', 'asc')
  .lim(10)
  .off(20)
  .toSQL();

// INSERT queries
createQueryBuilder()
  .ins('users')
  .cols('name', 'email')
  .vals('john', 'john@test.com')
  .ret('id')
  .toSQL();
// INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id

// UPDATE queries
createQueryBuilder()
  .upd('users')
  .set('name', 'john')
  .set('email', 'john@test.com')
  .whr('id', '=', 1)
  .ret('*')
  .toSQL();
// UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING *

// DELETE queries
createQueryBuilder()
  .del('users')
  .whr('id', '=', 1)
  .ret('id')
  .toSQL();
// DELETE FROM users WHERE id = $1 RETURNING id
```

### `defineSchema` - Type-Safe Schema

```typescript
import { defineSchema } from 'sqaull';

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

## Database Execution

sqaull includes a database execution layer with adapters for PostgreSQL, MySQL, and SQLite. Install the driver for your database:

```bash
# PostgreSQL
npm install pg

# MySQL
npm install mysql2

# SQLite
npm install better-sqlite3
```

### Connecting to a Database

```typescript
import { createClient, Dialect } from 'sqaull';

// PostgreSQL
const pg = createClient({
  dialect: Dialect.POSTGRES,
  connectionString: 'postgres://user:pass@localhost:5432/mydb'
});

// MySQL
const mysql = createClient({
  dialect: Dialect.MYSQL,
  host: 'localhost',
  user: 'root',
  password: 'secret',
  database: 'mydb'
});

// SQLite
const sqlite = createClient({
  dialect: Dialect.SQLITE,
  filename: './app.db'  // or ':memory:' for in-memory
});

await pg.connect();
```

### Executing Queries

```typescript
// Template literal syntax
const users = await client.query`from:users sel:name,email whr:age>18`;

// Get a single row
const user = await client.queryOne`from:users sel:* whr:id=1`;

// Fluent builder with execute
const orders = await client.sq
  .from('orders')
  .sel('id', 'total', 'status')
  .whr('user_id', '=', 1)
  .ord('created_at', 'desc')
  .lim(10)
  .execute();

// Execute Query objects
import { sqw } from 'sqaull';
const query = sqw`from:users sel:name whr:active=true`;
const activeUsers = await client.run(query);

// Raw SQL
await client.raw('CREATE TABLE users (id SERIAL PRIMARY KEY, name TEXT)');

// Parameterized SQL
const result = await client.sql('SELECT * FROM users WHERE id = $1', [1]);
```

### Transactions

```typescript
// Transactions auto-commit on success, auto-rollback on error
await client.transaction(async (tx) => {
  await tx.query`upd:users set:balance=0 whr:id=1`;
  await tx.query`ins:audit cols:action,user_id vals:reset,1`;

  // If any query fails, all changes are rolled back
});

// Gen Alpha style (no cap fr fr)
await client.transaction(async (tx) => {
  await tx.query`glow:users rizz:status=active sus:id=1`;
  await tx.query`nocap:notifications drip:user_id,message fire:1,Welcome!`;
});
```

### INSERT with RETURNING

```typescript
// Insert and get the new row back
const [newUser] = await client.query`
  ins:users cols:name,email vals:John,john@test.com ret:id,created_at
`;
console.log(newUser.id); // The auto-generated ID

// Fluent builder
const [inserted] = await client.sq
  .ins('products')
  .cols('name', 'price')
  .vals('Widget', 29.99)
  .ret('*')
  .execute();
```

### UPDATE and DELETE

```typescript
// Update with returning
const [updated] = await client.query`
  upd:users set:verified=true whr:id=1 ret:*
`;

// Delete with returning
const deleted = await client.query`
  del:sessions whr:expired=true ret:user_id
`;
console.log(`Cleaned up ${deleted.length} expired sessions`);
```

### Disconnecting

```typescript
await client.disconnect();
```

## Relations & Eager Loading

Define relationships between tables and load related data efficiently.

### Defining Relations

```typescript
import { defineSchema, hasMany, belongsTo, hasOne, manyToMany } from 'sqaull';

const db = defineSchema({
  users: { id: 'number', name: 'string', email: 'string' },
  posts: { id: 'number', user_id: 'number', title: 'string' },
  profiles: { id: 'number', user_id: 'number', bio: 'string' },
  roles: { id: 'number', name: 'string' },
}, {
  relations: {
    users: {
      posts: hasMany('posts', 'user_id'),       // User has many posts
      profile: hasOne('profiles', 'user_id'),   // User has one profile
      roles: manyToMany('roles', 'user_roles', 'user_id', 'role_id'),
    },
    posts: {
      author: belongsTo('users', 'user_id'),    // Post belongs to user
    },
  },
});
```

### Relation Types

| Function | Description | Example |
|----------|-------------|---------|
| `hasOne(table, fk)` | One-to-one (FK on related) | `hasOne('profiles', 'user_id')` |
| `hasMany(table, fk)` | One-to-many | `hasMany('posts', 'user_id')` |
| `belongsTo(table, fk)` | Inverse of hasOne/hasMany | `belongsTo('users', 'user_id')` |
| `manyToMany(table, pivot, localFk, foreignFk)` | Many-to-many through pivot | `manyToMany('roles', 'user_roles', 'user_id', 'role_id')` |

### Gen Alpha Relation Aliases (no cap fr fr)

| OG | Gen Alpha | Usage |
|----|-----------|-------|
| `hasOne` | `got` | "User got profile" |
| `hasMany` | `stacked` | "User stacked posts" |
| `belongsTo` | `simps` | "Post simps for user" |
| `manyToMany` | `linked` | "User linked with roles" |

```typescript
import { stacked, got, simps, linked } from 'sqaull';

const relations = {
  users: {
    posts: stacked('posts', 'user_id'),   // User stacked posts
    profile: got('profiles', 'user_id'),  // User got profile
  },
  posts: {
    author: simps('users', 'user_id'),    // Post simps for user (belongs to)
  },
};
```

### Eager Loading Syntax

Use `with:` (OG) or `fam:` (Gen Alpha) to load related data:

```typescript
// Load users with their posts
await client.query`from:users sel:* with:posts`;

// Load users with multiple relations
await client.query`from:users sel:* with:posts,profile,roles`;

// Gen Alpha style - bring the fam (related data)
await client.query`main:users slay:* fam:posts`;
```

### Complete Example

```typescript
import { createClient, defineSchema, hasMany, belongsTo, Dialect } from 'sqaull';

// Define schema with relations
const db = defineSchema({
  users: { id: 'number', name: 'string' },
  posts: { id: 'number', user_id: 'number', title: 'string' },
}, {
  relations: {
    users: { posts: hasMany('posts', 'user_id') },
    posts: { author: belongsTo('users', 'user_id') },
  },
});

// Connect to database
const client = createClient({
  dialect: Dialect.POSTGRES,
  connectionString: 'postgres://localhost/mydb'
});
await client.connect();

// Query with eager loading
const usersWithPosts = await client.query`from:users sel:* with:posts`;
// Each user now has a `posts` array with their posts

// Gen Alpha style (bussin fr fr)
const postsWithAuthor = await client.query`main:posts slay:* fam:author`;
// Each post now has an `author` object
```

## Migrations

squall includes a powerful migration system for managing database schema changes with automatic up/down generation and multi-dialect support.

### Creating Migrations

```typescript
import { createMigration, createMigrationRunner, createClient, Dialect } from 'sqaull';

// Define a migration using the fluent builder API
const createUsersTable = createMigration('create_users_table')
  .createTable('users', (table) => {
    table.id();                                    // Auto-increment primary key
    table.string('name').notNull();                // VARCHAR NOT NULL
    table.string('email').notNull().unique();      // VARCHAR NOT NULL UNIQUE
    table.integer('age');                          // INTEGER
    table.timestamps();                            // created_at, updated_at
    table.softDeletes();                           // deleted_at for soft deletes
  })
  .createIndex('users', 'idx_users_email', ['email'], { unique: true })
  .build();

// Or use Gen Alpha style (glow up your schema fr fr)
import { glow, evolve } from 'sqaull';

const createPostsTable = glow('create_posts_table')  // Glow up = createMigration
  .createTable('posts', (table) => {
    table.id();
    table.string('title').notNull();
    table.text('content');
    table.foreignKey('user_id', { table: 'users', onDelete: 'CASCADE' });
    table.timestamps();
  })
  .build();
```

### Column Types

```typescript
table.id();           // Auto-increment integer PK
table.uuid();         // UUID primary key
table.bigId();        // Bigint auto-increment PK
table.string('col');  // VARCHAR(255)
table.text('col');    // TEXT
table.integer('col'); // INTEGER
table.bigint('col');  // BIGINT
table.float('col');   // FLOAT
table.double('col');  // DOUBLE PRECISION
table.decimal('col'); // DECIMAL
table.boolean('col'); // BOOLEAN
table.date('col');    // DATE
table.datetime('col');// DATETIME
table.timestamp('col');// TIMESTAMP
table.time('col');    // TIME
table.json('col');    // JSON
table.jsonb('col');   // JSONB (PostgreSQL)
table.binary('col');  // BLOB/BYTEA
```

### Column Modifiers

```typescript
table.string('email')
  .notNull()                           // NOT NULL
  .unique()                            // UNIQUE constraint
  .default('unknown')                  // DEFAULT value
  .references('users', 'id', {         // Foreign key
    onDelete: 'CASCADE',
    onUpdate: 'SET NULL'
  })
  .check('length(email) > 5');         // CHECK constraint
```

### Schema Operations

```typescript
// Add a column
createMigration('add_avatar')
  .addColumn('users', 'avatar_url', 'string', (col) => col.nullable())
  .build();

// Drop a column
createMigration('remove_deprecated')
  .dropColumn('users', 'deprecated_field')
  .build();

// Rename a column
createMigration('rename_col')
  .renameColumn('users', 'name', 'full_name')
  .build();

// Rename a table
createMigration('rename_table')
  .renameTable('posts', 'articles')
  .build();

// Drop a table
createMigration('drop_old_table')
  .dropTable('old_table')
  .build();

// Raw SQL for complex operations
createMigration('add_extension')
  .raw(
    'CREATE EXTENSION IF NOT EXISTS "uuid-ossp"',
    'DROP EXTENSION IF EXISTS "uuid-ossp"'  // Down migration
  )
  .build();
```

### Running Migrations

```typescript
import { createMigrationRunner, createClient, Dialect } from 'sqaull';

// Connect to database
const client = createClient({
  dialect: Dialect.POSTGRES,
  connectionString: 'postgres://localhost/mydb'
});
await client.connect();

// Create runner and register migrations
const runner = createMigrationRunner(client.adapter);
runner.register(createUsersTable);
runner.register(createPostsTable);

// Initialize migrations table
await runner.init();

// Check status
const status = await runner.status();
console.log(status);
// [
//   { id: '1704067200000_create_users_table', name: 'create_users_table', applied: false },
//   { id: '1704067200001_create_posts_table', name: 'create_posts_table', applied: false }
// ]

// Apply all pending migrations
const result = await runner.up();
console.log(`Applied ${result.applied.length} migrations in ${result.duration}ms`);

// Revert the last migration
await runner.down();

// Revert all migrations
await runner.reset();
```

### defineMigration API

For more control, use `defineMigration` (or `evolve` in Gen Alpha):

```typescript
import { defineMigration, evolve } from 'sqaull';

// Traditional style
const migration = defineMigration({
  name: 'complex_migration',
  timestamp: 1704067200000,
  up: (m) => {
    m.createTable('orders', (t) => {
      t.id();
      t.foreignKey('user_id', { table: 'users', onDelete: 'CASCADE' });
      t.decimal('total').notNull().default(0);
      t.string('status').notNull().default('pending');
      t.timestamps();
    });
    m.createIndex('orders', 'idx_orders_user', ['user_id']);
  },
});

// Gen Alpha style (evolution arc for your DB)
const genAlphaMigration = evolve({
  name: 'glow_up_orders',
  up: (m) => {
    m.addColumn('orders', 'tracking_number', 'string', (col) => col.nullable());
  },
});
```

### Migration Gen Alpha Aliases

| OG | Gen Alpha | Vibe |
|----|-----------|------|
| `createMigration()` | `glow()` | Glow up your schema |
| `defineMigration()` | `evolve()` | Evolution arc for your DB |

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
