import { getClient, isValidRedirectUri, getOriginalQuery, mergeJWTClaims, resolveDynamicClaim, createContextForDynamicClaims } from '../lib/helpers.js';

describe('helpers', () => {
  const clients = [
    { clientId: 'a', redirectUris: ['http://localhost/a'] },
    { clientId: 'b', redirectUris: ['http://localhost/b'] },
  ];

  test('getClient returns correct client', () => {
    expect(getClient(clients, 'a')).toEqual(clients[0]);
    expect(getClient(clients, 'b')).toEqual(clients[1]);
    expect(getClient(clients, 'c')).toBeUndefined();
  });

  test('isValidRedirectUri returns true for valid uri', () => {
    expect(isValidRedirectUri(clients[0], 'http://localhost/a')).toBe(true);
    expect(isValidRedirectUri(clients[1], 'http://localhost/b')).toBe(true);
  });

  test('isValidRedirectUri returns false for invalid uri', () => {
    expect(isValidRedirectUri(clients[0], 'http://localhost/b')).toBe(false);
    expect(isValidRedirectUri(null, 'http://localhost/a')).toBe(false);
  });

  test('getOriginalQuery returns correct query string', () => {
    const req = { query: { foo: 'bar', baz: 'qux' } };
    expect(getOriginalQuery(req)).toBe('foo=bar&baz=qux');
    expect(getOriginalQuery(req, '?foo=bar')).toBe('foo=bar');
    expect(getOriginalQuery(req, 'foo=bar')).toBe('foo=bar');
    expect(getOriginalQuery(req, '')).toBe('foo=bar&baz=qux');
  });
});

describe('mergeJWTClaims', () => {
  const baseClaims = {
    globals: {
      iss: '{{now}}',
      sub: '{{username}}',
      foo: 'bar',
      keep: 'yes'
    },
    clients: {
      web: { foo: 'baz', clientOnly: 'cval', removeMe: null }
    },
    users: {
      alice: { sub: 'alice', userOnly: 'uval', keep: null }
    }
  };

  test('merges global, client, and user claims with correct precedence', () => {
    const result = mergeJWTClaims(baseClaims, 'web', 'alice');
    expect(result).toEqual({
      iss: '{{now}}',
      sub: 'alice', // user overrides global
      foo: 'baz',   // client overrides global
      clientOnly: 'cval',
      userOnly: 'uval'    // user only
      // removeMe and keep are removed due to null
    });
  });

  test('merges only global if no client/user', () => {
    const result = mergeJWTClaims(baseClaims, undefined, undefined);
    expect(result).toEqual({ iss: '{{now}}', sub: '{{username}}', foo: 'bar', keep: 'yes' });
  });

  test('merges global and client if no user', () => {
    const result = mergeJWTClaims(baseClaims, 'web', undefined);
    expect(result).toEqual({ iss: '{{now}}', sub: '{{username}}', foo: 'baz', clientOnly: 'cval', keep: 'yes' });
  });

  test('merges global and user if no client', () => {
    const result = mergeJWTClaims(baseClaims, undefined, 'alice');
    expect(result).toEqual({ iss: '{{now}}', sub: 'alice', foo: 'bar', userOnly: 'uval' });
  });

  test('removes keys with null values from any level', () => {
    const claims = {
      globals: { a: 1, b: null },
      clients: { c: { b: 2, d: null } },
      users: { u: { a: null, e: 5 } }
    };
    const result = mergeJWTClaims(claims, 'c', 'u');
    expect(result).toEqual({ b: 2, e: 5 });
  });

  test('handles missing claims objects gracefully', () => {
    const claims = { globals: { a: 1 }, clients: {}, users: {} };
    expect(mergeJWTClaims(claims, 'none', 'none')).toEqual({ a: 1 });
  });
});

describe('resolveDynamicClaim', () => {
  const context = {
    username: 'alice',
    user: { username: 'alice', email: 'alice@example.com' },
    client: 'web-app',
    scope: 'openid profile',
    iat: 12345,
    nested: { value: 42 }
  };

  test('resolves flat variable', () => {
    expect(resolveDynamicClaim('username', context)).toBe('alice');
    expect(resolveDynamicClaim('client', context)).toBe('web-app');
    expect(resolveDynamicClaim('iat', context)).toBe(12345);
  });

  test('resolves nested variable with dot notation', () => {
    expect(resolveDynamicClaim('user.username', context)).toBe('alice');
    expect(resolveDynamicClaim('user.email', context)).toBe('alice@example.com');
    expect(resolveDynamicClaim('nested.value', context)).toBe(42);
  });

  test('returns undefined for missing variable', () => {
    expect(resolveDynamicClaim('missing', context)).toBeUndefined();
    expect(resolveDynamicClaim('user.missing', context)).toBeUndefined();
    expect(resolveDynamicClaim('nested.missing', context)).toBeUndefined();
  });
});

describe('createContextForDynamicClaims', () => {
  test('generates all required dynamic values', () => {
    const user = { username: 'bob' };
    const client = { clientId: 'web-app' };
    const scope = 'openid';
    const redirectUri = 'http://localhost:3000';
    const host = 'http://localhost:4000';
    const context = createContextForDynamicClaims({ user, client, scope, redirectUri, host });
    expect(context.username).toBe('bob');
    expect(context.client).toBe('web-app');
    expect(context.scope).toBe('openid');
    expect(context.aud).toBe('http://localhost:3000');
    expect(context.host).toBe('http://localhost:4000');
    expect(typeof context.now).toBe('number');
    expect(typeof context.iat).toBe('number');
    expect(context.exp).toBe(context.iat + 3600);
  });

  test('defaults host to http://localhost if not provided', () => {
    const context = createContextForDynamicClaims({});
    expect(context.host).toBe('http://localhost');
  });

  test('defaults host to http://localhost:PORT if port is provided', () => {
    const context = createContextForDynamicClaims({ port: 1234 });
    expect(context.host).toBe('http://localhost:1234');
  });

  test('handles missing user/client gracefully', () => {
    const context = createContextForDynamicClaims({});
    expect(context.username).toBeUndefined();
    expect(context.client).toBeUndefined();
  });
});
