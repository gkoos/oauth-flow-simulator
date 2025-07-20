// token.js - /token endpoint handler
import { randomBytes } from "crypto";
import { authenticateClient } from "../middleware/authenticateClient.js";
import { jwtClaims, configSigning, signingKeys } from "../store.js";
import {
  mergeJWTClaims,
  createContextForDynamicClaims,
  resolveDynamicClaim,
  validatePkce,
  signJwtToken,
  verifyJwtToken,
} from "../helpers.js";

export async function handleToken(
  req,
  res,
  { getClient, isValidRedirectUri, authCodes, users, tokens, refreshTokens }
) {
  const {
    grant_type,
    code,
    redirect_uri,
    client_id,
    client_secret,
    refresh_token,
  } = req.body;
  const secret = process.env.JWT_SECRET || "dev_secret";
  // --- Use authentication middleware ---
  const client = authenticateClient(req, res, getClient);
  if (!client) return; // error already sent
  if (req.forceError) {
    return res.status(req.forceError.status || 400).json({
      error: req.forceError.code,
      error_description:
        req.forceError.description || "Forced error for testing.",
    });
  }
  if (grant_type === "authorization_code") {
    if (!isValidRedirectUri(client, redirect_uri)) {
      return res
        .status(400)
        .json({
          error: "invalid_grant",
          error_description: "Invalid redirect URI",
        });
    }
    const auth = authCodes[code];
    if (
      !auth ||
      auth.clientId !== client.clientId ||
      auth.redirectUri !== redirect_uri ||
      auth.expiresAt < Date.now()
    ) {
      return res
        .status(400)
        .json({
          error: "invalid_grant",
          error_description: "Invalid or expired code",
        });
    }
    // PKCE validation if code_challenge is present
    if (auth.pkce && auth.pkce.code_challenge) {
      // Default method to 'plain' if missing
      const method = auth.pkce.code_challenge_method || "plain";
      const verifier = req.body.code_verifier;
      if (!verifier) {
        return res
          .status(400)
          .json({
            error: "invalid_grant",
            error_description: "Missing code_verifier for PKCE",
          });
      }
      if (!validatePkce(verifier, auth.pkce.code_challenge, method)) {
        return res
          .status(400)
          .json({
            error: "invalid_grant",
            error_description: "Invalid code_verifier for PKCE",
          });
      }
    }
    // Remove code (single use)
    delete authCodes[code];
    // Issue JWT access token
    const user = users.find((u) => u.username === auth.username);

    const context = createContextForDynamicClaims({
      user,
      client,
      scope: auth.scope,
      redirectUri: redirect_uri,
      host: req.protocol + "://" + req.get("host"),
      port: req.socket.localPort,
    });
    const merged = mergeJWTClaims(jwtClaims, client.clientId, user.username);
    const claims = {};
    for (const [key, value] of Object.entries(merged)) {
      if (
        typeof value === "string" &&
        value.startsWith("{{") &&
        value.endsWith("}}")
      ) {
        const varName = value.slice(2, -2);
        claims[key] = resolveDynamicClaim(varName, context);
      } else {
        claims[key] = value;
      }
    }
    // Determine signing key and algorithm
    let key, algorithm, kid;
    if (configSigning.asymKeySigning) {
      let activeKey;
      if (
        signingKeys &&
        signingKeys.keys &&
        signingKeys.keys.length > 0 &&
        signingKeys.activeKid
      ) {
        activeKey = signingKeys.keys.find(
          (k) => k.kid === signingKeys.activeKid
        );

        key = activeKey.private;
        algorithm = activeKey.alg || "RS256";
        kid = activeKey.kid;
      } else {
        return res.status(500).json({
          error: "server_error",
          error_description: "No valid key for asymmetric signing.",
        });
      }
    } else {
      key = secret;
      algorithm = "HS256";
      kid = undefined;
    }

    const accessTokenOpts = {
      tokenType: "access",
      algorithm,
      key,
      kid,
      asym: configSigning.asymKeySigning,
      includeJwtKid: configSigning.includeJwtKid,
    };

    const access_token = await signJwtToken(claims, accessTokenOpts);
    tokens[access_token] = { ...claims };
    // Check for offline_access scope
    const scopes = (auth.scope || "").split(" ");
    let new_refresh_token;
    if (scopes.includes("offline_access")) {
      // Issue refresh token as JWT
      let refreshKey, refreshAlg, refreshKid;
      let algorithm; // Ensure algorithm is always defined
      if (configSigning.asymKeySigning) {
        let activeKey;
        if (
          signingKeys &&
          signingKeys.keys &&
          signingKeys.keys.length > 0 &&
          signingKeys.activeKid
        ) {
          activeKey = signingKeys.keys.find(
            (k) => k.kid === signingKeys.activeKid
          );
        }
        if (
          activeKey &&
          activeKey.private &&
          /^-----BEGIN( RSA)? PRIVATE KEY-----/.test(
            activeKey.private.trim()
          ) &&
          !activeKey.private.includes("...")
        ) {
          refreshKey = activeKey.private;
          refreshAlg = activeKey.alg || "RS256";
          refreshKid = activeKey.kid;
          algorithm = refreshAlg;
        } else {
          return res
            .status(500)
            .json({
              error: "server_error",
              error_description: "No valid key for asymmetric signing.",
            });
        }
      } else {
        refreshKey = secret;
        refreshAlg = "HS256";
        refreshKid = undefined;
        algorithm = refreshAlg;
      }
      const refreshPayload = {
        sub: user.username,
        aud: client.clientId,
        scope: scopes.join(" "),
        iat: Math.floor(Date.now() / 1000),
        exp:
          Math.floor(Date.now() / 1000) +
          (client.refreshTokenLifetime
            ? Math.floor(client.refreshTokenLifetime / 1000)
            : 7 * 24 * 60 * 60),
        token_type: "refresh_token",
      };

      const refreshTokenOpts = {
        tokenType: "refresh",
        algorithm,
        key: refreshKey,
        kid: refreshKid,
        asym: configSigning.asymKeySigning,
        includeJwtKid: configSigning.includeJwtKid,
      };
      if (!("exp" in refreshPayload)) {
        refreshTokenOpts.expiresIn = client.refreshTokenLifetime
          ? Math.floor(client.refreshTokenLifetime / 1000)
          : 7 * 24 * 60 * 60;
      }

      new_refresh_token = await signJwtToken(refreshPayload, refreshTokenOpts);
      refreshTokens[new_refresh_token] = {
        username: user.username,
        clientId: client.clientId,
        scopes,
        issuedAt: Date.now(),
        expiresAt: client.refreshTokenLifetime
          ? Date.now() + client.refreshTokenLifetime
          : undefined,
      };
    }
    return res.json({
      access_token,
      token_type: "Bearer",
      expires_in: 3600,
      scope: auth.scope,
      ...(new_refresh_token ? { refresh_token: new_refresh_token } : {}),
    });
  } else if (grant_type === "refresh_token") {
    // Validate refresh token
    const meta = refreshTokens[refresh_token];
    if (!meta || meta.username == null) {
      return res
        .status(400)
        .json({
          error: "invalid_grant",
          error_description: "Invalid refresh token",
        });
    }
    // If token exists but client does not match, return invalid_grant (400)
    if (meta.clientId !== client.clientId) {
      return res
        .status(400)
        .json({
          error: "invalid_grant",
          error_description: "Invalid refresh token",
        });
    }
    if (meta.expiresAt && meta.expiresAt < Date.now()) {
      delete refreshTokens[refresh_token]; // Clean up expired token
      return res
        .status(400)
        .json({
          error: "invalid_grant",
          error_description: "Refresh token expired",
        });
    }
    // Remove old refresh token (rotation)
    delete refreshTokens[refresh_token];
    // Issue new access token
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      sub: meta.username,
      aud: client.clientId,
      exp: now + 3600,
      scope: meta.scopes.join(" "),
    };
    // Determine signing key and algorithm for refresh flow
    let key, algorithm, kid;
    if (configSigning.asymKeySigning) {
      let activeKey;
      if (
        signingKeys &&
        signingKeys.keys &&
        signingKeys.keys.length > 0 &&
        signingKeys.activeKid
      ) {
        activeKey = signingKeys.keys.find(
          (k) => k.kid === signingKeys.activeKid
        );
      }
      if (activeKey) {
        key = activeKey.private;
        algorithm = activeKey.alg || "RS256";
        kid = activeKey.kid;
      } else {
        key = secret;
        algorithm = "HS256";
        kid = undefined;
      }
    } else {
      key = secret;
      algorithm = "HS256";
      kid = undefined;
    }
    const accessTokenOpts2 = {
      tokenType: "access",
      algorithm,
      key,
      kid,
      asym: configSigning.asymKeySigning,
      includeJwtKid: configSigning.includeJwtKid,
    };

    const access_token = await signJwtToken(payload, accessTokenOpts2);
    tokens[access_token] = { ...payload };
    // Issue new refresh token
    let expiresAt = null;
    if (client && client.refreshTokenLifetime) {
      expiresAt = Date.now() + client.refreshTokenLifetime;
    }
    const refreshPayload = {
      sub: meta.username,
      aud: client.clientId,
      scope: meta.scopes.join(" "),
      iat: now,
      exp: expiresAt ? Math.floor(expiresAt / 1000) : now + 7 * 24 * 60 * 60,
      token_type: "refresh_token",
    };

    const refreshTokenOpts2 = {
      tokenType: "refresh",
      algorithm,
      key,
      kid,
      asym: configSigning.asymKeySigning,
      includeJwtKid: configSigning.includeJwtKid,
    };
    if (!("exp" in refreshPayload)) {
      refreshTokenOpts2.expiresIn = expiresAt
        ? Math.floor((expiresAt - Date.now()) / 1000)
        : 7 * 24 * 60 * 60;
    }

    const new_refresh_token = await signJwtToken(
      refreshPayload,
      refreshTokenOpts2
    );
    refreshTokens[new_refresh_token] = {
      username: meta.username,
      clientId: client.clientId,
      scopes: meta.scopes,
      issuedAt: Date.now(),
      expiresAt,
    };
    return res.json({
      access_token,
      token_type: "Bearer",
      expires_in: 3600,
      scope: payload.scope,
      refresh_token: new_refresh_token,
    });
  } else {
    return res
      .status(400)
      .json({
        error: "unsupported_grant_type",
        error_description:
          "Only authorization_code and refresh_token are supported",
      });
  }
}

