import { describe, it, expect } from 'vitest';
import { lex, TokenType } from '../src';

describe('lexer', () => {
  describe('basic clauses', () => {
    it('tokenizes from clause', () => {
      const tokens = lex('from:users');
      expect(tokens).toEqual([
        { type: TokenType.FROM, value: 'users', position: 0, raw: 'from:users' }
      ]);
    });

    it('tokenizes select clause with single column', () => {
      const tokens = lex('sel:name');
      expect(tokens).toEqual([
        { type: TokenType.SELECT, value: 'name', position: 0, raw: 'sel:name' }
      ]);
    });

    it('tokenizes select clause with multiple columns', () => {
      const tokens = lex('sel:name,email,age');
      expect(tokens).toEqual([
        { type: TokenType.SELECT, value: 'name,email,age', position: 0, raw: 'sel:name,email,age' }
      ]);
    });

    it('tokenizes select wildcard', () => {
      const tokens = lex('sel:*');
      expect(tokens).toEqual([
        { type: TokenType.SELECT, value: '*', position: 0, raw: 'sel:*' }
      ]);
    });

    it('tokenizes where clause', () => {
      const tokens = lex('whr:age>18');
      expect(tokens).toEqual([
        { type: TokenType.WHERE, value: 'age>18', position: 0, raw: 'whr:age>18' }
      ]);
    });

    it('tokenizes order by clause', () => {
      const tokens = lex('ord:name');
      expect(tokens).toEqual([
        { type: TokenType.ORDER, value: 'name', position: 0, raw: 'ord:name' }
      ]);
    });

    it('tokenizes limit clause', () => {
      const tokens = lex('lim:10');
      expect(tokens).toEqual([
        { type: TokenType.LIMIT, value: '10', position: 0, raw: 'lim:10' }
      ]);
    });

    it('tokenizes offset clause', () => {
      const tokens = lex('off:5');
      expect(tokens).toEqual([
        { type: TokenType.OFFSET, value: '5', position: 0, raw: 'off:5' }
      ]);
    });

    it('tokenizes group by clause', () => {
      const tokens = lex('grp:category,status');
      expect(tokens).toEqual([
        { type: TokenType.GROUP, value: 'category,status', position: 0, raw: 'grp:category,status' }
      ]);
    });

    it('tokenizes having clause', () => {
      const tokens = lex('hav:count>5');
      expect(tokens).toEqual([
        { type: TokenType.HAVING, value: 'count>5', position: 0, raw: 'hav:count>5' }
      ]);
    });

    it('tokenizes join clause', () => {
      const tokens = lex('join:orders');
      expect(tokens).toEqual([
        { type: TokenType.JOIN, value: 'orders', position: 0, raw: 'join:orders' }
      ]);
    });

    it('tokenizes on clause', () => {
      const tokens = lex('on:users.id=orders.user_id');
      expect(tokens).toEqual([
        { type: TokenType.ON, value: 'users.id=orders.user_id', position: 0, raw: 'on:users.id=orders.user_id' }
      ]);
    });
  });

  describe('operators', () => {
    it('tokenizes greater than operator', () => {
      const tokens = lex('whr:age>18');
      expect(tokens[0].value).toBe('age>18');
    });

    it('tokenizes less than operator', () => {
      const tokens = lex('whr:price<100');
      expect(tokens[0].value).toBe('price<100');
    });

    it('tokenizes greater than or equal operator', () => {
      const tokens = lex('whr:score>=90');
      expect(tokens[0].value).toBe('score>=90');
    });

    it('tokenizes less than or equal operator', () => {
      const tokens = lex('whr:age<=65');
      expect(tokens[0].value).toBe('age<=65');
    });

    it('tokenizes equality operator', () => {
      const tokens = lex('whr:status=active');
      expect(tokens[0].value).toBe('status=active');
    });

    it('tokenizes not equal operator', () => {
      const tokens = lex('whr:status!=deleted');
      expect(tokens[0].value).toBe('status!=deleted');
    });

    it('tokenizes like operator', () => {
      const tokens = lex('whr:name~john');
      expect(tokens[0].value).toBe('name~john');
    });
  });

  describe('modifiers', () => {
    it('tokenizes order by with desc modifier', () => {
      const tokens = lex('ord:created_at/desc');
      expect(tokens).toEqual([
        { type: TokenType.ORDER, value: 'created_at/desc', position: 0, raw: 'ord:created_at/desc' }
      ]);
    });

    it('tokenizes order by with asc modifier', () => {
      const tokens = lex('ord:name/asc');
      expect(tokens).toEqual([
        { type: TokenType.ORDER, value: 'name/asc', position: 0, raw: 'ord:name/asc' }
      ]);
    });

    it('tokenizes join with left modifier', () => {
      const tokens = lex('join:orders/left');
      expect(tokens).toEqual([
        { type: TokenType.JOIN, value: 'orders/left', position: 0, raw: 'join:orders/left' }
      ]);
    });

    it('tokenizes join with right modifier', () => {
      const tokens = lex('join:orders/right');
      expect(tokens).toEqual([
        { type: TokenType.JOIN, value: 'orders/right', position: 0, raw: 'join:orders/right' }
      ]);
    });

    it('tokenizes join with inner modifier', () => {
      const tokens = lex('join:orders/inner');
      expect(tokens).toEqual([
        { type: TokenType.JOIN, value: 'orders/inner', position: 0, raw: 'join:orders/inner' }
      ]);
    });

    it('tokenizes join with full modifier', () => {
      const tokens = lex('join:orders/full');
      expect(tokens).toEqual([
        { type: TokenType.JOIN, value: 'orders/full', position: 0, raw: 'join:orders/full' }
      ]);
    });
  });

  describe('aggregates', () => {
    it('tokenizes sum aggregate', () => {
      const tokens = lex('sel:sum:total');
      expect(tokens).toEqual([
        { type: TokenType.SELECT, value: 'sum:total', position: 0, raw: 'sel:sum:total' }
      ]);
    });

    it('tokenizes count aggregate', () => {
      const tokens = lex('sel:cnt:*');
      expect(tokens).toEqual([
        { type: TokenType.SELECT, value: 'cnt:*', position: 0, raw: 'sel:cnt:*' }
      ]);
    });

    it('tokenizes avg aggregate', () => {
      const tokens = lex('sel:avg:price');
      expect(tokens).toEqual([
        { type: TokenType.SELECT, value: 'avg:price', position: 0, raw: 'sel:avg:price' }
      ]);
    });

    it('tokenizes min aggregate', () => {
      const tokens = lex('sel:min:age');
      expect(tokens).toEqual([
        { type: TokenType.SELECT, value: 'min:age', position: 0, raw: 'sel:min:age' }
      ]);
    });

    it('tokenizes max aggregate', () => {
      const tokens = lex('sel:max:score');
      expect(tokens).toEqual([
        { type: TokenType.SELECT, value: 'max:score', position: 0, raw: 'sel:max:score' }
      ]);
    });

    it('tokenizes multiple aggregates with columns', () => {
      const tokens = lex('sel:sum:total,cnt:*,avg:price');
      expect(tokens).toEqual([
        { type: TokenType.SELECT, value: 'sum:total,cnt:*,avg:price', position: 0, raw: 'sel:sum:total,cnt:*,avg:price' }
      ]);
    });

    it('tokenizes mixed aggregates and regular columns', () => {
      const tokens = lex('sel:name,sum:total,email,cnt:*');
      expect(tokens).toEqual([
        { type: TokenType.SELECT, value: 'name,sum:total,email,cnt:*', position: 0, raw: 'sel:name,sum:total,email,cnt:*' }
      ]);
    });
  });

  describe('complex queries', () => {
    it('tokenizes basic complete query', () => {
      const tokens = lex('from:users sel:name,email whr:age>18 ord:name lim:10');
      expect(tokens).toHaveLength(5);
      expect(tokens[0].type).toBe(TokenType.FROM);
      expect(tokens[1].type).toBe(TokenType.SELECT);
      expect(tokens[2].type).toBe(TokenType.WHERE);
      expect(tokens[3].type).toBe(TokenType.ORDER);
      expect(tokens[4].type).toBe(TokenType.LIMIT);
    });

    it('tokenizes query with all clauses', () => {
      const tokens = lex('from:users sel:name whr:age>18 grp:country hav:cnt:*>5 ord:name/desc lim:10 off:5');
      expect(tokens).toHaveLength(8);
      expect(tokens.map(t => t.type)).toEqual([
        TokenType.FROM,
        TokenType.SELECT,
        TokenType.WHERE,
        TokenType.GROUP,
        TokenType.HAVING,
        TokenType.ORDER,
        TokenType.LIMIT,
        TokenType.OFFSET
      ]);
    });

    it('tokenizes query with join', () => {
      const tokens = lex('from:users join:orders/left on:users.id=orders.user_id sel:users.name,orders.total');
      expect(tokens).toHaveLength(4);
      expect(tokens[0].type).toBe(TokenType.FROM);
      expect(tokens[1].type).toBe(TokenType.JOIN);
      expect(tokens[2].type).toBe(TokenType.ON);
      expect(tokens[3].type).toBe(TokenType.SELECT);
    });

    it('tokenizes query with multiple joins', () => {
      const tokens = lex('from:users join:orders on:users.id=orders.user_id join:products on:orders.product_id=products.id');
      expect(tokens).toHaveLength(5);
      expect(tokens.filter(t => t.type === TokenType.JOIN)).toHaveLength(2);
      expect(tokens.filter(t => t.type === TokenType.ON)).toHaveLength(2);
    });
  });

  describe('special conditions', () => {
    it('tokenizes in condition', () => {
      const tokens = lex('whr:status.in(active,pending,approved)');
      expect(tokens[0].value).toBe('status.in(active,pending,approved)');
    });

    it('tokenizes null check', () => {
      const tokens = lex('whr:deleted_at.null');
      expect(tokens[0].value).toBe('deleted_at.null');
    });

    it('tokenizes negated null check', () => {
      const tokens = lex('whr:email.!null');
      expect(tokens[0].value).toBe('email.!null');
    });

    it('tokenizes OR conditions', () => {
      const tokens = lex('whr:age>18|status=active');
      expect(tokens[0].value).toBe('age>18|status=active');
    });

    it('tokenizes complex OR conditions', () => {
      const tokens = lex('whr:age>65|age<18|status=special');
      expect(tokens[0].value).toBe('age>65|age<18|status=special');
    });
  });

  describe('edge cases', () => {
    it('handles empty string', () => {
      const tokens = lex('');
      expect(tokens).toEqual([]);
    });

    it('handles whitespace only', () => {
      const tokens = lex('   ');
      expect(tokens).toEqual([]);
    });

    it('handles multiple spaces between clauses', () => {
      const tokens = lex('from:users   sel:name    whr:age>18');
      expect(tokens).toHaveLength(3);
    });

    it('handles tabs between clauses', () => {
      const tokens = lex('from:users\tsel:name\twhr:age>18');
      expect(tokens).toHaveLength(3);
    });

    it('handles newlines between clauses', () => {
      const tokens = lex('from:users\nsel:name\nwhr:age>18');
      expect(tokens).toHaveLength(3);
    });

    it('preserves values with underscores', () => {
      const tokens = lex('from:user_accounts sel:first_name,last_name');
      expect(tokens[0].value).toBe('user_accounts');
      expect(tokens[1].value).toBe('first_name,last_name');
    });

    it('preserves values with dots (table prefixes)', () => {
      const tokens = lex('sel:users.name,orders.total');
      expect(tokens[0].value).toBe('users.name,orders.total');
    });

    it('handles numeric values in conditions', () => {
      const tokens = lex('whr:age>18.5');
      expect(tokens[0].value).toBe('age>18.5');
    });

    it('handles negative numbers', () => {
      const tokens = lex('whr:balance<-100');
      expect(tokens[0].value).toBe('balance<-100');
    });

    it('handles quoted strings', () => {
      const tokens = lex('whr:name=\'john doe\'');
      expect(tokens[0].value).toBe('name=\'john doe\'');
    });

    it('handles double quoted strings', () => {
      const tokens = lex('whr:name="john doe"');
      expect(tokens[0].value).toBe('name="john doe"');
    });

    it('preserves special characters in values', () => {
      const tokens = lex('whr:email~%@gmail.com');
      expect(tokens[0].value).toBe('email~%@gmail.com');
    });
  });

  describe('position tracking', () => {
    it('tracks position for single token', () => {
      const tokens = lex('from:users');
      expect(tokens[0].position).toBe(0);
    });

    it('tracks positions for multiple tokens', () => {
      const tokens = lex('from:users sel:name whr:age>18');
      expect(tokens[0].position).toBe(0);
      expect(tokens[1].position).toBeGreaterThan(0);
      expect(tokens[2].position).toBeGreaterThan(tokens[1].position);
    });

    it('preserves raw text', () => {
      const tokens = lex('from:users sel:name');
      expect(tokens[0].raw).toBe('from:users');
      expect(tokens[1].raw).toBe('sel:name');
    });
  });

  describe('error handling', () => {
    it('handles unknown clause prefix gracefully', () => {
      expect(() => lex('unknown:value')).toThrow();
    });

    it('handles missing colon', () => {
      expect(() => lex('from users')).toThrow();
    });

    it('handles missing value after colon', () => {
      expect(() => lex('from:')).toThrow();
    });

    it('handles invalid clause format', () => {
      expect(() => lex('from')).toThrow();
    });
  });
});
