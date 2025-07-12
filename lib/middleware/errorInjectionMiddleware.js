// errorInjectionMiddleware.js
// Middleware to inject OAuth2 errors for testing
// Supports ?force_error=ERROR_CODE&error_description=... (query or body)
// Only valid error codes per endpoint are allowed

const validErrors = {
  '/authorize': ['invalid_request', 'unauthorized_client', 'access_denied', 'unsupported_response_type', 'invalid_scope', 'server_error', 'temporarily_unavailable'],
  '/login': ['access_denied', 'server_error', 'temporarily_unavailable'],
  '/token': ['invalid_request', 'invalid_client', 'invalid_grant', 'unauthorized_client', 'unsupported_grant_type', 'invalid_scope', 'server_error', 'temporarily_unavailable'],
  '/revoke': ['unsupported_token_type', 'invalid_request', 'server_error', 'temporarily_unavailable'],
  '/introspect': ['invalid_request', 'invalid_client', 'server_error', 'temporarily_unavailable'],
};

export default function errorInjectionMiddleware(req, res, next) {
  const endpoint = req.route?.path || req.path;
  let error, errorDescription;
  if (endpoint === '/authorize') {
    error = req.query.authorize_force_error || req.body?.authorize_force_error;
    errorDescription = req.query.authorize_error_description || req.body?.authorize_error_description;
  } else {
    error = req.query.force_error || req.body?.force_error;
    errorDescription = req.query.error_description || req.body?.error_description;
  }
  const allowed = validErrors[endpoint] || [];
  if (error && allowed.includes(error)) {
    req.forceError = {
      code: error,
      description: errorDescription
    };
  }
  next();
}
