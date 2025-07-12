// login.js - /login endpoint handlers

// GET /login handler
export function getLogin(users) {
  return (req, res) => {
    const isOAuth = req.query.client_id && req.query.redirect_uri && req.query.response_type && req.query.scope;
    if (!isOAuth) {
      return res.render('login-oauth-only', {
        oauthMessage: 'This login page is only for OAuth flows. Please start from an OAuth client.'
      });
    }
    const error = req.query.error ? decodeURIComponent(req.query.error) : undefined;
    const loggedout = req.query.loggedout ? true : undefined;
    res.render('login', {
      error,
      loggedout,
      username: req.query.username || '',
      oauthParams: {
        client_id: req.query.client_id,
        redirect_uri: req.query.redirect_uri,
        response_type: req.query.response_type,
        scope: req.query.scope,
        state: req.query.state
      },
      force_error: req.query.force_error,
      error_description: req.query.error_description
    });
  };
}

// POST /login handler
export function postLogin(users) {
  return (req, res) => {
    // Read OAuth params from query string only
    const client_id = req.query.client_id;
    const redirect_uri = req.query.redirect_uri;
    const response_type = req.query.response_type;
    const scope = req.query.scope;
    const state = req.query.state;
    const username = req.body.username;
    const password = req.body.password;
    // Log login attempt for morgan
    req.loginAttempt = { username, password };
    // Validate user
    const user = users.find(u => u.username === username && u.password === password);
    if (!user) {
      // If OAuth params are present, preserve them in the redirect
      const params = [];
      if (client_id) params.push(`client_id=${encodeURIComponent(client_id)}`);
      if (redirect_uri) params.push(`redirect_uri=${encodeURIComponent(redirect_uri)}`);
      if (response_type) params.push(`response_type=${encodeURIComponent(response_type)}`);
      if (scope) params.push(`scope=${encodeURIComponent(scope)}`);
      if (state) params.push(`state=${encodeURIComponent(state)}`);
      if (username) params.push(`username=${encodeURIComponent(username)}`);
      params.push(`error=${encodeURIComponent('Invalid username or password')}`);
      const paramStr = params.length ? `?${params.join('&')}` : '';
      return res.redirect(`/login${paramStr}`);
    }
    // Set session
    req.session.username = user.username;
    req.session.scopes = user.scopes;
    // Error injection for /login
    const force_error = req.query.force_error;
    const error_description = req.query.error_description;
    if (force_error) {
      // If OAuth params are present, redirect to client with error
      if (client_id && redirect_uri) {
        let errorParams = `error=${encodeURIComponent(force_error)}`;
        if (error_description) errorParams += `&error_description=${encodeURIComponent(error_description)}`;
        if (state) errorParams += `&state=${encodeURIComponent(state)}`;
        return res.redirect(`${redirect_uri}?${errorParams}`);
      } else {
        // Otherwise, render error page
        return res.status(400).render('error', {
          error: force_error,
          error_description: error_description || 'Forced error for testing.'
        });
      }
    }
    // If OAuth params are present, resume OAuth flow
    if (client_id && redirect_uri && response_type && scope) {
      const params = new URLSearchParams({
        client_id,
        redirect_uri,
        response_type,
        scope,
      });
      if (state) params.set('state', state);
      return res.redirect(`/authorize?${params.toString()}`);
    }
    // Otherwise, redirect to a default welcome page
    res.redirect('/');
  };
}

// Error handling middleware
export function errorHandler(err, req, res, next) {
  if (req.forceError) {
    // Render error page or return JSON error
    const { code, description } = req.forceError;
    if (req.accepts('html')) {
      return res.status(400).render('error', {
        error: code,
        error_description: description || 'Forced error for testing.'
      });
    } else {
      return res.status(400).json({
        error: code,
        error_description: description || 'Forced error for testing.'
      });
    }
  }
  next(err);
}
