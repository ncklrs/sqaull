/**
 * Relations tests
 *
 * Tests for relation definitions, eager loading syntax, and relation loader.
 */

import { describe, it, expect } from 'vitest';
import {
  hasOne,
  hasMany,
  belongsTo,
  manyToMany,
  got,
  stacked,
  simps,
  linked,
  parseIncludes,
  parse,
  sqw,
} from '../src';

describe('relation definitions', () => {
  describe('hasOne', () => {
    it('creates hasOne relation', () => {
      const relation = hasOne('profiles', 'user_id');
      expect(relation.type).toBe('hasOne');
      expect(relation.table).toBe('profiles');
      expect(relation.foreignKey).toBe('user_id');
      expect(relation.localKey).toBe('id');
    });

    it('allows custom local key', () => {
      const relation = hasOne('profiles', 'user_uuid', 'uuid');
      expect(relation.localKey).toBe('uuid');
    });
  });

  describe('hasMany', () => {
    it('creates hasMany relation', () => {
      const relation = hasMany('posts', 'user_id');
      expect(relation.type).toBe('hasMany');
      expect(relation.table).toBe('posts');
      expect(relation.foreignKey).toBe('user_id');
      expect(relation.localKey).toBe('id');
    });

    it('allows custom local key', () => {
      const relation = hasMany('posts', 'author_uuid', 'uuid');
      expect(relation.localKey).toBe('uuid');
    });
  });

  describe('belongsTo', () => {
    it('creates belongsTo relation', () => {
      const relation = belongsTo('users', 'user_id');
      expect(relation.type).toBe('belongsTo');
      expect(relation.table).toBe('users');
      expect(relation.foreignKey).toBe('user_id');
      expect(relation.localKey).toBe('id');
    });

    it('allows custom local key on related table', () => {
      const relation = belongsTo('users', 'author_uuid', 'uuid');
      expect(relation.localKey).toBe('uuid');
    });
  });

  describe('manyToMany', () => {
    it('creates manyToMany relation', () => {
      const relation = manyToMany('roles', 'user_roles', 'user_id', 'role_id');
      expect(relation.type).toBe('manyToMany');
      expect(relation.table).toBe('roles');
      expect(relation.pivotTable).toBe('user_roles');
      expect(relation.pivotLocalKey).toBe('user_id');
      expect(relation.pivotForeignKey).toBe('role_id');
      expect(relation.localKey).toBe('id');
      expect(relation.foreignKey).toBe('id');
    });

    it('allows custom keys', () => {
      const relation = manyToMany(
        'tags',
        'post_tags',
        'post_uuid',
        'tag_uuid',
        'uuid',
        'uuid'
      );
      expect(relation.localKey).toBe('uuid');
      expect(relation.foreignKey).toBe('uuid');
    });
  });

  describe('Gen Alpha aliases', () => {
    it('got is alias for hasOne', () => {
      const relation = got('profiles', 'user_id');
      expect(relation.type).toBe('hasOne');
    });

    it('stacked is alias for hasMany', () => {
      const relation = stacked('posts', 'user_id');
      expect(relation.type).toBe('hasMany');
    });

    it('simps is alias for belongsTo', () => {
      const relation = simps('users', 'user_id');
      expect(relation.type).toBe('belongsTo');
    });

    it('linked is alias for manyToMany', () => {
      const relation = linked('roles', 'user_roles', 'user_id', 'role_id');
      expect(relation.type).toBe('manyToMany');
    });
  });
});

