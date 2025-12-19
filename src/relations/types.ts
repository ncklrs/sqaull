/**
 * Relation types for sqwind
 *
 * Defines the types of relationships between tables
 * and how to load related data.
 */

/**
 * Types of relationships between tables
 */
export type RelationType = 'hasOne' | 'hasMany' | 'belongsTo' | 'manyToMany';

/**
 * Base relation definition
 */
export interface BaseRelation {
  /**
   * Type of relationship
   */
  type: RelationType;

  /**
   * The related table name
   */
  table: string;

  /**
   * The foreign key column
   */
  foreignKey: string;

  /**
   * The local key (defaults to 'id')
   */
  localKey?: string;

  /**
   * Optional alias for the relation in results
   */
  alias?: string;
}

/**
 * HasOne relation - one-to-one where foreign key is on related table
 *
 * @example
 * User hasOne Profile (profiles.user_id references users.id)
 */
export interface HasOneRelation extends BaseRelation {
  type: 'hasOne';
}

/**
 * HasMany relation - one-to-many
 *
 * @example
 * User hasMany Posts (posts.user_id references users.id)
 */
export interface HasManyRelation extends BaseRelation {
  type: 'hasMany';
}

/**
 * BelongsTo relation - inverse of hasOne/hasMany
 *
 * @example
 * Post belongsTo User (posts.user_id references users.id)
 */
export interface BelongsToRelation extends BaseRelation {
  type: 'belongsTo';
}

/**
 * ManyToMany relation - many-to-many through pivot table
 *
 * @example
 * User manyToMany Roles through user_roles
 */
export interface ManyToManyRelation extends BaseRelation {
  type: 'manyToMany';

  /**
   * The pivot/junction table name
   */
  pivotTable: string;

  /**
   * Foreign key in pivot table pointing to local table
   */
  pivotLocalKey: string;

  /**
   * Foreign key in pivot table pointing to related table
   */
  pivotForeignKey: string;
}

/**
 * Union type for all relation types
 */
export type Relation =
  | HasOneRelation
  | HasManyRelation
  | BelongsToRelation
  | ManyToManyRelation;

/**
 * Map of relation names to relation definitions for a table
 */
export type TableRelations = Record<string, Relation>;

/**
 * Schema-wide relation definitions
 */
export type SchemaRelations<Tables extends string = string> = {
  [Table in Tables]?: TableRelations;
};

/**
 * Options for eager loading
 */
export interface EagerLoadOptions {
  /**
   * Nested relations to load (e.g., 'posts.comments')
   */
  nested?: string[];

  /**
   * Columns to select from the related table
   */
  select?: string[];

  /**
   * WHERE conditions for the related data
   */
  where?: Record<string, unknown>;

  /**
   * ORDER BY for the related data
   */
  orderBy?: string;

  /**
   * LIMIT for the related data
   */
  limit?: number;
}

/**
 * Parsed eager load request
 */
export interface EagerLoadRequest {
  /**
   * Relation name
   */
  relation: string;

  /**
   * Load options
   */
  options?: EagerLoadOptions;
}

/**
 * Result of eager loading with nested data
 */
export type WithRelations<T, R extends string> = T & {
  [K in R]: unknown[];
};
