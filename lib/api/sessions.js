import { tokens, authCodes, refreshTokens } from '../store.js';

export function listSessions(req, res) {
  res.json({
    tokens,
    authCodes,
    refreshTokens
  });
}
