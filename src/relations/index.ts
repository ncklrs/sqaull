/**
 * Relations module for sqwind
 *
 * Provides relationship definitions and eager loading capabilities.
 *
 * @example
 * ```typescript
 * import { defineSchema, hasMany, belongsTo } from 'sqwind';
 *
 * const db = defineSchema({
 *   users: { id: 'number', name: 'string' },
 *   posts: { id: 'number', user_id: 'number', title: 'string' },
 * }, {
 *   relations: {
 *     users: {
 *       posts: hasMany('posts', 'user_id'),
 *     },
 *     posts: {
 *       author: belongsTo('users', 'user_id'),
 *     },
 *   },
 * });
 *
 * // Then use with eager loading
 * const usersWithPosts = await client.query`from:users sel:* with:posts`;
 * ```
 */

// Types
export type {
  RelationType,
  BaseRelation,
  HasOneRelation,
  HasManyRelation,
  BelongsToRelation,
  ManyToManyRelation,
  Relation,
  TableRelations,
  SchemaRelations,
  EagerLoadOptions,
  EagerLoadRequest,
  WithRelations,
} from './types';

// Relation definition helpers
export {
  hasOne,
  hasMany,
  belongsTo,
  manyToMany,
  // Gen Alpha aliases
  got,
  stacked,
  simps,
  linked,
} from './define';

// Loader
export { RelationLoader, parseIncludes } from './loader';
