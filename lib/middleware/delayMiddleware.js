// delayMiddleware.js
// Express middleware to inject artificial delay via ?delay=ms query param

import { delaySimulations } from '../store.js';

const delayMiddleware = (req, res, next) => {
  // Query param delay
  let delay = parseInt(req.query.delay, 10);
  // API-configured delay (endpoint-specific or global)
  const endpoint = req.route?.path || req.path;
  const sim = delaySimulations[endpoint] || delaySimulations['all'];
  if (sim && typeof sim.delay === 'number' && sim.delay > 0 && sim.delay < 30000) {
    delay = Math.max(delay || 0, sim.delay); // Use the greater of query/API delay
  }
  if (!isNaN(delay) && delay > 0 && delay < 30000) {
    req._delayInjected = delay;
    setTimeout(next, delay);
  } else {
    next();
  }
};

export default delayMiddleware;
