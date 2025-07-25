import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import cookieSession from 'cookie-session';
import { getClient, isValidRedirectUri } from './helpers.js';
import { handleAuthorize } from './flows/authorizationCode.js';
import { handleToken, handleRevoke, handleIntrospect } from './flows/token.js';
import { handleLogout } from './flows/logout.js';
import { registerSimApi } from './sim-api.js';
import expressOpenApiValidator from 'express-openapi-validator';
import { setupMorgan } from './morgan-setup.js';
import { getLogin, postLogin } from './flows/login.js';
import { clients, users, authCodes, tokens, refreshTokens, discoveryDocument } from './store.js';
import delayMiddleware from './middleware/delayMiddleware.js';
import errorInjectionMiddleware from './middleware/errorInjectionMiddleware.js';
import requireLogin from './middleware/requireLogin.js';
import errorSimulationMiddleware from './middleware/errorSimulationMiddleware.js';
import { userinfo } from './flows/userinfo.js';
import { jwks } from './flows/jwks.js';
import { getUserinfoConfig, updateGlobalUserinfoConfig, updateClientUserinfoConfig, updateUserUserinfoConfig } from './api/userinfoConfig.js';
import keysRouter from './api/keys.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create and configure app at module scope
const app = express();
if (process.env.NODE_ENV !== 'test') {
  setupMorgan(app);
}
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../public')));

// Register OpenAPI validator only for /sim endpoints

const openApiSpecPath = path.join(__dirname, '../docs/openapi.yaml');
// Only apply OpenAPI validator to /sim endpoints
app.use('/sim', expressOpenApiValidator.middleware({
  apiSpec: openApiSpecPath,
  validateRequests: true,
  validateResponses: true,
}));

// Register /sim endpoints directly on the app
registerSimApi(app, { users, clients, authCodes, tokens });

// Register /sim/keys endpoints
app.use(keysRouter);

app.get('/jwks', jwks);

const isHttps = process.env.HTTPS === 'true';
// Rotate session secret on each server start (for dev/testing)
function getRotatedSessionSecret() {
  if (process.env.NODE_ENV === 'production') {
    return process.env.SESSION_SECRET || 'dev_secret';
  }
  if (process.env.NODE_ENV === 'test') {
    return 'test_secret';
  }
  // Use a random secret for each start in dev
  return Math.random().toString(36).slice(2) + Date.now();
}
app.use(cookieSession({
  name: 'oauthsim.sid',
  keys: [getRotatedSessionSecret()],
  maxAge: 24 * 60 * 60 * 1000,
  secure: isHttps,
  sameSite: 'lax'
}));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../templates'));
app.get('/login', getLogin(users));
app.get('/error', (req, res) => {
  const errorMsg = req.query.error_description || req.query.error || '';
  res.render('error', { error: errorMsg });
});
app.get('/', (req, res) => {
  res.render('welcome');
});
app.get('/loggedout', (req, res) => {
  res.render('loggedout', { loggedout: true });
});
function oauthErrorRedirect(res, error, description, base = '/error') {
  const params = new URLSearchParams();
  params.set('error', error);
  if (description) params.set('error_description', description);
  res.redirect(`${base}?${params.toString()}`);
}
function validateAuthorizeRequest(req, res, next) {
  const { client_id, redirect_uri, scope, code_challenge_method, code_challenge } = req.query;
  // Validate client_id
  const client = clients.find(c => String(c.clientId) === String(client_id));
  if (!client) {
    const params = new URLSearchParams();
    params.set('error', 'invalid_client');
    params.set('error_description', 'Unknown client');
    return res.redirect(`/error?${params.toString()}`);
  }
  // Validate redirect_uri
  if (!redirect_uri || !client.redirectUris.includes(redirect_uri)) {
    const params = new URLSearchParams();
    params.set('error', 'invalid_redirect_uri');
    params.set('error_description', 'Invalid redirect URI');
    return res.redirect(`/error?${params.toString()}`);
  }
  // Validate scopes (per-client)
  const requestedScopes = (scope || '').split(' ').filter(Boolean);
  const validScopes = client.scopes.map(s => s.name);
  if (requestedScopes.some(s => !validScopes.includes(s))) {
    const params = new URLSearchParams();
    params.set('error', 'invalid_scope');
    params.set('error_description', 'One or more requested scopes are invalid or unknown.');
    return res.redirect(`/error?${params.toString()}`);
  }
  // Manual PKCE method validation
  if (code_challenge_method !== undefined) {
    if (!['plain', 'S256'].includes(code_challenge_method)) {
      const params = new URLSearchParams();
      params.set('error', 'invalid_request');
      params.set('error_description', 'code_challenge_method must be "plain" or "S256"');
      return res.redirect(`/error?${params.toString()}`);
    }
    if (!code_challenge) {
      const params = new URLSearchParams();
      params.set('error', 'invalid_request');
      params.set('error_description', 'code_challenge is required when code_challenge_method is provided');
      return res.redirect(`/error?${params.toString()}`);
    }
  }
  next();
}
app.post('/login', postLogin(users));
app.use('/authorize', errorInjectionMiddleware);
app.get('/authorize', errorSimulationMiddleware('/authorize'), delayMiddleware, errorInjectionMiddleware, validateAuthorizeRequest, requireLogin, (req, res) => handleAuthorize(req, res, {
  isValidRedirectUri,
  authCodes,
  clients
}));
app.post('/authorize', errorSimulationMiddleware('/authorize'), delayMiddleware, errorInjectionMiddleware, handleAuthorize);
app.post('/token', errorSimulationMiddleware('/token'), delayMiddleware, (req, res) => handleToken(req, res, {
  getClient: (id) => getClient(clients, id),
  isValidRedirectUri,
  authCodes,
  users,
  tokens,
  refreshTokens // <-- pass refreshTokens to handler
}));
app.use('/token', errorInjectionMiddleware);
app.get('/logout', (req, res) => handleLogout(req, res));
app.get('/consent', requireLogin, (req, res) => {
  // Render a simple consent page with scopes needing consent
  const { client_id, redirect_uri, state, scope } = req.query;
  const scopesList = (scope || '').split(' ').filter(Boolean);
  res.render('consent', {
    client_id,
    redirect_uri,
    state,
    scopes: scopesList,
    scope
  });
});

