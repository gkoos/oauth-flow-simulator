import { jest } from '@jest/globals';
import { handleToken } from '../../lib/flows/token.js';
import jwt from 'jsonwebtoken';

describe('handleToken', () => {
  let req, res, getClient, isValidRedirectUri, authCodes, users, tokens;

  beforeEach(() => {
    req = {
      body: {
        grant_type: 'authorization_code',
        code: 'abc',
        redirect_uri: 'http://localhost:3000/callback',
        client_id: 'web-app',
        client_secret: 'shhh',
      },
      protocol: 'http',
      get: (header) => header === 'host' ? 'localhost:3000' : undefined,
      socket: { localPort: 3000 }
    };
    res = { status: jest.fn(() => res), json: jest.fn() };
    getClient = jest.fn(() => ({
      clientId: 'web-app',
      clientSecret: 'shhh',
      redirectUris: ['http://localhost:3000/callback'],
    }));
    isValidRedirectUri = jest.fn(() => true);
    authCodes = {
      abc: {
        clientId: 'web-app',
        username: 'alice',
        scope: 'openid',
        redirectUri: 'http://localhost:3000/callback',
        expiresAt: Date.now() + 10000,
      },
    };
    users = [ { username: 'alice', password: 'pw123', scopes: ['openid'] } ];
    tokens = {};
    process.env.JWT_SECRET = 'test';
  });

  it('returns access token for valid request', () => {
    handleToken(req, res, { getClient, isValidRedirectUri, authCodes, users, tokens });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ access_token: expect.any(String), token_type: 'Bearer' }));
    expect(Object.keys(tokens).length).toBeGreaterThan(0);
  });

  it('returns access token for valid request using HTTP Basic Auth', () => {
    // Simulate HTTP Basic Auth header
    const base64 = Buffer.from('web-app:shhh').toString('base64');
    req.headers = { authorization: `Basic ${base64}` };
    // Remove client_secret from body to ensure only header is used
    delete req.body.client_secret;
    handleToken(req, res, { getClient, isValidRedirectUri, authCodes, users, tokens });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ access_token: expect.any(String), token_type: 'Bearer' }));
    expect(Object.keys(tokens).length).toBeGreaterThan(0);
  });

  it('returns error for unsupported grant_type', () => {
    req.body.grant_type = 'password';
    handleToken(req, res, { getClient, isValidRedirectUri, authCodes, users, tokens });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'unsupported_grant_type' }));
  });

  it('returns error for invalid client', () => {
    getClient = jest.fn(() => undefined);
    handleToken(req, res, { getClient, isValidRedirectUri, authCodes, users, tokens });
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'invalid_client' }));
  });

  it('returns error for invalid redirect uri', () => {
    isValidRedirectUri = jest.fn(() => false);
    handleToken(req, res, { getClient, isValidRedirectUri, authCodes, users, tokens });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'invalid_grant' }));
  });

  it('returns error for invalid or expired code', () => {
    req.body.code = 'bad';
    handleToken(req, res, { getClient, isValidRedirectUri, authCodes, users, tokens });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'invalid_grant' }));
  });
});

