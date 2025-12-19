/**
 * Relation loader for eager loading
 *
 * Handles loading related data and hydrating results.
 */

import type { DatabaseAdapter } from '../db/types';
import type { Relation, SchemaRelations, EagerLoadRequest } from './types';
import { Dialect } from '../compiler/types';

/**
 * Load related data for a set of parent records
 *
 * Uses efficient batching to avoid N+1 queries.
 */
export class RelationLoader {
  private adapter: DatabaseAdapter;
  private dialect: Dialect;
  private relations: SchemaRelations;

  constructor(
    adapter: DatabaseAdapter,
    relations: SchemaRelations,
    dialect?: Dialect
  ) {
    this.adapter = adapter;
    this.relations = relations;
    this.dialect = dialect ?? adapter.dialect;
  }

  /**
   * Load relations for a set of parent records
   *
   * @param table - The parent table name
   * @param records - The parent records
   * @param includes - Relations to load
   * @returns Records with nested relation data
   */
  async load<T extends Record<string, unknown>>(
    table: string,
    records: T[],
    includes: EagerLoadRequest[]
  ): Promise<T[]> {
    if (records.length === 0 || includes.length === 0) {
      return records;
    }

    const tableRelations = this.relations[table];
    if (!tableRelations) {
      throw new Error(`No relations defined for table: ${table}`);
    }

    // Process each relation
    for (const include of includes) {
      const relation = tableRelations[include.relation];
      if (!relation) {
        throw new Error(
          `Unknown relation '${include.relation}' on table '${table}'`
        );
      }

      await this.loadRelation(records, include.relation, relation, include.options);
    }

    return records;
  }

  /**
   * Load a single relation for all parent records
   */
  private async loadRelation<T extends Record<string, unknown>>(
    records: T[],
    relationName: string,
    relation: Relation,
    options?: EagerLoadRequest['options']
  ): Promise<void> {
    switch (relation.type) {
      case 'hasOne':
        await this.loadHasOne(records, relationName, relation, options);
        break;
      case 'hasMany':
        await this.loadHasMany(records, relationName, relation, options);
        break;
      case 'belongsTo':
        await this.loadBelongsTo(records, relationName, relation, options);
        break;
      case 'manyToMany':
        await this.loadManyToMany(records, relationName, relation, options);
        break;
    }
  }

  /**
   * Load hasOne relations
   */
  private async loadHasOne<T extends Record<string, unknown>>(
    records: T[],
    relationName: string,
    relation: Relation,
    options?: EagerLoadRequest['options']
  ): Promise<void> {
    const localKey = relation.localKey ?? 'id';
    const parentIds = this.extractIds(records, localKey);

    if (parentIds.length === 0) return;

    const selectClause = options?.select?.join(', ') || '*';
    const whereClause = this.buildInClause(relation.foreignKey, parentIds);
    const orderClause = options?.orderBy
      ? ` ORDER BY ${options.orderBy}`
      : '';

    const sql = `SELECT ${selectClause} FROM ${relation.table} WHERE ${whereClause}${orderClause}`;
    const result = await this.adapter.execute(sql, parentIds);

    // Map results to parent records
    const relatedMap = new Map<unknown, Record<string, unknown>>();
    for (const row of result.rows as Record<string, unknown>[]) {
      relatedMap.set(row[relation.foreignKey], row);
    }

    for (const record of records) {
      (record as Record<string, unknown>)[relationName] =
        relatedMap.get(record[localKey]) ?? null;
    }
  }

  /**
   * Load hasMany relations
   */
  private async loadHasMany<T extends Record<string, unknown>>(
    records: T[],
    relationName: string,
    relation: Relation,
    options?: EagerLoadRequest['options']
  ): Promise<void> {
    const localKey = relation.localKey ?? 'id';
    const parentIds = this.extractIds(records, localKey);

    if (parentIds.length === 0) return;

    const selectClause = options?.select?.join(', ') || '*';
    const whereClause = this.buildInClause(relation.foreignKey, parentIds);
    const orderClause = options?.orderBy
      ? ` ORDER BY ${options.orderBy}`
      : '';
    const limitClause = options?.limit ? ` LIMIT ${options.limit}` : '';

    const sql = `SELECT ${selectClause} FROM ${relation.table} WHERE ${whereClause}${orderClause}${limitClause}`;
    const result = await this.adapter.execute(sql, parentIds);

    // Group results by foreign key
    const relatedMap = new Map<unknown, Record<string, unknown>[]>();
    for (const row of result.rows as Record<string, unknown>[]) {
      const key = row[relation.foreignKey];
      if (!relatedMap.has(key)) {
        relatedMap.set(key, []);
      }
      relatedMap.get(key)!.push(row);
    }

    for (const record of records) {
      (record as Record<string, unknown>)[relationName] =
        relatedMap.get(record[localKey]) ?? [];
    }
  }

