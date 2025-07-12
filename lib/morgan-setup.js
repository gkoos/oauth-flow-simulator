import morgan from 'morgan';
import chalk from 'chalk';

export function setupMorgan(app) {
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
  morgan.token('delay', (req) => {
    if (req._delayInjected) {
      return chalk.yellow(`request is delayed for ${req._delayInjected} ms`);
    }
    return '';
  });
  morgan.token('force_error', (req) => {
    // Check req.forceError first
    if (req.forceError) {
      const code = req.forceError.code || '';
      const desc = req.forceError.description || '';
      return chalk.red(`ERROR INJECTION - force_error=${code} error_description=${desc}`);
    }
    // Also check for error injection params in query
    const code = req.query && (req.query.force_error || req.query.authorize_force_error);
    const desc = req.query && (req.query.error_description || req.query.authorize_error_description);
    if (code || desc) {
      return chalk.red(`ERROR INJECTION - force_error=${code || ''} error_description=${desc || ''}`);
    }
    return '';
  });
  const morganFormat = ':colored-method :url :colored-status :res[content-length] - :response-time ms :login :delay :force_error';
  app.use(morgan(morganFormat, {
    skip: (req) => {
      const url = req.url || '';
      return url.startsWith('/public/') ||
        url.startsWith('/favicon.ico') ||
        url.match(/\.(css|js|svg|png|jpg|ico)$/i);
    },
  }));
}
