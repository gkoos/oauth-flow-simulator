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
- Configurable delay injection for any endpoint (via query parameter or REST API; supports per-endpoint and global delays)
- Configurable error injection for any endpoint (via query parameter or REST API; supports per-endpoint and global errors)

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

## OpenID Connect Discovery Endpoint (`/.well-known/openid-configuration`)

The simulator implements the OIDC discovery endpoint at `/.well-known/openid-configuration`, returning a standards-compliant JSON document describing all OAuth2 and OIDC endpoints, supported features, and metadata. This document enables OIDC clients and libraries to auto-configure themselves for integration and testing.

**What it returns:**
- URLs for all major endpoints: `/authorize`, `/token`, `/userinfo`, `/jwks`, etc.
- Supported response types, grant types, scopes, and claims
- Server metadata: issuer, signing algorithms, subject types, etc.
- Public JWKS for verifying ID tokens

**Example usage:**
```sh
curl http://localhost:4000/.well-known/openid-configuration
```

**How it works:**
- The endpoint is always up-to-date with the server's runtime configuration
- All fields required by the OIDC spec are present
- Can be used by any OIDC-compliant client for automated discovery

---

## Userinfo Endpoint (`/userinfo`) and Dynamic Claims Configuration

The `/userinfo` endpoint returns user profile claims based on the scopes granted in the access token. It supports Bearer token authentication and is fully configurable at runtime.

**How `/userinfo` works:**
- Accepts a valid access token via `Authorization: Bearer <token>`
- Returns only the claims permitted by the scopes in the token (e.g., `openid`, `profile`, `email`)
- Claims are omitted if not present for the user
- Returns 401 for invalid/missing tokens, 403 for insufficient scopes
- Supports error and delay simulation for robust client testing

**Configuring claims via API:**
- Claim-to-scope mappings can be set globally, per client, or per user using the management API:
  - `POST /sim/config/userinfo` (global config)
  - `POST /sim/config/userinfo/clients/{clientId}` (per-client config)
  - `POST /sim/config/userinfo/users/{userName}` (per-user config)
- These endpoints accept a JSON object mapping scopes to claim lists
- Changes take effect immediately and override defaults as needed

**Example configuration:**
```sh
curl -X POST http://localhost:4000/sim/config/userinfo \
  -H "Content-Type: application/json" \
  -d '{"profile": ["name", "email", "preferred_username"]}'
```

**Example usage:**
```sh
curl -H "Authorization: Bearer <access_token>" http://localhost:4000/userinfo
```

See the OpenAPI spec for full details on request/response formats and error scenarios.

---

## Delay Simulation for Testing

Delay simulation lets you inject artificial latency into any major OAuth endpoint, making it easy to test client timeout handling, retry logic, and real-world network conditions. This is essential for validating how your application responds to slow or unreliable identity providers.

### Two Ways to Simulate Delays

There are two supported methods for delay simulation:

1. **Query Parameter Method**
   - Add a `delay` parameter (in milliseconds) directly to your request's query string.
   - Best for ad-hoc, manual, or one-off testing (e.g., using curl, Postman, or browser).
   - Does not persist—only affects the current request.

2. **REST API Method**
   - Use the `/sim/config/delays` REST API to configure delay simulation for specific endpoints or globally.
   - Best for automated tests, CI/CD, or simulating persistent network latency (e.g., simulating a slow identity provider).
   - Persists until cleared via the API.

#### When to Use Each Method
- **Query Parameter:** Quick, targeted delay simulation for a single request. Ideal for manual testing or debugging.
- **REST API:** Persistent delay simulation for one or more endpoints. Ideal for automated tests, integration testing, or simulating global latency (e.g., force all `/token` requests to respond slowly).

---

### Delay Simulation via REST API

The `/sim/config/delays` API lets you configure delay simulation at runtime:
- **Targeting:**
  - Set delays for a specific endpoint (e.g., `/token`, `/authorize`, `/login`, etc.)
  - Or set a global delay for all endpoints using the target `all`.
- **Precedence:**
  - If both a global (`all`) and a specific endpoint delay are set, the specific endpoint takes precedence.
- **Operations:**
  - `GET /sim/config/delays`: List current delay simulation settings.
  - `POST /sim/config/delays`: Add or update delay simulation for a target.
  - `DELETE /sim/config/delays?target={target}`: Remove delay simulation for a target. If no target is specified, all delays are cleared.

**Example: Simulate a 5s delay for all endpoints**
```sh
curl -X POST http://localhost:4000/sim/config/delays \
  -H "Content-Type: application/json" \
  -d '{ "target": "all", "delay": 5000 }'
```

