import crypto from "crypto";
import jsonwebtoken from "jsonwebtoken";

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
  return original_query
    ? original_query.replace(/^\?/, "")
    : new URLSearchParams(req.query).toString();
}

/**
 * Merges global, client, and user claims for a JWT.
 * Precedence: user > client > global. Null values mean delete the key.
 * @param {object} jwtClaims - The jwtClaims store object
 * @param {string} clientId - The clientId
 * @param {string} userName - The userName
 * @returns {object} - The merged claims
 */
export function mergeJWTClaims(jwtClaims, clientId, userName) {
  // Start with globals
  let merged = { ...jwtClaims.globals };

  // Merge client claims if present
  if (clientId && jwtClaims.clients[clientId]) {
    for (const [key, value] of Object.entries(jwtClaims.clients[clientId])) {
      merged[key] = value;
    }
  }

  // Merge user claims if present
  if (userName && jwtClaims.users[userName]) {
    for (const [key, value] of Object.entries(jwtClaims.users[userName])) {
      merged[key] = value;
    }
  }

  // Remove keys with null values
  for (const key of Object.keys(merged)) {
    if (merged[key] === null) {
      delete merged[key];
    }
  }

  return merged;
}

// Resolves a dynamic claim variable using the provided context
export function resolveDynamicClaim(variable, context) {
  if (variable in context) return context[variable];
  if (variable.includes(".")) {
    const parts = variable.split(".");
    let val = context;
    for (const part of parts) {
      if (val && part in val) {
        val = val[part];
      } else {
        return undefined;
      }
    }
    return val;
  }
  return undefined;
}

// Builds a context object for dynamic claim resolution
// Automatically generates host, username, aud, exp, now, scope, client
export function createContextForDynamicClaims({
  user,
  client,
  scope,
  redirectUri,
  host,
  port,
} = {}) {
  const nowTs = Math.floor(Date.now() / 1000); // seconds since epoch
  const context = {};

  // Host (e.g. http://localhost:4000)
  context.host =
    host || (port ? `http://localhost:${port}` : "http://localhost");

  // Username
  context.username = user && user.username ? user.username : undefined;
  context.user = user;

  // Client
  context.client = client && client.clientId ? client.clientId : client;
  context.clientObj = client;

  // Scope
  context.scope = scope;

  // Audience (aud) from client id
  context.aud = context.client;

  // now: current timestamp
  context.now = nowTs;

  // iat: issued at
  context.iat = nowTs;

  // exp: expires in 1 hour
  context.exp = nowTs + 3600;

  return context;
}

// Signs a JWT token (access or refresh) with configurable options
// Supports both sync and async signing
// options: { tokenType, algorithm, key, kid, expiresIn, async, includeJwtKid }
export async function signJwtToken(payload, options = {}, config = {}) {
  const {
    tokenType = "access",
    algorithm = "HS256",
    key,
    kid,
    expiresIn = 3600,
    asym = false,
    includeJwtKid = true,
    ...jwtOptions
  } = options;

  if (!payload.exp) {
    jwtOptions.expiresIn = expiresIn;
  }

  // Header
  const header = { alg: algorithm, typ: "JWT" };
  if (includeJwtKid && kid) header.kid = kid;

  // Sign

  return await jsonwebtoken.sign(payload, key, {
    algorithm,
    header,
    ...jwtOptions,
  });
}

// Verifies a JWT token (access or refresh) with configurable options
// options: { algorithms, keys, secret, ... }
export function verifyJwtToken(token, options = {}, config = {}) {
  const {
    algorithms = ["HS256", "RS256", "ES256"],
    key,
    keys,
    secret,
    ...jwtOptions
  } = options;

  // Try all keys if provided
  if (keys && Array.isArray(keys)) {
    for (const k of keys) {
      try {
        return jsonwebtoken.verify(token, k, { algorithms, ...jwtOptions });
      } catch (e) {
        // Try next key
      }
    }
    throw new Error("JWT verification failed for all keys");
  }
  // Single key or secret
  return jsonwebtoken.verify(token, key || secret, {
    algorithms,
    ...jwtOptions,
  });
}

/**
 * Validates PKCE code_verifier against code_challenge and code_challenge_method.
 * Returns true if valid, false otherwise.
 * Supports S256 and plain methods.
 * @param {string} code_verifier
 * @param {string} code_challenge
 * @param {string} code_challenge_method
 */
export function validatePkce(
  code_verifier,
  code_challenge,
  code_challenge_method = "plain"
) {
  if (!code_verifier || !code_challenge) {
    return false;
  }
  if (code_challenge_method === "plain") {
    return code_verifier === code_challenge;
  }
  if (code_challenge_method === "S256") {
    try {
      const hashBuffer = crypto
        .createHash("sha256")
        .update(code_verifier)
        .digest();
      const base64url = hashBuffer
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
      return base64url === code_challenge;
    } catch (e) {
      return false;
    }
  }
  return false;
}
