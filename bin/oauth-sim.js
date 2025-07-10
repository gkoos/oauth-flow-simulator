#!/usr/bin/env node
import { startServer } from '../lib/index.js';
import program from '../cli/commands.js';
import chalk from 'chalk';

program.action((opts) => {
  const port = parseInt(opts.port, 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    console.error(chalk.red('Invalid port number. Please provide a number between 1 and 65535.'));
    process.exit(1);
  }
  // Set HTTPS env var if --secure-cookies is passed
  if (opts.secureCookies) process.env.HTTPS = 'true';
  // Pass logFile option if provided
  const logFile = opts.logFile || process.env.LOG_FILE;
  startServer({ port, logFile })
    .then(() => console.log(chalk.green(`OAuth Flow Simulator running on http://localhost:${port}`)))
    .catch((err) => {
      console.error(chalk.red('Failed to start server:'), err);
      process.exit(1);
    });
});

program.parse(process.argv);
