# Changelog

All notable changes to sqaull will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2024-12-19

### Added

- **Core Query Language**
  - Template literal API (`gull`, `sqw`) for writing SQL queries
  - Fluent builder API (`sq.from().sel().whr()`)
  - Support for SELECT, INSERT, UPDATE, DELETE statements
  - WHERE conditions with comparison operators (`>`, `<`, `>=`, `<=`, `=`, `!=`, `~`)
  - IN/NOT IN conditions (`.in()`, `.!in()`, `.nin()`)
  - NULL checks (`.null`, `.!null`)
  - Logical operators (AND via `,`, OR via `|`)
  - JOIN support (INNER, LEFT, RIGHT, FULL)
  - ORDER BY with direction (`ord:name/desc`)
  - GROUP BY and HAVING
  - LIMIT and OFFSET
  - RETURNING clause support

- **Gen Alpha Syntax** (because SQL should hit different)
  - `main:` → FROM (main character table)
  - `slay:` → SELECT (slay those columns)
  - `sus:` → WHERE (filter the sus rows)
  - `vibe:` → ORDER BY (vibecheck the order)
  - `bet:` → LIMIT (bet, only this many)
  - `skip:` → OFFSET
  - `squad:` → GROUP BY
  - `tea:` → HAVING (spill the tea)
  - `link:` → JOIN
  - `nocap:` → INSERT
  - `glow:` → UPDATE (glow up)
  - `yeet:` → DELETE
  - `fam:` → WITH (eager loading)
  - `gull` → Template literal alias

- **Type Safety**
  - `defineSchema()` for compile-time type checking
  - Runtime validation of table and column names
  - Typed query builders with autocomplete

- **Multi-Dialect Support**
  - PostgreSQL (default)
  - MySQL
  - SQLite
  - Configurable placeholder styles (`$1`, `?`, `?`)

- **Migration System**
  - Fluent migration builder (`createMigration`, `defineMigration`)
  - Table operations (create, drop, rename)
  - Column operations (add, drop, rename, alter)
  - Index management
  - Foreign key support
  - Gen Alpha aliases (`glow()`, `evolve()`)

- **Relations & Eager Loading**
  - `hasOne`, `hasMany`, `belongsTo`, `manyToMany`
  - Eager loading with `with:` / `fam:`
  - Gen Alpha aliases (`got`, `stacked`, `simps`, `linked`)

- **Database Adapters**
  - PostgreSQL adapter
  - MySQL adapter
  - SQLite adapter
  - Connection pooling support
  - Transaction support

### Technical

- Written in TypeScript with full type definitions
- ESM and CommonJS builds
- Zero runtime dependencies for core functionality
- 98.6% test pass rate (508/515 tests)

## [Unreleased]

### Planned
- Subquery support in `.in()` conditions
- HAVING without GROUP BY validation
- Raw SQL interpolation improvements
- Query caching
- Query logging/debugging tools
