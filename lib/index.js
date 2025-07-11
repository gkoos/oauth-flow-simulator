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
import { handleToken } from './flows/token.js';
import { handleLogout } from './flows/logout.js';
import { registerSimApi } from './sim-api.js';
import expressOpenApiValidator from 'express-openapi-validator';
import { setupMorgan } from './morgan-setup.js';
import { getLogin, postLogin } from './flows/login.js';
import { clients, users, authCodes, tokens, scopes } from './store.js';

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
app.use('/sim', expressOpenApiValidator.middleware({
  apiSpec: openApiSpecPath,
  validateRequests: true,
  validateResponses: true,
}));

// Register /sim endpoints directly on the app
registerSimApi(app, { users, clients, authCodes, tokens });

const isHttps = process.env.HTTPS === 'true';
app.use(cookieSession({
  name: 'oauthsim.sid',
  keys: [process.env.SESSION_SECRET || 'dev_secret'],
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
function requireLogin(req, res, next) {
  if (req.session && req.session.username) {
    req.user = { username: req.session.username, scopes: req.session.scopes };
    return next();
  }
  const params = new URLSearchParams(req.query).toString();
  if (params) {
    res.redirect(`/login?${params}`);
  } else {
    res.redirect('/login');
  }
}
function validateAuthorizeRequest(req, res, next) {
  const { client_id, redirect_uri, scope } = req.query;
  // Validate client_id
  const client = clients.find(c => c.clientId === client_id);
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
  // Validate scopes
  const requestedScopes = (scope || '').split(' ').filter(Boolean);
  const validScopes = scopes.map(s => s.name);
  if (requestedScopes.some(s => !validScopes.includes(s))) {
    const params = new URLSearchParams();
    params.set('error', 'invalid_scope');
    params.set('error_description', 'One or more requested scopes are invalid or unknown.');
    return res.redirect(`/error?${params.toString()}`);
  }
  next();
}
app.post('/login', postLogin(users));
app.get('/authorize', validateAuthorizeRequest, requireLogin, (req, res) => handleAuthorize(req, res, { getClient: (id) => getClient(clients, id), isValidRedirectUri, authCodes }));
app.post('/token', (req, res) => handleToken(req, res, { getClient: (id) => getClient(clients, id), isValidRedirectUri, authCodes, users, tokens }));
app.get('/logout', (req, res) => handleLogout(req, res));
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

export function startServer({ port }) {
  return new Promise((resolve) => {
    const server = app.listen(port, () => resolve(server));
  });
}

export { app };