// RFC 7009: Token Revocation Endpoint
export function handleRevoke(req, res, { getClient, tokens, refreshTokens }) {
  // Authenticate client
  const client = authenticateClient(req, res, getClient);
  if (!client) return; // error already sent
  const { token, token_type_hint } = req.body;
  // RFC: token is required
  if (!token) {
    return res
      .status(400)
      .json({
        error: "invalid_request",
        error_description: "Missing token field",
      });
  }
  if (req.forceError) {
    return res.status(req.forceError.status || 400).json({
      error: req.forceError.code,
      error_description:
        req.forceError.description || "Forced error for testing.",
    });
  }
  if (token_type_hint === "access_token") {
    // Only check access tokens, ignore refresh tokens completely
    if (
      Object.prototype.hasOwnProperty.call(tokens, token) &&
      tokens[token].aud === client.clientId
    ) {
      delete tokens[token];
    }
    return res.status(200).json({});
  }
  if (token_type_hint === "refresh_token") {
    // Only check refresh tokens, ignore access tokens completely
    if (
      Object.prototype.hasOwnProperty.call(refreshTokens, token) &&
      refreshTokens[token].clientId === client.clientId
    ) {
      delete refreshTokens[token];
    }
    return res.status(200).json({});
  }
  // If no hint, check both
  let revoked = false;
  if (
    Object.prototype.hasOwnProperty.call(tokens, token) &&
    tokens[token].aud === client.clientId
  ) {
    delete tokens[token];
    revoked = true;
  } else if (
    Object.prototype.hasOwnProperty.call(refreshTokens, token) &&
    refreshTokens[token].clientId === client.clientId
  ) {
    delete refreshTokens[token];
    revoked = true;
  }
  return res.status(200).json({});
}