describe('refresh token flow', () => {
  let refreshTokens, tokens, users, getClient;
  const clientId = 'web-app';
  const clientSecret = 'shhh';
  const username = 'alice';
  const scopes = ['openid', 'offline_access'];
  beforeEach(() => {
    refreshTokens = {};
    tokens = {};
    users = [ { username, password: 'pw123', scopes } ];
    getClient = jest.fn(() => ({ clientId, clientSecret, redirectUris: ['http://localhost:3000/callback'] }));
  });
  function issueRefreshToken() {
    const now = Date.now();
    const refresh_token = 'rtok_' + Math.random().toString(36).slice(2,10);
    refreshTokens[refresh_token] = {
      username,
      clientId,
      scopes,
      issuedAt: now,
      expiresAt: now + 10000
    };
    return refresh_token;
  }
  it('rotates refresh token and returns new tokens', () => {
    const oldRefresh = issueRefreshToken();
    const req = { body: { grant_type: 'refresh_token', refresh_token: oldRefresh, client_id: clientId, client_secret: clientSecret } };
    const res = { status: jest.fn(() => res), json: jest.fn() };
    handleToken(req, res, { getClient, isValidRedirectUri: jest.fn(() => true), authCodes: {}, users, tokens, refreshTokens });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ access_token: expect.any(String), refresh_token: expect.any(String) }));
    expect(refreshTokens[oldRefresh]).toBeUndefined();
    const newRefresh = res.json.mock.calls[0][0].refresh_token;
    expect(refreshTokens[newRefresh]).toBeDefined();
    expect(refreshTokens[newRefresh].username).toBe(username);
  });
  it('prevents replay of used refresh token', () => {
    const oldRefresh = issueRefreshToken();
    const req = { body: { grant_type: 'refresh_token', refresh_token: oldRefresh, client_id: clientId, client_secret: clientSecret } };
    const res = { status: jest.fn(() => res), json: jest.fn() };
    handleToken(req, res, { getClient, isValidRedirectUri: jest.fn(() => true), authCodes: {}, users, tokens, refreshTokens });
    // Try again with same token
    const res2 = { status: jest.fn(() => res2), json: jest.fn() };
    handleToken(req, res2, { getClient, isValidRedirectUri: jest.fn(() => true), authCodes: {}, users, tokens, refreshTokens });
    expect(res2.status).toHaveBeenCalledWith(400);
    expect(res2.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'invalid_grant' }));
  });
  it('returns error for invalid refresh token', () => {
    const req = { body: { grant_type: 'refresh_token', refresh_token: 'badtoken', client_id: clientId, client_secret: clientSecret } };
    const res = { status: jest.fn(() => res), json: jest.fn() };
    handleToken(req, res, { getClient, isValidRedirectUri: jest.fn(() => true), authCodes: {}, users, tokens, refreshTokens });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'invalid_grant' }));
  });
  it('returns error for wrong client', () => {
    // Setup: two clients
    const clientA = { clientId: 'clientA', clientSecret: 'secretA', refreshTokenLifetime: 3600000 };
    const clientB = { clientId: 'clientB', clientSecret: 'secretB', refreshTokenLifetime: 3600000 };
    const getClient = (id) => (id === 'clientA' ? clientA : id === 'clientB' ? clientB : undefined);

    // Create a refresh token for clientB
    const refreshTokens = {
      'rtok_wrongclient': {
        username: 'user1',
        clientId: 'clientB', // belongs to clientB
        scopes: ['offline_access'],
        issuedAt: Date.now(),
        expiresAt: Date.now() + 3600000
      }
    };

    const users = [{ username: 'user1' }];
    const tokens = {};

    // Request: use clientA credentials with clientB's refresh token
    const req = {
      body: {
        grant_type: 'refresh_token',
        client_id: 'clientA',
        client_secret: 'secretA',
        refresh_token: 'rtok_wrongclient'
      },
      headers: {}
    };
    const res = { status: jest.fn(() => res), json: jest.fn() };

    handleToken(req, res, { getClient, isValidRedirectUri: jest.fn(() => true), authCodes: {}, users, tokens, refreshTokens });

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'invalid_grant' }));
  });
  it('returns error for expired refresh token', () => {
    const now = Date.now();
    const expiredRefresh = 'expired_' + Math.random().toString(36).slice(2,10);
    refreshTokens[expiredRefresh] = {
      username,
      clientId,
      scopes,
      issuedAt: now - 20000,
      expiresAt: now - 10000
    };
    const req = { body: { grant_type: 'refresh_token', refresh_token: expiredRefresh, client_id: clientId, client_secret: clientSecret } };
    const res = { status: jest.fn(() => res), json: jest.fn() };
    handleToken(req, res, { getClient, isValidRedirectUri: jest.fn(() => true), authCodes: {}, users, tokens, refreshTokens });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'invalid_grant' }));
    expect(refreshTokens[expiredRefresh]).toBeUndefined();
  });
  it('new refresh token metadata is correct', () => {
    const oldRefresh = issueRefreshToken();
    const req = { body: { grant_type: 'refresh_token', refresh_token: oldRefresh, client_id: clientId, client_secret: clientSecret } };
    const res = { status: jest.fn(() => res), json: jest.fn() };
    handleToken(req, res, { getClient, isValidRedirectUri: jest.fn(() => true), authCodes: {}, users, tokens, refreshTokens });
    const newRefresh = res.json.mock.calls[0][0].refresh_token;
    const meta = refreshTokens[newRefresh];
    expect(meta).toBeDefined();
    expect(meta.username).toBe(username);
    expect(meta.clientId).toBe(clientId);
    expect(meta.scopes).toEqual(scopes);
    expect(meta.issuedAt).toBeDefined();
    if (meta.expiresAt) {
      expect(meta.expiresAt).toBeGreaterThan(Date.now());
    } else {
      expect(meta.expiresAt).toBeNull();
    }
  });
});
