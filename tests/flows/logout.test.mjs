import { jest } from '@jest/globals';
import { handleLogout } from '../../lib/flows/logout.js';

describe('handleLogout', () => {
  it('clears session and redirects to /loggedout', () => {
    const req = { session: { foo: 'bar' } };
    const res = { redirect: jest.fn(), clearCookie: jest.fn() };
    handleLogout(req, res);
    expect(req.session).toBeNull();
    expect(res.clearCookie).toHaveBeenCalledWith('oauthsim.sid');
    expect(res.redirect).toHaveBeenCalledWith('/loggedout');
  });
});
