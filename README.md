# Effortless OAuth Flow Simulator

A lightweight, developer-friendly OAuth2 and OpenID Connect (OIDC) mock server for local development and automated testing.

> **Note**
> This project is intentionally API-only and does not include a dashboard or admin UI. All user, client, and scope management is done via the REST API. This keeps the simulator lightweight and focused as a dev tool for automated testing, scripting, and backend integration. For interactive management, use the API directly or with tools like Postman, curl, or Swagger UI.

## Quick Start

```bash
npm install
yarn install # or
npx oauth-sim start --port 4000
```

## Features
- OAuth2 Authorization Code flow (with realistic consent, per-client/user scope consent)
- JWT access token and refresh token support (rotation, expiry, per-client lifetime)
- RFC 7009-compliant token revocation endpoint (`/revoke`)
- RFC 7662-compliant token introspection endpoint (`/introspect`)
- Dynamic, in-memory store for clients, users, tokens, refresh tokens
- REST API for managing users, clients, scopes at runtime (`/sim/users`, `/sim/clients`, `/sim/scopes`)
- Authentication middleware for sensitive endpoints (supports HTTP Basic Auth and client_id/client_secret)
- Realistic login and consent pages (HTML)
- Error page for OAuth errors and failures
- CLI tooling to start server and set config
- OpenAPI spec and documentation
- Minimal setup, fast startup, CI/CD friendly
- Configurable delay injection for any endpoint (`/authorize`, `/token`, `/revoke`, `/introspect`) via `?delay=ms` query param for simulating network latency

## Directory Structure
```
oauth-flow-simulator/
├── bin/
│   └── oauth-sim.js        # CLI entry point
├── lib/
│   └── index.js            # Core logic for programmatic use
├── cli/
│   └── commands.js         # Handles CLI options
├── templates/
│   ├── login.html          # Login UI
│   └── error.html          # Error UI
├── examples/
│   └── usage.js            # Sample programmatic usage
├── package.json
└── README.md
```

## HTTPS and Cookie Security

By default, the simulator runs with HTTP-only cookies for local development. To simulate production-like secure cookies (e.g., for testing SameSite and secure cookie behavior), you can enable HTTPS mode in three ways:

- **Default:** Cookies are not marked as secure (work with HTTP).
- **.env file:** Set `HTTPS=true` in your `.env` file to enable secure cookies.
- **Command-line:** Use the `--secure-cookies` CLI option to enable secure cookies for a single run:
  ```bash
  npx oauth-sim --secure-cookies
  ```

When HTTPS mode is enabled, cookies are set with `secure: true` and `sameSite: 'lax'`.

## Configuration Precedence

Configuration options can be set in multiple ways, with the following precedence (highest to lowest):

1. **Command-line options** (e.g., `--port`, `--secure-cookies`)
2. **Environment variables** (e.g., `HTTPS=true`, `SESSION_SECRET`, `JWT_SECRET`)
3. **.env file** (loaded automatically if present)
4. **Defaults in code**

This allows flexible overrides for local development, CI, and automation.

## Supported Environment Variables

| Variable         | Description                                      | Default         |
|------------------|--------------------------------------------------|-----------------|
| `PORT`           | Port to run the server on                        | `4000`          |
| `HTTPS`          | Enable secure cookies (`true` or `false`)        | `false`         |
| `SESSION_SECRET` | Secret for signing session cookies               | `dev_secret`    |
| `JWT_SECRET`     | Secret for signing JWT access tokens             | `dev_secret`    |

You can set these in your `.env` file, as environment variables, or override some via CLI options (see above).

> **Warning**
> 
> This server is intended for development and testing purposes only. It is not hardened for production use and should not be used to handle real user data or as a public-facing OAuth/OIDC provider.

## Token Revocation and Introspection

### /revoke (RFC 7009)
Revokes an access token or refresh token. Requires client authentication (HTTP Basic Auth or client_id/client_secret in body).

