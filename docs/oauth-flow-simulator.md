# Effortless OAuth Flow Simulator

A lightweight, developer-friendly OAuth2 and OpenID Connect (OIDC) mock server for local development and automated testing. Designed to simulate real-world auth providers with minimal setup, full protocol coverage, and flexible customization.

---

## 🚦 Project Status

- **Phase 1: MVP – Basic OAuth2 Server**: ✅ Complete (July 2025)
- **Phase 2: Dynamic Configuration & Runtime API**: ⏳ In Progress / Planned
- **Phase 3: Full OIDC Compliance**: ⏳ Planned
- **Phase 4: CI & Developer Experience Enhancements**: ⏳ Planned

---

## 🧹 Use Cases

- Testing frontend OAuth/OIDC integrations (SPA, mobile, SSR)  
- CI/CD automation for auth flows without live providers  
- Developing backend services using OAuth2 tokens  
- QA teams simulating edge cases (token expiry, error states)  
- Teaching and debugging OAuth/OIDC flows  

---

## ✨ Features Overview

| Feature                  | Description                                                  |
| ------------------------ | ------------------------------------------------------------ |
| OAuth2 & OIDC Support    | Auth code, PKCE, refresh, client credentials, OpenID Connect |
| Dynamic Configuration    | Add/edit users, clients, tokens at runtime                   |
| Token Management         | Generate, revoke, inspect JWT access and ID tokens           |
| Error Simulation         | Force token errors, denial, revocation, delays               |
| Admin HTTP API           | Manage simulator state programmatically                      |
| OpenID Connect Discovery | Fully spec-compliant discovery endpoints                     |
| JWT Customization        | Control claims, expiry, audience, and signing keys           |
| UI + CLI                 | Optional web UI + CLI tooling for easier use                 |
| CI/CD Friendly           | Stateless, fast startup, ephemeral or persistent modes       |

---

## 📜 Detailed Roadmap

### Phase 1: MVP – Basic OAuth2 Server ✅ Complete

- HTTP server with `/authorize` and `/token` endpoints  
- Authorization code flow (no PKCE yet)  
- Static, in-memory clients and users  
- JWT access tokens with basic claims (sub, aud, exp)  
- Basic login page (HTML form)  
- Basic error page for auth failures  
- CLI tooling to start server and set simple config  
- Minimal documentation and usage examples  

**Goals:** Provide minimal viable OAuth2 mock to test basic auth code flow and token exchange. Enable manual testing with login UI and error feedback.

---

### Phase 2: Dynamic Configuration & Runtime API

- RESTful API for managing users, clients, scopes dynamically (`/sim/users`, `/sim/clients`, `/sim/scopes`)  
- Refresh token support with rotation and revocation  
- Token introspection (`/introspect`) and revocation (`/revoke`) endpoints  
- Ability to inject delays and simulate errors (expired token, invalid grant)  
- Programmatic triggers for error scenarios (invalid client, bad credentials)  
- JWT claims customization (audience, issuer, scopes)  
- Improved error page with detailed messages  
- Enhanced CLI with config reload support  

**Goals:** Make simulator fully configurable at runtime for flexible automated tests. Improve error handling and testing edge cases.

---

### Phase 3: Full OIDC Compliance

This phase brings the simulator to full OpenID Connect (OIDC) compatibility, enabling robust testing and integration for any OIDC-compliant client or service. Key deliverables and features include:

- **OpenID Connect Discovery Endpoint (`/.well-known/openid-configuration`)**  
  - This endpoint provides a standardized JSON document (the OIDC discovery document) that describes all the OAuth2 and OIDC endpoints exposed by the simulator, such as `/authorize`, `/token`, `/userinfo`, `/jwks`, and more.
  - The document includes metadata about supported authentication flows, response types, grant types, scopes, and the server's public signing keys (JWKS).
  - OIDC clients and libraries use this endpoint to automatically configure themselves, discover available features, and obtain the necessary URLs and keys for secure communication.
  - The discovery document is required by the OIDC specification and is essential for interoperability with third-party clients, SDKs, and identity platforms.
  - Example fields in the document include: `issuer`, `authorization_endpoint`, `token_endpoint`, `userinfo_endpoint`, `jwks_uri`, `response_types_supported`, `subject_types_supported`, `id_token_signing_alg_values_supported`, and more.
  - By implementing this endpoint, the simulator can be used as a drop-in replacement for real OIDC providers in automated tests, development, and integration scenarios.

- **ID Token Generation with OIDC Standard Claims**  
  - Issues signed JWT ID tokens containing all required OIDC claims: `sub`, `name`, `email`, `nonce`, `aud`, `iss`, `exp`, `iat`, etc.
  - Supports custom and dynamic claims for advanced testing scenarios.

