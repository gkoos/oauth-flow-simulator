// logout.js - /logout endpoint handler
export function handleLogout(req, res) {
  req.session = null;
  res.clearCookie('oauthsim.sid');
  res.redirect('/login');
}
