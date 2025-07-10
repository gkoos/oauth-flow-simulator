import { jest } from '@jest/globals';
import { handleLogin } from '../../lib/flows/login.js';

describe('handleLogin', () => {
  let req, res, users;

  beforeEach(() => {
    req = {
      body: { username: 'alice', password: 'pw123', original_query: '' },
      session: {},
    };
    res = { redirect: jest.fn() };
    users = [
      { username: 'alice', password: 'pw123', scopes: ['openid'] },
      { username: 'bob', password: 'pw456', scopes: ['profile'] },
    ];
  });

  it('sets session and redirects to /authorize on success', () => {
    handleLogin(req, res, { users });
    expect(req.session.username).toBe('alice');
    expect(req.session.scopes).toEqual(['openid']);
    expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('/authorize'));
  });

  it('redirects to /login with error on failure', () => {
    req.body.password = 'wrong';
    handleLogin(req, res, { users });
    expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('error=Invalid%20username%20or%20password'));
  });
});
