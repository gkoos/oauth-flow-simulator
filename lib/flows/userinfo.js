import { users, userinfoScopes, tokens } from '../store.js';

// Helper to get claims allowed by scopes
function getAllowedClaims(scopes, clientId, username) {
  const globalMap = userinfoScopes.globals || {};
  const clientMap = (userinfoScopes.clients && userinfoScopes.clients[clientId]) || {};
  const userMap = (userinfoScopes.users && userinfoScopes.users[username]) || {};
  const merged = { ...globalMap, ...clientMap, ...userMap };
  const allowedClaims = new Set();
  scopes.forEach(scope => {
    if (merged[scope]) {
      merged[scope].forEach(claim => allowedClaims.add(claim));
    }
  });
  return Array.from(allowedClaims);
}

export async function userinfo(req, res) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'invalid_request', error_description: 'Missing or invalid Authorization header' });
  }
  const token = authHeader.slice(7);
  const tokenData = tokens[token];
  if (!tokenData) {
    return res.status(401).json({ error: 'invalid_token', error_description: 'Token not found or expired' });
  }
  const { username, clientId, scope } = tokenData;
  const scopes = scope.split(' ');
  const allowedClaims = getAllowedClaims(scopes, clientId, username);
  if (allowedClaims.length === 0) {
    return res.status(403).json({ error: 'insufficient_scope', error_description: 'No permitted claims for provided scopes' });
  }
  const user = users.find(u => u.username === username);
  if (!user) {
    return res.status(404).json({ error: 'user_not_found' });
  }
  const response = {};
  allowedClaims.forEach(claim => {
    if (user[claim] !== undefined) {
      response[claim] = user[claim];
    }
  });
  if (allowedClaims.includes('sub')) {
    response['sub'] = user.username;
  }
  return res.json(response);
}