- **`/userinfo` Endpoint Implementation**  
  - Implements the OIDC `/userinfo` endpoint, returning user profile information in JSON format according to the OpenID Connect specification.
  - Supports both Bearer token authentication (via `Authorization: Bearer <access_token>` header) and POST authentication (access token in the request body).
  - Returns standard OIDC claims such as `sub` (subject identifier), `name`, `email`, `preferred_username`, `given_name`, `family_name`, and any additional claims configured in the simulator.
  - Claims are dynamically generated based on the authenticated user and can be customized at runtime via the simulator’s configuration API.
  - Validates the access token for authenticity, expiry, and required scopes (`openid` and optionally `profile`, `email`, etc.).
  - Returns HTTP 401 Unauthorized for missing, invalid, or expired tokens, and HTTP 403 Forbidden for insufficient scopes.
  - Supports error and delay injection for robust testing of client error handling and network latency scenarios.
  - Fully documented in the OpenAPI spec, including example requests and responses for both authentication methods.
  - Automated tests verify correct claim output, error handling, and runtime configurability.
  - Example usage:
    - `curl -H "Authorization: Bearer <access_token>" http://localhost:4000/userinfo`
    - `curl -X POST -d "access_token=<access_token>" http://localhost:4000/userinfo`
  - Enables advanced test scenarios, such as custom claims, simulated errors, and dynamic user profiles for OIDC client integration.

- **Proof Key for Code Exchange (PKCE) Support**  
  PKCE (Proof Key for Code Exchange) is a security extension to OAuth2 and OIDC that protects public clients (such as SPAs and mobile apps) from authorization code interception attacks. The simulator fully supports PKCE for realistic client testing and compliance.

  - **What is PKCE?**
    - PKCE requires clients to generate a random `code_verifier` and a derived `code_challenge` during the authorization request.
    - The `code_challenge` is sent with the initial `/authorize` request, and the `code_verifier` is sent during the `/token` exchange.
    - The server validates that the `code_verifier` matches the original `code_challenge` using the specified method (`S256` or `plain`).
    - This prevents malicious apps or attackers from exchanging stolen authorization codes for tokens.

  - **Simulator Implementation:**
    - Supports both `S256` (SHA-256 hash) and `plain` code challenge methods, as per the PKCE spec.
    - Validates the `code_verifier` during the `/token` exchange. If the verifier does not match, returns an OAuth2 error (`invalid_grant`).
    - Handles all PKCE parameters: `code_challenge`, `code_challenge_method`, and `code_verifier`.
    - Works with any OAuth2/OIDC client library that supports PKCE.
    - PKCE is optional for confidential clients, but required for public clients in most real-world scenarios.

  - **Example Usage:**
    1. **Start Authorization Request with PKCE:**
       ```sh
       # Generate code_verifier and code_challenge (S256)
       code_verifier="randomstring123"
       code_challenge=$(echo -n "$code_verifier" | openssl dgst -sha256 -binary | openssl base64 | tr -d '=\n' | tr '/+' '_-')
       curl "http://localhost:4000/authorize?response_type=code&client_id=web-app&redirect_uri=http://localhost:3000/callback&scope=openid%20profile&code_challenge=$code_challenge&code_challenge_method=S256"
       ```
    2. **Exchange Code for Token with Verifier:**
       ```sh
       curl -X POST http://localhost:4000/token \
         -d "grant_type=authorization_code" \
         -d "code=AUTH_CODE" \
         -d "redirect_uri=http://localhost:3000/callback" \
         -d "client_id=web-app" \
         -d "code_verifier=randomstring123"
       ```

  - **Testing and Error Simulation:**
    - You can simulate PKCE errors by providing an incorrect `code_verifier` during token exchange; the server will return an `invalid_grant` error.
    - Delay and error injection features work with PKCE flows for robust client testing.
    - Automated tests verify correct PKCE handling, error scenarios, and compliance.

  - **Reference:**
    - See the OpenAPI spec for full details on PKCE parameters and error responses.
    - The simulator is compatible with major OAuth2/OIDC client libraries supporting PKCE.

- **Consent Screen UI with Approval/Denial Toggles**  
  - Presents requested scopes and claims to the user for approval or denial.
  - Tracks consent per user, client, and scope, with realistic persistence and re-prompting behavior.
  - Allows users to deny consent, triggering appropriate OAuth/OIDC error responses.

- **Discovery Metadata UI (Human-Readable OIDC Config Page)**  
  - Provides a web page rendering the discovery document in a readable format for manual inspection and debugging.
  - Highlights supported endpoints, claims, and signing keys.

