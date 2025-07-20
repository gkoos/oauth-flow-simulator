#!/usr/bin/env node
import program from '../cli/commands.js';
import chalk from 'chalk';
import { startServer, app } from '../lib/index.js';

const args = process.argv.slice(2);
const isApiCommand = args[0] === 'api';

if (isApiCommand) {
  // Only parse and run the API command, do not start the server
  program.parse(process.argv);
} else {
  // Only start the server for non-API commands
  program.action((opts) => {
    (async () => {
      const port = parseInt(opts.port, 10);
      if (isNaN(port) || port < 1 || port > 65535) {
        console.error(chalk.red('Invalid port number. Please provide a number between 1 and 65535.'));
        process.exit(1);
      }
      if (opts.secureCookies) process.env.HTTPS = 'true';
      const logFile = opts.logFile || process.env.LOG_FILE;
      if (opts.asymKeySigning) {
        // Set asymKeySigning in the store
        try {
          const store = await import('../lib/store.js');
          store.configSigning.asymKeySigning = true;
        } catch (e) {
          console.error(chalk.red('Failed to set asymKeySigning in store:'), e);
        }
      }
      if (opts.includeJwtKid === false) {
        // Set includeJwtKid in the store
        try {
          const store = await import('../lib/store.js');
          store.includeJwtKid = false;
        } catch (e) {
          console.error(chalk.red('Failed to set includeJwtKid in store:'), e);
        }
      }
      startServer({ port, logFile })
        .then(() => console.log(chalk.green(`OAuth Flow Simulator running on http://localhost:${port}`)))
        .catch((err) => {
          console.error(chalk.red('Failed to start server:'), err);
          process.exit(1);
        });
    })();
  });
  program.parse(process.argv);
}
export { app };
