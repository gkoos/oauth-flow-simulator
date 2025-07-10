import { jest } from '@jest/globals';
import { handleAuthorize } from '../../lib/flows/authorizationCode.js';

describe('handleAuthorize', () => {
  let req, res, getClient, isValidRedirectUri, authCodes;

  beforeEach(() => {
    req = {
      query: {
        response_type: 'code',
        client_id: 'web-app',
        redirect_uri: 'http://localhost:3000/callback',
        scope: 'openid',
        state: 'xyz',
      },
      user: { username: 'alice' },
    };
    res = { redirect: jest.fn() };
    getClient = jest.fn(() => ({
      clientId: 'web-app',
      redirectUris: ['http://localhost:3000/callback'],
    }));
    isValidRedirectUri = jest.fn(() => true);
    authCodes = {};
  });

  it('redirects with code and state for valid request', () => {
    handleAuthorize(req, res, { getClient, isValidRedirectUri, authCodes });
    expect(res.redirect).toHaveBeenCalled();
    const url = res.redirect.mock.calls[0][0];
    expect(url).toMatch(/code=/);
    expect(url).toMatch(/state=xyz/);
  });

  it('redirects to error for unsupported response_type', () => {
    req.query.response_type = 'token';
    handleAuthorize(req, res, { getClient, isValidRedirectUri, authCodes });
    expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('unsupported_response_type'));
  });

  it('redirects to error for invalid client', () => {
    getClient = jest.fn(() => undefined);
    handleAuthorize(req, res, { getClient, isValidRedirectUri, authCodes });
    expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('invalid_client'));
  });

  it('redirects to error for invalid redirect uri', () => {
    isValidRedirectUri = jest.fn(() => false);
    handleAuthorize(req, res, { getClient, isValidRedirectUri, authCodes });
    expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('invalid_redirect_uri'));
  });
});