- **Validation Against Major OpenID Clients (Auth0, AppAuth, etc.)**  
  - Runs automated and manual tests against popular OIDC client libraries and platforms.
  - Ensures compatibility with real-world client implementations and edge cases.

- **Support for Multiple Grant Types**  
  - Adds support for additional OAuth2 grant types: `client_credentials`, `implicit` (if desired), and others as needed.
  - Enables broader testing scenarios, including machine-to-machine and legacy flows.

**Goals:**
- Achieve full compliance with OIDC specifications, including all required endpoints, claims, and flows.
- Enable seamless integration and testing with any OIDC client, library, or service.
- Provide realistic consent, error, and token handling for robust end-to-end scenarios.
- Ensure the simulator can be used for both manual and automated OIDC testing, including advanced features like PKCE and dynamic claims.

---

### Phase 4: CI & Developer Experience Enhancements

- Ephemeral mode (memory-only, fast reset) for CI/test runners  
- Reset API endpoint to clear simulator state during tests  
- Test helpers and utilities (e.g., Jest, Cypress integration snippets)  
- Predefined error scenarios configurable via API or CLI  
- Visual dashboard for inspecting active sessions, issued tokens, and server health  
- Welcome/info landing page with docs, endpoints overview  
- Hot-reloading of config files and runtime data  
- CLI improvements: auto-reload, live logs, better UX  

**Goals:** Make simulator easy to integrate into automated pipelines. Provide rich developer tooling for debugging and observability. Deliver a polished, user-friendly experience.

---

### Stretch Goals

- Persistent storage options (SQLite, JSON files, Redis) for durable state  
- Plugin architecture for custom auth flows, MFA simulation  
- Multi-tenant support with namespace separation  
- Remote control and inspection via WebSocket or GraphQL API  
- Integration with tunneling tools (ngrok) for real-device testing  
- Advanced UI for token management and client/user administration  

---

## 🚀 Implementation Milestones

### Phase 1 Milestones

- Setup basic HTTP server skeleton with Express/Fastify  
- Implement `/authorize` and `/token` endpoints supporting auth code flow  
- Create in-memory store for clients and users  
- Implement JWT access token generation with basic claims  
- Build minimal login page (HTML + basic form)  
- Create basic error page for auth failures  
- Build CLI commands to start server and load simple config  
- Write minimal documentation and usage examples  

### Phase 2 Milestones

- Design and implement REST API for managing clients, users, scopes at runtime  
- Implement refresh token logic: issue, rotate, revoke  
- Implement token introspection and revocation endpoints  
- Add delay and error injection middleware/hooks  
- Add programmable triggers for error states  
- Extend JWT generator with claim customization options  
- Improve error pages with detailed messages  
- Enhance CLI to reload config and control simulator state  

### Phase 3 Milestones

- Implement OIDC discovery endpoint with full spec response  
- Add ID token generation with OIDC claims  
- Implement `/userinfo` endpoint returning user info claims  
- Add PKCE support in auth code flow  
- Build consent screen UI with scope approval/denial toggles  
- Build discovery metadata UI page for human-friendly viewing  
- Run compliance tests against popular OIDC clients  
- Add support for additional grant types as needed  

### Phase 4 Milestones

- Implement ephemeral mode for stateless, fast reset runs  
- Create reset API to clear all server state programmatically  
- Develop test utilities/helpers for popular test frameworks  
- Add predefined error scenario configs accessible via API/CLI  
- Build visual dashboard UI for tokens, sessions, server health  
- Create welcome/info landing page with docs and endpoint links  
- Implement hot-reloading for config files and runtime data  
- Improve CLI UX with auto-reload, live logging, and usability enhancements  

---

## 📦 Packaging & Distribution as an NPM Module

This project is distributed as an npm package named `oauth-flow-simulator`, designed to work both as a CLI tool and as a programmatic library:

### Directory Structure

```
oauth-flow-simulator/
├── bin/
│   └── oauth-sim.js        # CLI entry point
├── lib/
│   └── index.js            # Core logic for programmatic use
├── cli/
│   └── commands.js         # Handles CLI options
├── templates/
│   └── login.html          # Login & consent UIs
├── examples/
│   └── usage.js            # Sample programmatic usage
├── package.json
└── README.md
```

### CLI Usage

Install globally or use via `npx`:

```bash
npx oauth-flow-simulator start --port 4000
```

### Programmatic Usage

Import and control the simulator directly in test suites:

