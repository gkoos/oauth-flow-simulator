// logout.js - /logout endpoint handler
export function handleLogout(req, res) {
  // Only clear user session data, not oauth_query
  if (req.session) {
    req.session = null;
  }
  res.clearCookie('oauthsim.sid');
  res.redirect('/loggedout');
}
