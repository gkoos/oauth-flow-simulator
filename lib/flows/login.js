// login.js - /login endpoint handler
import { getOriginalQuery } from '../helpers.js';

export function handleLogin(req, res, { users }) {
  const { username, password, original_query } = req.body;
  req.loginAttempt = { username, password };
  const user = users.find((u) => u.username === username && u.password === password);
  if (!user) {
    // Show error on login page, preserve original query
    const params = getOriginalQuery(req, original_query);
    return res.redirect(`/login?error=Invalid%20username%20or%20password&${params}`);
  }
  // Set session
  req.session.username = user.username;
  req.session.scopes = user.scopes;
  // Redirect to /authorize with original query
  const params = getOriginalQuery(req, original_query);
  res.redirect(`/authorize?${params}`);
}