describe('WITH syntax parsing', () => {
  describe('Classic syntax (with:)', () => {
    it('parses single relation', () => {
      const ast = parse('from:users sel:* with:posts');
      expect(ast.with).toBeDefined();
      expect(ast.with!.relations).toEqual(['posts']);
    });

    it('parses multiple relations', () => {
      const ast = parse('from:users sel:* with:posts,profile,orders');
      expect(ast.with!.relations).toEqual(['posts', 'profile', 'orders']);
    });

    it('works with other clauses', () => {
      const ast = parse('from:users sel:name,email whr:active=true with:posts ord:name');
      expect(ast.from!.table).toBe('users');
      expect(ast.with!.relations).toEqual(['posts']);
      expect(ast.orderBy).toBeDefined();
    });
  });

  describe('Gen Alpha syntax (fam:)', () => {
    it('parses single relation', () => {
      const ast = parse('main:users slay:* fam:posts');
      expect(ast.with).toBeDefined();
      expect(ast.with!.relations).toEqual(['posts']);
    });

    it('parses multiple relations', () => {
      const ast = parse('main:users slay:* fam:posts,profile');
      expect(ast.with!.relations).toEqual(['posts', 'profile']);
    });
  });

  describe('sqw template literal', () => {
    it('parses with clause via template literal', () => {
      const query = sqw`from:users sel:* with:posts`;
      const sql = query.toSQL();
      // WITH clause doesn't affect SQL generation (it's for eager loading)
      expect(sql).toContain('SELECT *');
      expect(sql).toContain('FROM users');
    });
  });
});

describe('parseIncludes', () => {
  it('parses single relation', () => {
    const includes = parseIncludes('posts');
    expect(includes).toEqual([{ relation: 'posts' }]);
  });

  it('parses multiple relations', () => {
    const includes = parseIncludes('posts,profile,orders');
    expect(includes).toEqual([
      { relation: 'posts' },
      { relation: 'profile' },
      { relation: 'orders' },
    ]);
  });

  it('parses nested relations', () => {
    const includes = parseIncludes('posts.comments');
    expect(includes).toEqual([
      {
        relation: 'posts',
        options: { nested: ['comments'] },
      },
    ]);
  });

  it('handles mixed nested and simple relations', () => {
    const includes = parseIncludes('profile,posts.comments,orders');
    expect(includes).toEqual([
      { relation: 'profile' },
      {
        relation: 'posts',
        options: { nested: ['comments'] },
      },
      { relation: 'orders' },
    ]);
  });

  it('returns empty array for empty string', () => {
    expect(parseIncludes('')).toEqual([]);
  });

  it('trims whitespace', () => {
    const includes = parseIncludes('posts , profile , orders');
    expect(includes).toEqual([
      { relation: 'posts' },
      { relation: 'profile' },
      { relation: 'orders' },
    ]);
  });
});

describe('relation schema patterns', () => {
  it('demonstrates typical schema relations', () => {
    // This is how you'd define a schema with relations
    const relations = {
      users: {
        posts: hasMany('posts', 'user_id'),
        profile: hasOne('profiles', 'user_id'),
        roles: manyToMany('roles', 'user_roles', 'user_id', 'role_id'),
      },
      posts: {
        author: belongsTo('users', 'user_id'),
        comments: hasMany('comments', 'post_id'),
        tags: manyToMany('tags', 'post_tags', 'post_id', 'tag_id'),
      },
      comments: {
        post: belongsTo('posts', 'post_id'),
        author: belongsTo('users', 'user_id'),
      },
    };

    // Verify structure
    expect(relations.users.posts.type).toBe('hasMany');
    expect(relations.users.profile.type).toBe('hasOne');
    expect(relations.users.roles.type).toBe('manyToMany');
    expect(relations.posts.author.type).toBe('belongsTo');
    expect(relations.posts.comments.type).toBe('hasMany');
    expect(relations.comments.post.type).toBe('belongsTo');
  });

  it('demonstrates Gen Alpha schema relations (no cap)', () => {
    const relations = {
      users: {
        posts: stacked('posts', 'user_id'),    // User stacked posts
        profile: got('profiles', 'user_id'),    // User got profile
        roles: linked('roles', 'user_roles', 'user_id', 'role_id'),
      },
      posts: {
        author: simps('users', 'user_id'),      // Post simps for user
      },
    };

    expect(relations.users.posts.type).toBe('hasMany');
    expect(relations.users.profile.type).toBe('hasOne');
    expect(relations.posts.author.type).toBe('belongsTo');
  });
});