**Example:**
```sh
curl -X POST http://localhost:4000/revoke \
  -u web-app:shhh \
  -d token=ACCESS_OR_REFRESH_TOKEN
```
- `token_type_hint` (optional): Specify `access_token` or `refresh_token` to optimize lookup.
- Always returns 200 OK, even if the token does not exist or is already revoked.

### /introspect (RFC 7662)
Returns metadata about an access or refresh token. Requires client authentication.

**Example (access token):**
```sh
curl -X POST http://localhost:4000/introspect \
  -u web-app:shhh \
  -d token=ACCESS_TOKEN
```
**Example (refresh token):**
```sh
curl -X POST http://localhost:4000/introspect \
  -u web-app:shhh \
  -d token=REFRESH_TOKEN
```
- Response includes `active`, `scope`, `client_id`, `username`, `exp`, `iat`, `sub`, `aud`, `iss`, `token_type`.
- Returns `{"active":false}` for invalid, expired, or revoked tokens.

## Delay Injection for Testing

You can simulate network latency on any major OAuth endpoint by adding a `delay` query parameter (in milliseconds):

**Example:**
```sh
curl -X POST "http://localhost:4000/token?delay=1000" -d ...
```
This will delay the response by 1 second. Maximum allowed delay is 30 seconds.

Supported endpoints: `/authorize`, `/token`, `/revoke`, `/introspect`

## Error Injection for Testing

Error injection lets you simulate OAuth2 and OIDC error responses for any major endpoint, making it easy to test client error handling, edge cases, and custom flows.

### How Error Injection Works
- Add error injection parameters to the query string of your request.
- The simulator will respond with the specified error code and description, following the OAuth2 spec for each endpoint.
- Error injection is supported for `/authorize`, `/login`, `/token`, `/revoke`, and `/introspect`.
- All error injection events are highlighted in the server logs (in red) for visibility.

### Error Injection Parameters
- For `/authorize`:
  - `authorize_force_error`: The OAuth2 error code to inject (e.g. `invalid_request`, `access_denied`, etc.)
  - `authorize_error_description`: Optional error description
- For other endpoints (including `/login`):
  - `force_error`: The OAuth2 error code to inject
  - `error_description`: Optional error description

#### Example: Injecting an error into /authorize
```
http://localhost:4000/authorize?response_type=code&client_id=web-app&redirect_uri=http://localhost:3000/callback&scope=openid%20profile&state=xyz&authorize_force_error=invalid_request&authorize_error_description=Simulated%20invalid%20request
```
This will immediately redirect to the client callback with the specified error and description.

#### Example: Injecting an error into /login via /authorize
```
http://localhost:4000/authorize?response_type=code&client_id=web-app&redirect_uri=http://localhost:3000/callback&scope=openid%20profile&state=xyz&force_error=access_denied&error_description=Simulated%20login%20error
```
This will forward the error injection parameters to `/login`. After submitting the login form, the error will be injected and you will be redirected to the client callback with the error.

### Supported Error Codes
Each endpoint only allows specific error codes, per the OAuth2 spec:
- `/authorize`: `invalid_request`, `unauthorized_client`, `access_denied`, `unsupported_response_type`, `invalid_scope`, `server_error`, `temporarily_unavailable`
- `/login`: `access_denied`, `server_error`, `temporarily_unavailable`
- `/token`: `invalid_request`, `invalid_client`, `invalid_grant`, `unauthorized_client`, `unsupported_grant_type`, `invalid_scope`, `server_error`, `temporarily_unavailable`
- `/revoke`: `unsupported_token_type`, `invalid_request`, `server_error`, `temporarily_unavailable`
- `/introspect`: `invalid_request`, `invalid_client`, `server_error`, `temporarily_unavailable`

### Logging
All error injection events are highlighted in the server logs as:
```
ERROR INJECTION - force_error=... error_description=...
```

This makes it easy to spot error-injected requests during development and testing.

## License
MIT
