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
      }
    });
  };
}

// POST /login handler
export function postLogin(users) {
  return (req, res) => {
    const { client_id, redirect_uri, response_type, scope, state, username, password } = req.body;
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
