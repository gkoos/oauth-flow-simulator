// errorSimulationMiddleware.js
// Middleware to inject simulated OAuth2 errors based on runtime configuration
// Checks errorSimulations[target] first, then errorSimulations['all']
// For /authorize, redirects to redirect_uri with error params
// For other endpoints, sends JSON error response with configured status, error, and error_description

import { errorSimulations } from '../store.js';

function errorSimulationMiddleware(target) {
  return function (req, res, next) {
    const sim = errorSimulations[target] || errorSimulations['all'];
    if (!sim) return next();
    if (target === '/authorize') {
      // Get redirect_uri from query or body
      const redirectUri = req.query.redirect_uri || req.body?.redirect_uri;
      if (!redirectUri) {
        return res.status(sim.status || 400).json({
          error: sim.error,
          error_description: sim.error_description || 'Missing redirect_uri'
        });
      }
      // Build error params
      const params = new URLSearchParams({
        error: sim.error,
        error_description: sim.error_description || ''
      });
      // Optionally add state
      if (req.query.state || req.body?.state) {
        params.append('state', req.query.state || req.body.state);
      }
      // Replace + with %20 for spaces in query string
      const paramStr = params.toString().replace(/\+/g, '%20');
      return res.redirect(`${redirectUri}?${paramStr}`);
    } else {
      return res.status(sim.status || 400).json({
        error: sim.error,
        error_description: sim.error_description || ''
      });
    }
  };
}

export default errorSimulationMiddleware;