// RFC 7662: Token Introspection Endpoint
export async function handleIntrospect(
  req,
  res,
  { getClient, tokens, refreshTokens }
) {
  // Authenticate client
  const client = authenticateClient(req, res, getClient);
  if (!client) return; // error already sent
  const { token, token_type_hint } = req.body;
  let meta, tokenType;
  // Check access token
  if (token_type_hint === "access_token" || !token_type_hint) {
    meta = tokens[token];
    tokenType = "access_token";
  }
  // If not found, check refresh token
  if (!meta && (token_type_hint === "refresh_token" || !token_type_hint)) {
    meta = refreshTokens[token];
    tokenType = "refresh_token";
  }
  // If not found or revoked, return inactive
  if (!meta) {
    return res.json({ active: false });
  }
  // Check expiry for access token (JWT)
  if (tokenType === "access_token") {
    try {
      let key, algorithms;

      if (configSigning.asymKeySigning) {
        // Determine verification key and algorithm
        let activeKey;
        if (
          signingKeys &&
          signingKeys.keys &&
          signingKeys.keys.length > 0 &&
          signingKeys.activeKid
        ) {
          activeKey = signingKeys.keys.find(
            (k) => k.kid === signingKeys.activeKid
          );
        }
        if (
          activeKey &&
          activeKey.public &&
          /^-----BEGIN( RSA)? PUBLIC KEY-----/.test(activeKey.public.trim())
        ) {
          key = activeKey.public;
          algorithms = [activeKey.alg || "RS256"];
        } else {
          key = process.env.JWT_SECRET || "dev_secret";
          algorithms = ["HS256"];
        }
      } else {
        key = process.env.JWT_SECRET || "dev_secret";
        algorithms = ["HS256"];
      }
      const decoded = verifyJwtToken(token, { key, algorithms });
      // If expired, verifyJwtToken throws
      // Compose RFC 7662 response
      return res.json({
        active: true,
        scope: decoded.scope,
        client_id: decoded.aud,
        username: decoded.sub,
        exp: decoded.exp,
        iat: decoded.iat,
        sub: decoded.sub,
        aud: decoded.aud,
        iss: "oauth-flow-simulator",
        token_type: "access_token",
      });
    } catch (e) {
      return res.json({ active: false });
    }
  }
  // Check expiry for refresh token
  if (tokenType === "refresh_token") {
    if (meta.expiresAt && meta.expiresAt < Date.now()) {
      return res.json({ active: false });
    }
    return res.json({
      active: true,
      scope: meta.scopes.join(" "),
      client_id: meta.clientId,
      username: meta.username,
      exp: meta.expiresAt ? Math.floor(meta.expiresAt / 1000) : undefined,
      iat: Math.floor(meta.issuedAt / 1000),
      sub: meta.username,
      aud: meta.clientId,
      iss: "oauth-flow-simulator",
      token_type: "refresh_token",
    });
  }
  // Fallback
  return res.json({ active: false });
}