```js
import { OAuthSimulator } from 'oauth-flow-simulator';

const sim = new OAuthSimulator();

sim.addClient({
  clientId: 'web-app',
  clientSecret: 'shhh',
  redirectUris: ['http://localhost:3000/callback'],
});

sim.addUser({
  username: 'alice',
  password: 'pw123',
  scopes: ['openid', 'profile'],
});

await sim.start();
```

---

### `package.json` Highlights

```json
{
  "name": "oauth-flow-simulator",
  "version": "0.1.0",
  "main": "./lib/index.js",
  "bin": {
    "oauth-sim": "./bin/oauth-sim.js"
  },
  "type": "module"
}
```

### Publish Process

```bash
npm publish --access public
```

---

## 🔧 Requirements

### Runtime

- Node.js >= 18 (for native fetch and async features)

### Dependencies

- `express` or `fastify` – handles routing and HTTP endpoints  
- `jsonwebtoken` or `jose` – generates and verifies signed JWT access and ID tokens  
- `commander` – powers the CLI interface for launching and configuring the simulator  
- `chalk`, `debug`, `cors`, `dotenv` – used for logging, developer experience, and environment variable management  
- `uuid` – for generating unique identifiers (e.g. auth codes, tokens)  
- `body-parser` – middleware to handle incoming request payloads  

### Optional/Future Dependencies

- `sqlite3`, `lowdb`, or `better-sqlite3` – persistent storage support (planned)  
- `socket.io` or `ws` – for live inspection and WebSocket control interface (stretch goal)  
- `ejs` or `handlebars` – for rendering optional login and consent UIs  
- `jest`, `supertest` – testing framework and HTTP request assertions  

---

## 📘 Example Usage

### CLI Quickstart

```bash
npx oauth-sim start --port 4000
```

### Programmatic Setup

```js
import { OAuthSimulator } from 'oauth-flow-simulator';

const sim = new OAuthSimulator();

sim.addClient({
  clientId: 'web-app',
  clientSecret: 'shhh',
  redirectUris: ['http://localhost:3000/callback'],
});

sim.addUser({
  username: 'alice',
  password: 'pw123',
  scopes: ['openid', 'profile'],
});

await sim.start();
```

---

## 🧪 Test Scenarios Supported

- ✔️ Successful login and token exchange  
- ❌ Invalid client ID/secret *(Planned: requires client validation logic in Phase 2)*  
- ❌ Incorrect redirect URI *(Planned: strict redirect URI enforcement in Phase 2)*  
- ❌ Token expiration *(Planned: token expiry simulation and clock manipulation in Phase 2 & 4)*  
- ❌ Simulated network latency or timeouts *(Planned: delay injection and error simulation in Phase 2)*  
- ✔️ Refresh token issuance and reuse  
- ✔️ Multiple concurrent clients/users  

---

## 🔑 Token Revocation and Introspection

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

---

## 🌐 OpenID Connect Discovery Endpoint (`/.well-known/openid-configuration`)

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

## 👤 Userinfo Endpoint (`/userinfo`) and Dynamic Claims Configuration

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

## 🖥️ Frontend Views / HTML Pages

To enable developers and testers to interact with and inspect the mock OAuth server, the following HTML pages should be included:

1. **Login Page**  
   - User credential input (username/password)  
   - Error display for invalid login  
   - Simulates provider’s login screen  

2. **Consent Page**  
   - Displays requested scopes/permissions  
   - Approve or deny consent (realistic consent flow: only accepted consents are stored, denial does not persist)  
   - If a user denies consent, they will be prompted again for the same scopes on future login attempts.  
   - Consent is tracked per user, per client, and per scope.  
   - If new scopes are requested, or a different client is used, the consent page will be shown again.  
   - Simulator matches real OAuth2 server behavior for consent persistence and denial.  
   - Optionally configurable for auto-approval  

3. **Error Page**  
   - Shows OAuth error codes and messages  
   - Used on auth failures and redirect errors  

4. **Token Inspection / Dashboard (Optional)**  
   - Lists active tokens and sessions  
   - Allows manual revocation or expiry  
   - Displays client and user details for debugging  

5. **Welcome / Info Page (Optional)**  
   - Landing page with links to docs and endpoints  
   - Provides server status and version info  

6. **Discovery Metadata UI (Optional)**  
   - Human-readable view of OIDC discovery document  
   - Helps verify discovery endpoint correctness  

---

## 📍 Maintainers

- Initial Author: Gabor Koos  
- GitHub: [gkoos/oauth-flow-simulator]  
- Contact: [your email or Discord]


1. Configure server to use public key signing or not:
Yes, a config option (env var or config file) to toggle between symmetric (HS256) and asymmetric (RS256/ES256) signing.

