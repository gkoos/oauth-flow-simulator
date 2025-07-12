// requireLogin.js - Middleware to restore req.user from session
export default function requireLogin(req, res, next) {
  if (req.session && req.session.username) {
    req.user = {
      username: req.session.username,
      scopes: req.session.scopes || []
    };
  }
  next();
}