**Example: Simulate a 7s delay only for /token**
```sh
curl -X POST http://localhost:4000/sim/config/delays \
  -H "Content-Type: application/json" \
  -d '{ "target": "/token", "delay": 7000 }'
```

**Example: Remove delay simulation for /token**
```sh
curl -X DELETE "http://localhost:4000/sim/config/delays?target=%2Ftoken"
```

**Example: Remove all delay simulations**
```sh
curl -X DELETE "http://localhost:4000/sim/config/delays"
```

---

### Delay Simulation via Query Parameter
- Add `?delay=ms` to any supported endpoint (in milliseconds, max 30,000).
- Example:
  ```sh
  curl -X POST "http://localhost:4000/token?delay=1000" -d ...
  ```
  This will delay the response by 1 second.

### Supported Endpoints
Delay simulation is supported for:
- `/authorize`
- `/token`
- `/revoke`
- `/introspect`
- `/login`

### Logging
All delay simulation events are highlighted in the server logs as:
```
DELAY SIMULATION - delay=...ms target=...
```

This makes it easy to spot delay-injected requests during development and testing.

## Error Injection for Testing

Error injection lets you simulate OAuth2 and OIDC error responses for any major endpoint, making it easy to test client error handling, edge cases, and custom flows. This is essential for validating how your application responds to failures, misconfigurations, and rate limits—without needing to manipulate your real identity provider or network.

### Two Ways to Inject Errors

There are two supported methods for error injection:

1. **Query Parameter Method**
   - Add error injection parameters directly to your request's query string.
   - Best for ad-hoc, manual, or one-off testing (e.g., using curl, Postman, or browser).
   - Does not persist—only affects the current request.

2. **REST API Method**
   - Use the `/sim/config/errors` REST API to configure error injection for specific endpoints or globally.
   - Best for automated tests, CI/CD, or simulating persistent error conditions (e.g., simulating a rate limiter by returning 429 for all requests).
   - Persists until cleared via the API.

#### When to Use Each Method
- **Query Parameter:** Quick, targeted error simulation for a single request. Ideal for manual testing or debugging.
- **REST API:** Persistent error simulation for one or more endpoints. Ideal for automated tests, integration testing, or simulating global failures (e.g., force all `/token` requests to fail with `invalid_client`).

---

### Error Injection via REST API

The `/sim/config/errors` API lets you configure error injection at runtime:
- **Targeting:**
  - Set errors for a specific endpoint (e.g., `/token`, `/authorize`, `/login`, etc.)
  - Or set a global error for all endpoints using the target `all`.
- **Precedence:**
  - If both a global (`all`) and a specific endpoint error are set, the specific endpoint takes precedence.
- **Operations:**
  - `GET /sim/config/errors`: List current error injection settings.
  - `POST /sim/config/errors`: Add or update error injection for a target.
  - `DELETE /sim/config/errors/{target}`: Remove error injection for a target.

**Example: Simulate a rate limiter (429) for all endpoints**
```sh
curl -X POST http://localhost:4000/sim/config/errors \
  -H "Content-Type: application/json" \
  -d '{ "target": "all", "error": "rate_limited", "status": 429, "error_description": "Too many requests" }'
```

**Example: Inject an error only for /token**
```sh
curl -X POST http://localhost:4000/sim/config/errors \
  -H "Content-Type: application/json" \
  -d '{ "target": "/token", "error": "invalid_client", "error_description": "Simulated client error" }'
```

**Example: Remove error injection for /token**
```sh
curl -X DELETE http://localhost:4000/sim/config/errors/token
```

---

### Error Injection via Query Parameters
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

## JWT Claim Customization

The simulator supports flexible JWT claim customization, allowing you to control the contents of issued access tokens at runtime. This feature is useful for testing, simulating real-world scenarios, and adapting token payloads for different clients and users.

### Levels of Customization
- **Global Claims:** Set default claims for all tokens via the `/sim/config/jwt` endpoint. These apply to every token unless overridden.
- **Per-Client Claims:** Override or add claims for a specific client using `/sim/config/jwt/clients/{clientId}`. These take precedence over global claims for that client.
- **Per-User Claims:** Override or add claims for a specific user using `/sim/config/jwt/users/{username}`. These take precedence over both global and client claims for that user.

Claims are merged in the following order (highest precedence last):
1. Global claims
2. Per-client claims
3. Per-user claims

If a claim is set to `null` at any level, it will be deleted from the final token payload.

