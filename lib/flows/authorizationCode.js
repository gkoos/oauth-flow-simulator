// authorizationCode.js - /authorize endpoint handler
import { v4 as uuidv4 } from 'uuid';
import { getClient } from '../helpers.js';

// In-memory consent store: { [username]: { [clientId]: [scopeName, ...] } }
export const consents = {};

export function handleAuthorize(req, res, { isValidRedirectUri, authCodes, clients }) {
  // Endpoint-specific error injection for /authorize: always process first
  if (req.forceError) {
    const { code, description } = req.forceError;
    const redirect_uri = req.query.redirect_uri;
    const state = req.query.state;
    if (redirect_uri) {
      let errorParams = `error=${encodeURIComponent(code)}`;
      if (description) errorParams += `&error_description=${encodeURIComponent(description)}`;
      if (state) errorParams += `&state=${encodeURIComponent(state)}`;
      res.redirect(`${redirect_uri}?${errorParams}`);
    } else {
      res.status(400).json({
        error: code,
        error_description: description || 'Forced error for testing.'
      });
    }
    return; // Ensure no further logic runs
  }

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
    return oauthErrorRedirect(res, 'unsupported_response_type', 'Only code is supported', redirect_uri, state);
  }
  // Directly call getClient(clients, client_id)
  const client = getClient(clients, client_id);
  if (!client) {
    return oauthErrorRedirect(res, 'invalid_client', 'Unknown client', redirect_uri, state);
  }
  if (!isValidRedirectUri(client, redirect_uri)) {
    return oauthErrorRedirect(res, 'invalid_redirect_uri', 'Invalid redirect URI', redirect_uri, state);
  }
  // Validate requested scopes against client.scopes
  const requestedScopes = (scope || '').split(' ').filter(Boolean);
  const validScopes = (client.scopes || []).map(s => s.name);
  if (requestedScopes.some(s => !validScopes.includes(s))) {
    return oauthErrorRedirect(res, 'invalid_scope', 'One or more requested scopes are invalid or unknown for this client.', redirect_uri, state);
  }

  // Consent logic
  const username = req.user && req.user.username;
  if (!username) {
    // If browser (Accept: html), redirect to /login with OAuth params
    if (req.accepts('html')) {
      const params = [];
      if (client_id) params.push(`client_id=${encodeURIComponent(client_id)}`);
      if (redirect_uri) params.push(`redirect_uri=${encodeURIComponent(redirect_uri)}`);
      if (response_type) params.push(`response_type=${encodeURIComponent(response_type)}`);
      if (scope) params.push(`scope=${encodeURIComponent(scope)}`);
      if (state) params.push(`state=${encodeURIComponent(state)}`);
      // Forward error injection params for /login
      if (req.query.force_error) params.push(`force_error=${encodeURIComponent(req.query.force_error)}`);
      if (req.query.error_description) params.push(`error_description=${encodeURIComponent(req.query.error_description)}`);
      const paramStr = params.length ? `?${params.join('&')}` : '';
      return res.redirect(`/login${paramStr}`);
    }
    // Otherwise, redirect to client callback with error per OAuth2 spec
    return oauthErrorRedirect(res, 'login_required', 'User not logged in', redirect_uri, state);
  }
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
  // Remove delay from query before rendering login or redirecting to login
  // Only redirect to /login if not authenticated and no authorize_force_error
  if (!req.user && !req.query.authorize_force_error) {
    // If not logged in, redirect to login page with OAuth params, but without delay
    const loginParams = [];
    if (client_id) loginParams.push(`client_id=${encodeURIComponent(client_id)}`);
    if (redirect_uri) loginParams.push(`redirect_uri=${encodeURIComponent(redirect_uri)}`);
    if (response_type) loginParams.push(`response_type=${encodeURIComponent(response_type)}`);
    if (scope) loginParams.push(`scope=${encodeURIComponent(scope)}`);
    if (state) loginParams.push(`state=${encodeURIComponent(state)}`);
    // When redirecting to /login, forward only generic error injection params
    const errorParams = [];
    if (req.query.force_error) errorParams.push(`force_error=${encodeURIComponent(req.query.force_error)}`);
    if (req.query.error_description) errorParams.push(`error_description=${encodeURIComponent(req.query.error_description)}`);
    const errorQuery = errorParams.length ? `&${errorParams.join('&')}` : '';
    // Do NOT forward authorize_force_error or delay
    return res.redirect(`/login?client_id=${client_id}&redirect_uri=${encodeURIComponent(redirect_uri)}${errorQuery}`);
  }
}

// Helper for consistent error redirect (can be shared or passed in)
function oauthErrorRedirect(res, error, description, redirect_uri, state) {
  if (redirect_uri) {
    let errorParams = `error=${encodeURIComponent(error)}`;
    if (description) errorParams += `&error_description=${encodeURIComponent(description)}`;
    if (state) errorParams += `&state=${encodeURIComponent(state)}`;
    return res.redirect(`${redirect_uri}?${errorParams}`);
  } else {
    const params = new URLSearchParams();
    params.set('error', error);
    if (description) params.set('error_description', description);
    res.redirect(`/error?${params.toString()}`);
  }
}
