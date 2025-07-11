// authorizationCode.js - /authorize endpoint handler
import { v4 as uuidv4 } from 'uuid';

export function handleAuthorize(req, res, { getClient, isValidRedirectUri, authCodes }) {
  // Only update the session with the latest query if not empty
  if (req.session && Object.keys(req.query).length > 0) {
    const flatQuery = {};
    for (const [k, v] of Object.entries(req.query)) {
      flatQuery[k] = Array.isArray(v) ? v[0] : String(v);
    }
    req.session.oauth_query = flatQuery;
  }
  // Use query from session if current query is empty
  const query = Object.keys(req.query).length > 0 ? req.query : (req.session && req.session.oauth_query ? req.session.oauth_query : {});
  const { response_type, client_id, redirect_uri, scope, state } = query;
  if (response_type !== 'code') {
    return oauthErrorRedirect(res, 'unsupported_response_type', 'Only code is supported');
  }
  const client = getClient(client_id);
  if (!client) {
    return oauthErrorRedirect(res, 'invalid_client', 'Unknown client');
  }
  if (!isValidRedirectUri(client, redirect_uri)) {
    return oauthErrorRedirect(res, 'invalid_redirect_uri', 'Invalid redirect URI');
  }
  // Generate auth code
  const code = uuidv4();
  authCodes[code] = {
    clientId: client_id,
    username: req.user.username,
    scope,
    redirectUri: redirect_uri,
    expiresAt: Date.now() + 600000, // 10 min
  };
  // Clear the stored query after successful issuance
  if (req.session) delete req.session.oauth_query;
  // Redirect to client with code
  const redirectUrl = new URL(redirect_uri);
  redirectUrl.searchParams.set('code', code);
  if (state) redirectUrl.searchParams.set('state', state);
  res.redirect(redirectUrl.toString());
}

// Helper for consistent error redirect (can be shared or passed in)
function oauthErrorRedirect(res, error, description, base = '/error') {
  const params = new URLSearchParams();
  params.set('error', error);
  if (description) params.set('error_description', description);
  res.redirect(`${base}?${params.toString()}`);
}
