import { program } from 'commander';

program
  .name('oauth-sim')
  .description('Effortless OAuth Flow Simulator CLI')
  .option('-p, --port <port>', 'Port to run the server on', '4000')
  .option('--secure-cookies', 'Enable secure cookie/session behavior (sets HTTPS=true)')
  .option('--log-file <path>', 'Write HTTP request logs to the specified file in addition to stdout');

export default program;
