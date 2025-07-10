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

- OpenID Connect Discovery endpoint (`/.well-known/openid-configuration`)  
- ID token generation with OIDC standard claims (sub, name, email, nonce)  
- `/userinfo` endpoint implementation  
- Proof Key for Code Exchange (PKCE) support  
- Consent screen UI with approval/denial toggles  
- Discovery metadata UI (human-readable OIDC config page)  
- Validation against major OpenID clients (Auth0, AppAuth)  
- Support for multiple grant types (client credentials, implicit if desired)  

**Goals:** Achieve full compliance with OIDC specs. Support typical real-world OAuth/OIDC client scenarios.

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

## 🖥️ Frontend Views / HTML Pages

To enable developers and testers to interact with and inspect the mock OAuth server, the following HTML pages should be included:

1. **Login Page**  
   - User credential input (username/password)  
   - Error display for invalid login  
   - Simulates provider’s login screen  

2. **Consent Page**  
   - Displays requested scopes/permissions  
   - Approve or deny consent  
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
