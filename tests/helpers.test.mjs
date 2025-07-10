import { getClient, isValidRedirectUri, getOriginalQuery } from '../lib/helpers.js';

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