  /**
   * Load belongsTo relations
   */
  private async loadBelongsTo<T extends Record<string, unknown>>(
    records: T[],
    relationName: string,
    relation: Relation,
    options?: EagerLoadRequest['options']
  ): Promise<void> {
    const foreignKey = relation.foreignKey;
    const relatedKey = relation.localKey ?? 'id';
    const foreignIds = this.extractIds(records, foreignKey);

    if (foreignIds.length === 0) return;

    const selectClause = options?.select?.join(', ') || '*';
    const whereClause = this.buildInClause(relatedKey, foreignIds);

    const sql = `SELECT ${selectClause} FROM ${relation.table} WHERE ${whereClause}`;
    const result = await this.adapter.execute(sql, foreignIds);

    // Map results by primary key
    const relatedMap = new Map<unknown, Record<string, unknown>>();
    for (const row of result.rows as Record<string, unknown>[]) {
      relatedMap.set(row[relatedKey], row);
    }

    for (const record of records) {
      (record as Record<string, unknown>)[relationName] =
        relatedMap.get(record[foreignKey]) ?? null;
    }
  }

  /**
   * Load manyToMany relations
   */
  private async loadManyToMany<T extends Record<string, unknown>>(
    records: T[],
    relationName: string,
    relation: Relation,
    options?: EagerLoadRequest['options']
  ): Promise<void> {
    if (relation.type !== 'manyToMany') return;

    const localKey = relation.localKey ?? 'id';
    const parentIds = this.extractIds(records, localKey);

    if (parentIds.length === 0) return;

    // First, get pivot table entries
    const pivotWhere = this.buildInClause(relation.pivotLocalKey, parentIds);
    const pivotSql = `SELECT ${relation.pivotLocalKey}, ${relation.pivotForeignKey} FROM ${relation.pivotTable} WHERE ${pivotWhere}`;
    const pivotResult = await this.adapter.execute(pivotSql, parentIds);

    // Extract related IDs
    const relatedIds = [
      ...new Set(
        (pivotResult.rows as Record<string, unknown>[]).map(
          (r) => r[relation.pivotForeignKey]
        )
      ),
    ].filter((id) => id !== undefined && id !== null);

    if (relatedIds.length === 0) {
      // No related records, set empty arrays
      for (const record of records) {
        (record as Record<string, unknown>)[relationName] = [];
      }
      return;
    }

    // Get related records
    const selectClause = options?.select?.join(', ') || '*';
    const relatedWhere = this.buildInClause(relation.foreignKey, relatedIds);
    const orderClause = options?.orderBy
      ? ` ORDER BY ${options.orderBy}`
      : '';

    const relatedSql = `SELECT ${selectClause} FROM ${relation.table} WHERE ${relatedWhere}${orderClause}`;
    const relatedResult = await this.adapter.execute(relatedSql, relatedIds);

    // Map related records by their ID
    const relatedMap = new Map<unknown, Record<string, unknown>>();
    for (const row of relatedResult.rows as Record<string, unknown>[]) {
      relatedMap.set(row[relation.foreignKey], row);
    }

    // Build mapping from parent to related records
    const parentToRelated = new Map<unknown, Record<string, unknown>[]>();
    for (const pivot of pivotResult.rows as Record<string, unknown>[]) {
      const parentId = pivot[relation.pivotLocalKey];
      const relatedId = pivot[relation.pivotForeignKey];
      const related = relatedMap.get(relatedId);

      if (related) {
        if (!parentToRelated.has(parentId)) {
          parentToRelated.set(parentId, []);
        }
        parentToRelated.get(parentId)!.push(related);
      }
    }

    // Assign to records
    for (const record of records) {
      (record as Record<string, unknown>)[relationName] =
        parentToRelated.get(record[localKey]) ?? [];
    }
  }

  /**
   * Extract unique IDs from records
   */
  private extractIds<T extends Record<string, unknown>>(
    records: T[],
    key: string
  ): unknown[] {
    return [...new Set(records.map((r) => r[key]))].filter(
      (id) => id !== undefined && id !== null
    );
  }

  /**
   * Build an IN clause with placeholders
   */
  private buildInClause(column: string, values: unknown[]): string {
    const placeholders = values.map((_, i) => this.placeholder(i + 1)).join(', ');
    return `${column} IN (${placeholders})`;
  }

  /**
   * Get placeholder for dialect
   */
  private placeholder(index: number): string {
    switch (this.dialect) {
      case Dialect.POSTGRES:
        return `$${index}`;
      case Dialect.MYSQL:
      case Dialect.SQLITE:
      default:
        return '?';
    }
  }
}

/**
 * Parse relation includes from a string
 *
 * @example
 * parseIncludes('posts,author.profile')
 * // [{ relation: 'posts' }, { relation: 'author', options: { nested: ['profile'] }}]
 */
export function parseIncludes(includeStr: string): EagerLoadRequest[] {
  if (!includeStr) return [];

  return includeStr.split(',').map((part) => {
    const trimmed = part.trim();
    const dotIndex = trimmed.indexOf('.');

    if (dotIndex === -1) {
      return { relation: trimmed };
    }

    const relation = trimmed.substring(0, dotIndex);
    const nested = trimmed.substring(dotIndex + 1);

    return {
      relation,
      options: {
        nested: [nested],
      },
    };
  });
}