2. If not using public key, use JWT_SECRET as now:
Correct, keep current logic for HS256.

3. /sim/config/keys endpoint for key management:

Typical fields: { kid, private, public, alg } (alg = algorithm, e.g., RS256).
You may want CRUD endpoints:
GET /sim/keys (list all keys)
POST /sim/keys (create new key)
GET /sim/keys/{kid} (fetch key by kid)
DELETE /sim/keys/{kid} (delete key)
POST /sim/keys/active/{kid} (set active key for signing)
4. Config option to include/exclude kid in JWT header:
Yes, this is useful for testing client behavior.

5. JWT signing logic:

If symmetric: use secret.
If asymmetric: use active key, set kid in header if configured.
6. JWT verification logic:

In your flow, verification happens in token.js (for introspection, expiry checks, etc.).
Use secret for HS256, public key for RS256/ES256, select by kid if present.
7. /jwks endpoint:

Standard format: JSON object with a keys array, each key is a JWK (JSON Web Key).
Example:
{
  "keys": [
    {
      "kty": "RSA",      // Key Type: "RSA" for RSA keys. Value comes from the key algorithm.
      "kid": "abc123",   // Key ID: Unique identifier for the key. Value is generated when the key is created.
      "alg": "RS256",    // Algorithm: Intended signing algorithm, e.g., "RS256". Value is set by server config or key generation.
      "use": "sig",      // Usage: "sig" means the key is for signing JWTs. Value is set by server config.
      "n": "...",        // Modulus: Base64url-encoded modulus of the RSA public key. Value comes from the generated RSA key.
      "e": "AQAB"        // Exponent: Base64url-encoded public exponent (usually "AQAB" for 65537). Value comes from the generated RSA key.
    }
  ]
}

Field Explanations:

kty (Key Type): Specifies the cryptographic algorithm family. For RSA keys, this is "RSA".
Value source: Key generation algorithm.
kid (Key ID): Unique identifier for the key, used in JWT headers to select the correct key for verification.
Value source: Generated when the key is created (random or hash of key).
alg (Algorithm): Intended algorithm for the key, e.g., "RS256" for RSA with SHA-256.
Value source: Server config or key generation.
use (Usage): Indicates the intended use of the key, "sig" for signature.
Value source: Server config.
n (Modulus): The base64url-encoded modulus of the RSA public key.
Value source: Generated RSA key.
e (Exponent): The base64url-encoded public exponent. "AQAB" is common for 65537.
Value source: Generated RSA key.
Where do these values come from?

All values except kid are derived from the cryptographic key itself (when generated).
kid is assigned by the server when the key is created, and should be unique.
Behavior when asymmetric JWT signing is not used:

If the server is configured to use symmetric signing (HS256, with a shared secret), the /jwks endpoint should return a 404 Not Found response, indicating that no public keys are available for verification.

Example key:
{
  "kid": "abc123",
  "kty": "RSA",
  "alg": "RS256",
  "use": "sig",
  "n": "sXchQwK1...base64url-encoded-modulus...",
  "e": "AQAB",
  "d": "MIIEvgIBADAN...base64url-encoded-private-exponent...",
  "p": "7v1...base64url...",
  "q": "w9A...base64url...",
  "dp": "Gk...base64url...",
  "dq": "Jk...base64url...",
  "qi": "Vg...base64url...",
  "private": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BA...full PEM...\n-----END PRIVATE KEY-----",
  "public": "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BA...full PEM...\n-----END PUBLIC KEY-----"
}

in /jwks
for each key, you return:
kid
kty
alg
use
n
e
You do not return:
d, p, q, dp, dq, qi, private, or public (PEM)
See RFC 7517 for details.
Other considerations:

Key rotation: support multiple keys, mark one as active.
When rotating, keep old keys in JWKS for token verification until all old tokens expire.
For testing, allow manual key creation/import (for deterministic results).
Summary:
Your list is complete for a simulator. The only addition is supporting key rotation and keeping old keys in JWKS for backward compatibility. Otherwise, your endpoints and logic cover all standard OIDC/JWT key management and signing needs.


key generation endpoint:
- `POST /sim/keys/generate`
alg: Algorithm (e.g., "RS256", "ES256"). Determines key type and size.
kty: Key type ("RSA", "EC"). Usually inferred from alg, but can be explicit.
kid: Optional key ID. If omitted, server generates one.
keySize: For RSA, key size in bits (e.g., 2048, 4096). Optional, defaults to 2048.
curve: For EC keys, curve name (e.g., "P-256", "P-384"). Optional, defaults to "P-256".
