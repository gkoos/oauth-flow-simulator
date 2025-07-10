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
