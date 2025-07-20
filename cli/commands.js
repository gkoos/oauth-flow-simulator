import { program } from 'commander';
import apiCommand from './apiCommand.js';

program
  .name('oauth-sim')
  .description('Effortless OAuth Flow Simulator CLI')
  .option('-p, --port <port>', 'Port to run the server on', '4000')
  .option('--base-url <url>', 'Base URL for API requests (e.g., http://localhost:4000)')
  .option('--secure-cookies', 'Enable secure cookie/session behavior (sets HTTPS=true)')
  .option('--log-file <path>', 'Write HTTP request logs to the specified file in addition to stdout')
  .option('--asym-key-signing', 'Enable asymmetric key signing')
  .option('--no-include-jwt-kid', 'Exclude kid from JWT header (default: include)');

function mergeGlobalOptions(options) {
  // Merge global options from program.opts() into command options
  const globalOpts = program.opts();
  return { ...globalOpts, ...options };
}

program
  .command('api <verb> [path...]')
  .description('Call simulator API endpoints (e.g., get sim users alice, post revoke token)')
  .option('--body <json>', 'Request body for POST/PUT')
  .action(function(verb, path, options, command) {
    if (options.body && typeof options.body === 'string') {
      try {
        options.body = JSON.parse(options.body);
      } catch (e) {
        console.error('Invalid JSON for --body:', options.body);
        process.exit(1);
      }
    }
    apiCommand(verb, path, mergeGlobalOptions(options), command);
  });

export default program;