app.post('/consent', requireLogin, (req, res) => {
  // Handle consent form submission
  const { client_id, redirect_uri, state, action, scope, response_type = 'code' } = req.body;
  // If denied, redirect directly to callback URI with error
  if (action === 'reject') {
    const redirectUrl = new URL(redirect_uri);
    redirectUrl.searchParams.set('error', 'access_denied');
    if (state) redirectUrl.searchParams.set('state', state);
    return res.redirect(redirectUrl.toString());
  }
  // If allowed, call authorization logic directly to issue code and redirect
  if (action === 'accept') {
    // Simulate a GET /authorize with consent=given
    req.query = {
      client_id,
      redirect_uri,
      state,
      scope,
      response_type,
      consent: 'given'
    };
    return handleAuthorize(req, res, {
      isValidRedirectUri,
      authCodes,
      clients
    });
  }
  // Fallback: redirect to /authorize (should not happen in normal flow)
  const params = new URLSearchParams({
    client_id,
    redirect_uri,
    state,
    consent: action === 'accept' ? 'given' : 'rejected',
    scope,
    response_type
  });
  res.redirect(`/authorize?${params.toString()}`);
});
app.post('/revoke', errorSimulationMiddleware('/revoke'), delayMiddleware, (req, res) => handleRevoke(req, res, {
  getClient: (id) => getClient(clients, id),
  tokens,
  refreshTokens
}));
app.use('/revoke', errorInjectionMiddleware);
app.post('/introspect', errorSimulationMiddleware('/introspect'), delayMiddleware, (req, res) => handleIntrospect(req, res, {
  getClient: (id) => getClient(clients, id),
  tokens,
  refreshTokens
}));
app.use('/introspect', errorInjectionMiddleware);

// OIDC Discovery Endpoint
app.get('/.well-known/openid-configuration', errorSimulationMiddleware('/.well-known/openid-configuration'), delayMiddleware, errorInjectionMiddleware, (req, res) => {
  // Determine protocol, hostname, and port
  const protocol = req.protocol;
  const host = req.get('host'); // includes hostname:port
  const fullHost = `${protocol}://${host}`;
  // Substitute {{host}} in all string values in discoveryDocument
  const substituteHost = (obj) => {
    if (typeof obj === 'string') {
      return obj.replace(/\{\{host\}\}/g, fullHost);
    } else if (Array.isArray(obj)) {
      return obj.map(substituteHost);
    } else if (obj && typeof obj === 'object') {
      const out = {};
      for (const k in obj) out[k] = substituteHost(obj[k]);
      return out;
    }
    return obj;
  };
  const doc = substituteHost(discoveryDocument);
  res.json(doc);
});

// Register /userinfo endpoint
app.get('/userinfo', userinfo);

app.get('/sim/config/userinfo', getUserinfoConfig);
app.post('/sim/config/userinfo', updateGlobalUserinfoConfig);
app.post('/sim/config/userinfo/clients/:clientId', updateClientUserinfoConfig);
app.post('/sim/config/userinfo/users/:userName', updateUserUserinfoConfig);

app.use((req, res) => {
  res.status(404).render('404');
});
app.use((err, req, res, next) => {
  if (err.status && err.errors) {
    res.status(err.status).json({
      message: err.message,
      errors: err.errors,
    });
  } else {
    next(err);
  }
});

// Register global test middlewares for all endpoints except /sim
const globalTestMiddlewares = [
  errorSimulationMiddleware(),
  delayMiddleware,
  errorInjectionMiddleware
];
app.use((req, res, next) => {
  if (req.path.startsWith('/sim')) return next();
  let idx = 0;
  function runNext(err) {
    if (err) return next(err);
    if (idx < globalTestMiddlewares.length) {
      globalTestMiddlewares[idx++](req, res, runNext);
    } else {
      next();
    }
  }
  runNext();
});

export function startServer({ port }) {
  return new Promise((resolve) => {
    const server = app.listen(port, () => resolve(server));
  });
}

export { app };
export default app;
