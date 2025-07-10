// helpers.js - shared utility functions for oauth-flow-simulator

// Find client by clientId
export function getClient(clients, clientId) {
  return clients.find((c) => c.clientId === clientId);
}

// Check if redirectUri is valid for client
export function isValidRedirectUri(client, redirectUri) {
  if (!client || !client.redirectUris) return false;
  return client.redirectUris.includes(redirectUri);
}

// DRY query param extraction for redirects
export function getOriginalQuery(req, original_query) {
  return original_query ? original_query.replace(/^\?/, '') : new URLSearchParams(req.query).toString();
}
