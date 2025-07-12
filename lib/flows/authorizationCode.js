// authorizationCode.js - /authorize endpoint handler
import { v4 as uuidv4 } from 'uuid';
import { getClient } from '../helpers.js';

// In-memory consent store: { [username]: { [clientId]: [scopeName, ...] } }
export const consents = {};

export function handleAuthorize(req, res, { isValidRedirectUri, authCodes, clients }) {
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
  const { response_type, client_id, redirect_uri, state, scope, consent } = query;
  if (response_type !== 'code') {
    return oauthErrorRedirect(res, 'unsupported_response_type', 'Only code is supported');
  }
  // Directly call getClient(clients, client_id)
  const client = getClient(clients, client_id);
  if (!client) {
    return oauthErrorRedirect(res, 'invalid_client', 'Unknown client');
  }
  if (!isValidRedirectUri(client, redirect_uri)) {
    return oauthErrorRedirect(res, 'invalid_redirect_uri', 'Invalid redirect URI');
  }
  // Validate requested scopes against client.scopes
  const requestedScopes = (scope || '').split(' ').filter(Boolean);
  const validScopes = (client.scopes || []).map(s => s.name);
  if (requestedScopes.some(s => !validScopes.includes(s))) {
    return oauthErrorRedirect(res, 'invalid_scope', 'One or more requested scopes are invalid or unknown for this client.');
  }

  // Consent logic
  const username = req.user && req.user.username;
  if (!username) return oauthErrorRedirect(res, 'login_required', 'User not logged in');
  consents[username] = consents[username] || {};
  consents[username][client_id] = consents[username][client_id] || [];
  const alreadyConsented = consents[username][client_id];
  const scopesNeedingConsent = (client.scopes || [])
    .filter(s => requestedScopes.includes(s.name) && s.consentNeeded && !alreadyConsented.includes(s.name))
    .map(s => s.name);

  // If user has not yet given consent for all required scopes, show consent page
  if (scopesNeedingConsent.length > 0 && consent !== 'given') {
    // Pass only scope to consent page
    const params = new URLSearchParams({
      client_id,
      redirect_uri,
      state,
      scope: scopesNeedingConsent.join(' ')
    });
    return res.redirect(`/consent?${params.toString()}`);
  }
  // If consent is rejected
  if (consent === 'rejected') {
    // Do NOT store anything for rejected consent
    const redirectUrl = new URL(redirect_uri);
    redirectUrl.searchParams.set('error', 'access_denied');
    if (state) redirectUrl.searchParams.set('state', state);
    return res.redirect(redirectUrl.toString());
  }
  // If consent is given, store it
  if (consent === 'given' && scopesNeedingConsent.length > 0) {
    consents[username][client_id].push(...scopesNeedingConsent);
  }
  // Generate auth code
  const code = uuidv4();
  authCodes[code] = {
    clientId: client_id,
    username,
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
