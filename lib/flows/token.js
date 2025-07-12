// token.js - /token endpoint handler
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';

const REFRESH_TOKEN_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function handleToken(req, res, { getClient, isValidRedirectUri, authCodes, users, tokens, refreshTokens }) {
  const { grant_type, code, redirect_uri, client_id, client_secret, refresh_token } = req.body;
  const secret = process.env.JWT_SECRET || 'dev_secret';
  if (grant_type === 'authorization_code') {
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
    const access_token = jwt.sign(payload, secret);
    tokens[access_token] = { ...payload };
    // Check for offline_access scope
    const scopes = (auth.scope || '').split(' ');
    let new_refresh_token;
    if (scopes.includes('offline_access')) {
      // Generate secure random refresh token
      new_refresh_token = randomBytes(32).toString('hex');
      let expiresAt = null;
      if (client.refreshTokenLifetime) {
        expiresAt = Date.now() + client.refreshTokenLifetime;
      }
      refreshTokens[new_refresh_token] = {
        username: user.username,
        clientId: client_id,
        scopes,
        issuedAt: Date.now(),
        expiresAt
      };
    }
    return res.json({
      access_token,
      token_type: 'Bearer',
      expires_in: 3600,
      scope: auth.scope,
      ...(new_refresh_token ? { refresh_token: new_refresh_token } : {})
    });
  } else if (grant_type === 'refresh_token') {
    // Validate refresh token
    const meta = refreshTokens[refresh_token];
    if (!meta || meta.clientId !== client_id || meta.username == null) {
      return res.status(400).json({ error: 'invalid_grant', error_description: 'Invalid refresh token' });
    }
    if (meta.expiresAt && meta.expiresAt < Date.now()) {
      delete refreshTokens[refresh_token]; // Clean up expired token
      return res.status(400).json({ error: 'invalid_grant', error_description: 'Refresh token expired' });
    }
    // Remove old refresh token (rotation)
    delete refreshTokens[refresh_token];
    // Issue new access token
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      sub: meta.username,
      aud: client_id,
      exp: now + 3600,
      scope: meta.scopes.join(' '),
    };
    const access_token = jwt.sign(payload, secret);
    tokens[access_token] = { ...payload };
    // Issue new refresh token
    const client = getClient(client_id);
    let expiresAt = null;
    if (client && client.refreshTokenLifetime) {
      expiresAt = Date.now() + client.refreshTokenLifetime;
    }
    const new_refresh_token = randomBytes(32).toString('hex');
    refreshTokens[new_refresh_token] = {
      username: meta.username,
      clientId: client_id,
      scopes: meta.scopes,
      issuedAt: Date.now(),
      expiresAt
    };
    return res.json({
      access_token,
      token_type: 'Bearer',
      expires_in: 3600,
      scope: payload.scope,
      refresh_token: new_refresh_token
    });
  } else {
    return res.status(400).json({ error: 'unsupported_grant_type', error_description: 'Only authorization_code and refresh_token are supported' });
  }
}
