# Phase 2: Dynamic Configuration & Runtime API

This phase transforms the OAuth Flow Simulator from a static, config-driven mock server into a fully dynamic, runtime-configurable simulator. The goal is to enable real-time management of users, clients, scopes, and tokens via a RESTful API, support advanced token flows, and provide robust error simulation for automated and manual testing.

## Overview of Phase 2 Goals
- Make all simulator state (users, clients, scopes, tokens) manageable at runtime via HTTP API
- Support refresh tokens, introspection, and revocation
- Enable error and delay injection for robust test scenarios
- Improve error handling and API feedback
- Enhance CLI and documentation for new features

---

## Step-by-Step Breakdown

### 1. Design and Implement REST API for Management
- **Define OpenAPI spec** for all management endpoints: `/sim/users`, `/sim/clients`, `/sim/scopes` (list, create, update, delete), `/sim/users/:username`, `/sim/clients/:clientId`, `/sim/scopes/:scope`.
- **Implement Express route handlers** for each endpoint, using the OpenAPI spec as the single source of truth.
- **Support CRUD operations**: create, read, update, delete for users, clients, and scopes.
- **Validate all requests/responses** against the OpenAPI schema for reliability (using middleware such as express-openapi-validator).
- **Document all endpoints** in Swagger UI for easy exploration and testing.

### 2. Implement Refresh Token Logic

- **Issue refresh tokens** alongside access tokens when the `offline_access` scope is requested by clients.
  - When a client requests the `offline_access` scope during the authorization code flow, the token endpoint should issue both an access token and a refresh token in the response.
  - The refresh token should be a securely generated random string, unique per session, and associated with the user, client, and scopes granted.
  - The access token response should include both `access_token` and `refresh_token` fields, following the OAuth2 spec.

- **Store refresh tokens** in the in-memory store, linked to user, client, and session identifiers.
  - Extend the in-memory store to maintain a mapping of refresh tokens to their metadata: user, client, scopes, creation time, and expiry (if applicable).
  - Example structure: `{ refreshToken: { username, clientId, scopes, issuedAt, expiresAt, sessionId } }`.
  - Ensure that refresh tokens are only valid for the user/client/session for which they were issued.

- **Support refresh token rotation**: when a refresh token is used, invalidate the old token and issue a new one.
  - When a client uses a refresh token at the token endpoint (`grant_type=refresh_token`), validate the token, then:
    - Remove (invalidate) the old refresh token from the store.
    - Issue a new refresh token and access token, and store the new refresh token with updated metadata.
    - Return the new tokens in the response, as per OAuth2 best practices (rotation).
  - If the refresh token is invalid, expired, or already used, return an appropriate error response (`invalid_grant`).

- **Implement revocation**: allow refresh tokens to be revoked via the `/revoke` endpoint or by user action (e.g., deleting a session).
  - Add a `/revoke` endpoint that accepts a token (access or refresh) and removes it from the store, making it unusable for future requests.
  - Support revocation by user action, such as deleting a session or user, which should also remove all associated refresh tokens.
  - Ensure the `/revoke` endpoint follows RFC 7009 for request/response format and security (e.g., require client authentication).

- **Update OpenAPI spec and handlers** to reflect new flows and error cases, including error responses for invalid or expired refresh tokens.
  - Update the OpenAPI spec to document the new refresh token flows, including:
    - The presence of `refresh_token` in token responses when `offline_access` is requested.
    - The `grant_type=refresh_token` flow, including request/response schemas and error cases.
    - The `/revoke` endpoint, including request/response and error scenarios.
  - Ensure all handlers return clear, spec-compliant error responses for invalid, expired, or revoked refresh tokens (e.g., `invalid_grant`, `invalid_request`).

### 3. Add Token Introspection and Revocation Endpoints
- **Implement `/introspect` endpoint**: allow clients to POST a token and receive its validity, type, and metadata (active, scope, client_id, username, exp, etc.).
- **Implement `/revoke` endpoint**: allow clients to POST a token to revoke (access or refresh token).
- **Ensure endpoints follow OAuth2 RFC 7662 (introspection) and RFC 7009 (revocation)** for request/response format and security.
- **Add tests** for all new endpoints and edge cases, including invalid, expired, and already-revoked tokens.

### 4. Add Delay and Error Injection Middleware/Hooks
- **Enable configurable delays** on any endpoint for simulating network latency (Express middleware, e.g., `?delay=500`).
  - **Usage:** Add `?delay=ms` (milliseconds) to any request to `/authorize`, `/token`, `/revoke`, or `/introspect` to simulate network latency. Example: `/token?delay=1000` will delay the response by 1 second.
  - Maximum allowed delay is 30 seconds.
  - Implemented as a reusable Express middleware.
- **Allow forced error responses** (e.g., `invalid_grant`, `server_error`) via API triggers, query params, or special test endpoints.
- **Document all error simulation options** in the API docs and OpenAPI spec.
- **Add hooks to management endpoints** for testing error scenarios, such as forced 500 errors or custom error payloads.

### 5. Add Programmable Triggers for Error States
- **Expose API endpoints to set error triggers** (e.g., `/sim/errors/force-login-fail`, `/sim/errors/force-token-expired`).
- **Allow toggling error states at runtime** for automated test scripts, with endpoints to enable/disable each error trigger.
- **Ensure all error triggers are documented** and provide a reset endpoint to clear all triggers (e.g., `/sim/errors/reset`).

### 6. Extend JWT Generator with Claim Customization
- **Allow runtime configuration of JWT claims** such as `aud` (audience), `iss` (issuer), `scope`, `exp` (expiry), and custom claims via API or config endpoints (e.g., `/sim/config/jwt`).
- **Support custom claims per client, user, or session if needed, with endpoints to set or override claims.**
- **Document claim customization options** in the API and usage docs, including example payloads.

### 7. Improve Error Pages and API Feedback
- **Enhance error pages** with detailed messages and troubleshooting tips for common OAuth errors (invalid_client, invalid_grant, etc.).
- **Return clear, spec-compliant error responses** from all endpoints, including error codes and descriptions.
- **Add logging for error scenarios** to aid debugging, with structured logs for API errors and failures.

### 8. Enhance CLI for Config Reload and State Control
- **Add CLI commands** to reload config, reset state, and control error triggers (e.g., `oauth-sim reload`, `oauth-sim reset`, `oauth-sim errors enable <type>`).
- **Document new CLI features** in the README and CLI help output, with usage examples.
- **Ensure CLI and API are consistent** in supported features and state management.

### 9. Update Documentation and Usage Examples
- **Update main documentation** to reflect new API endpoints and flows, including OpenAPI YAML and Swagger UI links.
- **Add usage examples** for new features (API, CLI, error simulation), with sample requests and responses.
- **Ensure OpenAPI/Swagger UI is up to date** and easy to access for all endpoints and error simulation features.

---

## Deliverables for Phase 2
- Fully dynamic REST API for managing simulator state (users, clients, scopes, tokens)
- Refresh token, introspection, and revocation support
- Delay and error injection for robust test automation
- Enhanced error handling and documentation
- Updated CLI and usage guides

---

## Next Steps
After Phase 2, the simulator will be ready for advanced OIDC features (Phase 3) and developer experience improvements (Phase 4).
