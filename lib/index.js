import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import cookieSession from 'cookie-session';
import morgan from 'morgan';
import chalk from 'chalk';
import { getClient, isValidRedirectUri, getOriginalQuery } from './helpers.js';
import { handleAuthorize } from './flows/authorizationCode.js';
import { handleToken } from './flows/token.js';
import { handleLogin } from './flows/login.js';
import { handleLogout } from './flows/logout.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory stores
const clients = [
  {
    clientId: 'web-app',
    clientSecret: 'shhh',
    redirectUris: ['http://localhost:3000/callback'],
  },
];
const users = [
  {
    username: 'alice',
    password: 'pw123',
    scopes: ['openid', 'profile'],
  },
];
const authCodes = {};
const tokens = {};

// Login page (GET)
export async function startServer({ port = 4000, logFile } = {}) {
  const app = express();
  // Morgan logging setup
  morgan.token('login', (req) => {
    if (req.loginAttempt) {
      return chalk.yellow(`LOGIN username=${req.loginAttempt.username} password=${req.loginAttempt.password}`);
    }
    return '';
  });
  morgan.token('colored-method', (req) => {
    switch (req.method) {
      case 'GET': return chalk.blue(req.method);
      case 'POST': return chalk.magenta(req.method);
      case 'PUT':
      case 'PATCH': return chalk.yellow(req.method);
      case 'DELETE': return chalk.red(req.method);
      default: return chalk.gray(req.method);
    }
  });
  morgan.token('colored-status', (req, res) => {
    const status = res.statusCode;
    if (status >= 500) return chalk.red(status);
    if (status >= 400) return chalk.yellow(status);
    if (status >= 300) return chalk.cyan(status);
    if (status >= 200) return chalk.green(status);
    return chalk.gray(status);
  });
  const morganFormat = ':colored-method :url :colored-status :res[content-length] - :response-time ms :login';
  if (logFile || process.env.LOG_FILE) {
    const logPath = path.resolve(logFile || process.env.LOG_FILE);
    const logDir = path.dirname(logPath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const accessLogStream = fs.createWriteStream(logPath, { flags: 'a' });
    app.use(morgan(':method :url :status :res[content-length] - :response-time ms :login', {
      stream: accessLogStream,
      skip: (req) => req.url.startsWith('/public/')
    }));
  }
  app.use(morgan(morganFormat, {
    skip: (req) => req.url.startsWith('/public/')
  }));

  app.use(cors());
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json());
  app.use(cookieParser());
  app.use(express.static(path.join(__dirname, '../public')));

  // Determine if running with HTTPS (use HTTPS=true only)
  const isHttps = process.env.HTTPS === 'true';
  app.use(cookieSession({
    name: 'oauthsim.sid',
    keys: [process.env.SESSION_SECRET || 'dev_secret'],
    maxAge: 24 * 60 * 60 * 1000, // 1 day
    secure: isHttps, // Only send cookie over HTTPS if HTTPS=true
    sameSite: 'lax'
  }));

  // Login page (GET)
  app.get('/login', (req, res) => {
    // Only set error if present in query
    const error = req.query.error ? req.query.error : undefined;
    // Render login.html and inject error if present
    let html = fs.readFileSync(path.join(__dirname, '../templates/login.html'), 'utf8');
    if (error) {
      html = html.replace('{{#if error}}', '').replace('{{error}}', error).replace('{{/if}}', '');
    } else {
      // Remove the error block entirely if no error
      const errorBlockRegex = /{{#if error}}[\s\S]*?{{\/if}}/g;
      html = html.replace(errorBlockRegex, '');
    }
    res.send(html);
  });

  // Error page
  app.get('/error', (req, res) => {
    const errorMsg = req.query.error_description || req.query.error || '';
    res.send(
      fs.readFileSync(path.join(__dirname, '../templates/error.html'), 'utf8')
        .replace('{{error}}', errorMsg)
    );
  });

  // Welcome/info page
  app.get('/', (req, res) => {
    res.send(
      fs.readFileSync(path.join(__dirname, '../templates/welcome.html'), 'utf8')
    );
  });

  // Helper: consistent error redirect
  function oauthErrorRedirect(res, error, description, base = '/error') {
    const params = new URLSearchParams();
    params.set('error', error);
    if (description) params.set('error_description', description);
    res.redirect(`${base}?${params.toString()}`);
  }

  // Middleware: check login
  function requireLogin(req, res, next) {
    if (req.session && req.session.username) {
      req.user = { username: req.session.username, scopes: req.session.scopes };
      return next();
    }
    // Not logged in: redirect to login with original query if present
    const params = getOriginalQuery(req);
    if (params) {
      res.redirect(`/login?${params}`);
    } else {
      res.redirect('/login');
    }
  }

  // Login handler (POST)
  app.post('/login', (req, res) => handleLogin(req, res, { users }));
  // OAuth2 authorize endpoint
  app.get('/authorize', requireLogin, (req, res) => handleAuthorize(req, res, { getClient: (id) => getClient(clients, id), isValidRedirectUri, authCodes }));
  // OAuth2 token endpoint
  app.post('/token', (req, res) => handleToken(req, res, { getClient: (id) => getClient(clients, id), isValidRedirectUri, authCodes, users, tokens }));
  // Logout all endpoint
  app.get('/logout', (req, res) => handleLogout(req, res));

  // Catch-all 404 handler
  app.use((req, res) => {
    res.status(404).send(
      fs.readFileSync(path.join(__dirname, '../templates/404.html'), 'utf8')
    );
  });

  const server = app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`OAuth Flow Simulator listening on port ${port}`);
    const logPath = logFile || process.env.LOG_FILE;
    if (logPath) {
      // eslint-disable-next-line no-console
      console.log(`Logging requests to: ${logPath}`);
    }
  });
  return server;
}
