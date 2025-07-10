# Effortless OAuth Flow Simulator

A lightweight, developer-friendly OAuth2 and OpenID Connect (OIDC) mock server for local development and automated testing.

## Quick Start

```bash
npm install
yarn install # or
npx oauth-sim start --port 4000
```

## Features (Phase 1)
- HTTP server with `/authorize` and `/token` endpoints
- Authorization code flow (no PKCE yet)
- Static, in-memory clients and users
- JWT access tokens with basic claims (sub, aud, exp)
- Basic login page (HTML form)
- Basic error page for auth failures
- CLI tooling to start server and set simple config
- Minimal documentation and usage examples

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

## License
MIT
