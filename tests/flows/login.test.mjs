import { jest } from '@jest/globals';
import { postLogin } from '../../lib/flows/login.js';

describe('postLogin', () => {
  let req, res, users;

  beforeEach(() => {
    req = {
      body: { username: 'alice', password: 'pw123' },
      query: { client_id: 'cid', redirect_uri: 'uri', response_type: 'code', scope: 'openid' },
      session: {},
    };
    res = { redirect: jest.fn() };
    users = [
      { username: 'alice', password: 'pw123', scopes: ['openid'] },
      { username: 'bob', password: 'pw456', scopes: ['profile'] },
    ];
  });

  it('sets session and redirects to /authorize on success', () => {
    postLogin(users)(req, res);
    expect(req.session.username).toBe('alice');
    expect(req.session.scopes).toEqual(['openid']);
    expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('/authorize'));
  });

  it('redirects to /login with error on failure', () => {
    req.body.password = 'wrong';
    postLogin(users)(req, res);
    expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('error=Invalid%20username%20or%20password'));
  });
});
