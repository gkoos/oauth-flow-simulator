// token.js - /token endpoint handler
import jwt from 'jsonwebtoken';

export function handleToken(req, res, { getClient, isValidRedirectUri, authCodes, users, tokens }) {
  const { grant_type, code, redirect_uri, client_id, client_secret } = req.body;
  if (grant_type !== 'authorization_code') {
    return res.status(400).json({ error: 'unsupported_grant_type', error_description: 'Only authorization_code is supported' });
  }
  const client = getClient(client_id);
  if (!client || client.clientSecret !== client_secret) {
    return res.status(401).json({ error: 'invalid_client', error_description: 'Invalid client credentials' });
  }
  if (!isValidRedirectUri(client, redirect_uri)) {
    return res.status(400).json({ error: 'invalid_grant', error_description: 'Invalid redirect URI' });
  }
  const auth = authCodes[code];
  if (!auth || auth.clientId !== client_id || auth.redirectUri !== redirect_uri || auth.expiresAt < Date.now()) {
    return res.status(400).json({ error: 'invalid_grant', error_description: 'Invalid or expired code' });
  }
  // Remove code (single use)
  delete authCodes[code];
  // Issue JWT access token
  const user = users.find((u) => u.username === auth.username);
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: user.username,
    aud: client_id,
    exp: now + 3600, // 1 hour
    scope: auth.scope,
  };
  const secret = process.env.JWT_SECRET || 'dev_secret';
  const access_token = jwt.sign(payload, secret);
  tokens[access_token] = { ...payload };
  res.json({
    access_token,
    token_type: 'Bearer',
    expires_in: 3600,
    scope: auth.scope,
  });
}
