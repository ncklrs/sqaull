/**
 * Relation definition helpers
 *
 * Fluent API for defining relationships between tables.
 *
 * @example
 * ```typescript
 * import { defineSchema, hasMany, belongsTo, hasOne, manyToMany } from 'sqwind';
 *
 * const db = defineSchema({
 *   users: { id: 'number', name: 'string' },
 *   posts: { id: 'number', user_id: 'number', title: 'string' },
 *   profiles: { id: 'number', user_id: 'number', bio: 'string' },
 *   roles: { id: 'number', name: 'string' },
 * }, {
 *   relations: {
 *     users: {
 *       posts: hasMany('posts', 'user_id'),
 *       profile: hasOne('profiles', 'user_id'),
 *       roles: manyToMany('roles', 'user_roles', 'user_id', 'role_id'),
 *     },
 *     posts: {
 *       author: belongsTo('users', 'user_id'),
 *     },
 *   },
 * });
 * ```
 */

import type {
  HasOneRelation,
  HasManyRelation,
  BelongsToRelation,
  ManyToManyRelation,
} from './types';

/**
 * Define a hasOne relationship
 *
 * Use when the foreign key is on the related table.
 *
 * @param table - The related table name
 * @param foreignKey - The foreign key column on the related table
 * @param localKey - The local key column (defaults to 'id')
 *
 * @example
 * ```typescript
 * // User hasOne Profile
 * // profiles table has user_id column
 * hasOne('profiles', 'user_id')
 * ```
 */
export function hasOne(
  table: string,
  foreignKey: string,
  localKey: string = 'id'
): HasOneRelation {
  return {
    type: 'hasOne',
    table,
    foreignKey,
    localKey,
  };
}

/**
 * Define a hasMany relationship
 *
 * Use when the foreign key is on the related table.
 *
 * @param table - The related table name
 * @param foreignKey - The foreign key column on the related table
 * @param localKey - The local key column (defaults to 'id')
 *
 * @example
 * ```typescript
 * // User hasMany Posts
 * // posts table has user_id column
 * hasMany('posts', 'user_id')
 * ```
 */
export function hasMany(
  table: string,
  foreignKey: string,
  localKey: string = 'id'
): HasManyRelation {
  return {
    type: 'hasMany',
    table,
    foreignKey,
    localKey,
  };
}

/**
 * Define a belongsTo relationship
 *
 * Use when the foreign key is on the current table.
 *
 * @param table - The related table name
 * @param foreignKey - The foreign key column on the current table
 * @param localKey - The primary key on the related table (defaults to 'id')
 *
 * @example
 * ```typescript
 * // Post belongsTo User
 * // posts table has user_id column pointing to users.id
 * belongsTo('users', 'user_id')
 * ```
 */
export function belongsTo(
  table: string,
  foreignKey: string,
  localKey: string = 'id'
): BelongsToRelation {
  return {
    type: 'belongsTo',
    table,
    foreignKey,
    localKey,
  };
}

/**
 * Define a manyToMany relationship
 *
 * Use when there's a pivot/junction table connecting two tables.
 *
 * @param table - The related table name
 * @param pivotTable - The pivot/junction table name
 * @param pivotLocalKey - Foreign key in pivot pointing to current table
 * @param pivotForeignKey - Foreign key in pivot pointing to related table
 * @param localKey - Primary key on current table (defaults to 'id')
 * @param foreignKey - Primary key on related table (defaults to 'id')
 *
 * @example
 * ```typescript
 * // User manyToMany Roles through user_roles
 * // user_roles has user_id and role_id columns
 * manyToMany('roles', 'user_roles', 'user_id', 'role_id')
 * ```
 */
export function manyToMany(
  table: string,
  pivotTable: string,
  pivotLocalKey: string,
  pivotForeignKey: string,
  localKey: string = 'id',
  foreignKey: string = 'id'
): ManyToManyRelation {
  return {
    type: 'manyToMany',
    table,
    foreignKey,
    localKey,
    pivotTable,
    pivotLocalKey,
    pivotForeignKey,
  };
}

// Gen Alpha aliases (bussin fr fr)
export const got = hasOne;        // "User got profile"
export const stacked = hasMany;   // "User stacked posts"
export const simps = belongsTo;   // "Post simps for user" (belongs to)
export const linked = manyToMany; // "User linked with roles"