### Dynamic Claims
You can use dynamic placeholders in claim values, which are resolved at token issuance. Supported placeholders include:
- `{{username}}`: The authenticated user's username
- `{{client_id}}`: The OAuth client ID
- `{{scope}}`: The granted scopes
- `{{aud}}`: The audience (usually the redirect URI)
- `{{iss}}`: The issuer (server URL)
- `{{exp}}`: Expiry timestamp
- `{{iat}}`: Issued-at timestamp
- `{{host}}`, `{{port}}`: Server host and port

Example claim configuration:
```json
{
  "iss": "{{host}}",
  "sub": "{{username}}",
  "aud": "{{aud}}",
  "exp": "{{exp}}",
  "scope": "{{scope}}",
  "foo": "bar"
}
```

### API Usage
- **Set global claims:**
  ```sh
  curl -X POST http://localhost:4000/sim/config/jwt \
    -H "Content-Type: application/json" \
    -d '{ "foo": "bar", "iss": "{{host}}" }'
  ```
- **Set per-client claims:**
  ```sh
  curl -X POST http://localhost:4000/sim/config/jwt/clients/web-app \
    -H "Content-Type: application/json" \
    -d '{ "client_claim": "value" }'
  ```
- **Set per-user claims:**
  ```sh
  curl -X POST http://localhost:4000/sim/config/jwt/users/alice \
    -H "Content-Type: application/json" \
    -d '{ "user_claim": "value" }'
  ```

### Use Cases
- **Simulate custom claims for different clients or users** (e.g., add roles, permissions, or custom attributes)
- **Test downstream services** that depend on specific JWT claim formats or values
- **Emulate real-world identity providers** by customizing claims for integration testing
- **Validate client and user-specific logic** in your application by issuing tokens with tailored payloads
- **Experiment with dynamic claim values** to ensure your app handles changing token contents correctly

See the API documentation and OpenAPI spec for full details on claim management endpoints and payload formats.

## CLI Wrappers

The OAuth Flow Simulator provides a powerful CLI for interacting with the mock server and its REST API endpoints. The CLI is designed for automation, scripting, and quick manual testing, and maps directly to the API endpoints for flexible usage.

### How to Use the CLI

- **Start the server:**
  ```sh
  npx oauth-sim start --port 4000
  ```
- **Call API endpoints:**
  ```sh
  npx oauth-sim api <verb> <path...> [--base-url <url>] [--body <json>]
  ```
  - `<verb>`: HTTP method (get, post, put, delete)
  - `<path...>`: Path segments for the endpoint (e.g., `sim users alice` for `/sim/users/alice`)
  - `--base-url`: Specify the server URL (default: `http://localhost:3000`)
  - `--body`: JSON string for POST/PUT requests

#### Examples
- **Get a user:**
  ```sh
  npx oauth-sim api get sim users alice --base-url http://localhost:4000
  ```
- **Add a user:**
  ```sh
  npx oauth-sim api post sim users --base-url http://localhost:4000 --body '{"username":"bob","password":"pw456"}'
  ```
- **Revoke a token:**
  ```sh
  npx oauth-sim api post revoke --base-url http://localhost:4000 --body '{"token":"ACCESS_TOKEN"}'
  ```
- **Introspect a token:**
  ```sh
  npx oauth-sim api post introspect --base-url http://localhost:4000 --body '{"token":"ACCESS_TOKEN"}'
  ```

### How CLI Maps to API Endpoints
- The CLI `api` command takes the HTTP verb and path segments and constructs the corresponding REST API call.
- For example, `npx oauth-sim api get sim users alice` maps to `GET /sim/users/alice`.
- For POST/PUT requests, use `--body` to provide the JSON payload.
- The CLI supports all major endpoints, including `/sim/users`, `/sim/clients`, `/sim/scopes`, `/token`, `/revoke`, `/introspect`, and error/delay simulation endpoints.

### When to Use the CLI
- **Automated testing:** Script API calls for integration and CI workflows.
- **Manual testing:** Quickly query or modify users, clients, tokens, or config from the command line.
- **Scripting:** Use in shell scripts or npm scripts for setup/teardown of test environments.
- **Config management:** Dynamically inject errors, delays, or JWT claims for specific endpoints during tests.

### Tips
- Use `--base-url` to target a running server on a custom port or host.
- Always provide valid JSON for `--body` (the CLI will validate and parse it).
- The CLI does not start the server for API commands; ensure the server is running before making API calls.
- For advanced usage, combine CLI calls with curl, Postman, or other tools for full coverage.

## License
MIT
