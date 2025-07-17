// Central in-memory store for OAuth Flow Simulator
export const clients = [
  {
    clientId: "web-app",
    clientSecret: "shhh",
    redirectUris: ["http://localhost:3000/callback"],
    scopes: [
      {
        name: "openid",
        description: "OpenID Connect basic scope",
        consentNeeded: false,
      },
      {
        name: "profile",
        description: "User profile information",
        consentNeeded: false,
      },
      {
        name: "offline_access",
        description: "Offline access",
        consentNeeded: false,
      },
    ],
    refreshTokenLifetime: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  },
];

export const users = [
  {
    username: "alice",
    password: "pw123",
  },
];

export const authCodes = {};
export const tokens = {};
export const refreshTokens = {};
export const errorSimulations = {};
export const delaySimulations = {};

export const jwtClaims = {
  globals: {
    iss: "{{host}}",
    sub: "{{username}}",
    aud: "{{aud}}",
    exp: "{{exp}}",
    iat: "{{now}}",
    scope: "{{scope}}",
    client_id: "{{client}}",
    username: "{{username}}",
    token_type: "access_token",
  },
  clients: {}, // claims per clientId
  users: {}, // claims per username
};

// Example OIDC Discovery Document (configurable)
export const discoveryDocument = {
  issuer: "{{host}}",
  authorization_endpoint: "{{host}}/authorize",
  token_endpoint: "{{host}}/token",
  userinfo_endpoint: "{{host}}/userinfo",
  jwks_uri: "{{host}}/jwks",
  response_types_supported: [
    "code",
    "id_token",
    "token",
    "code id_token",
    "code token",
  ],
  subject_types_supported: ["public"],
  id_token_signing_alg_values_supported: ["RS256"],
  scopes_supported: ["openid", "profile", "email", "offline_access"],
  grant_types_supported: [
    "authorization_code",
    "refresh_token",
    "client_credentials",
  ],
  claims_supported: [
    "sub",
    "name",
    "email",
    "preferred_username",
    "aud",
    "iss",
    "exp",
    "iat",
    "nonce",
  ],
  token_endpoint_auth_methods_supported: [
    "client_secret_basic",
    "client_secret_post",
  ],
  // Add more fields as needed for advanced scenarios
};

export const userinfoScopes = {
  globals: {
    openid: ["sub"],
    profile: ["name", "nickname", "preferred_username"],
    email: ["email", "email_verified"],
    offline_access: [], // usually for refresh tokens, not claims
    // Add more scopes/claims as needed
  },
  clients: {}, // Optional: per clientId overrides
  users: {}, // Optional: per username overrides
};

export const signingKeys = {
  activeKid: "abc123", // Active key ID for signing
  keys: [
    {
      kid: "abc123",
      kty: "RSA",
      alg: "RS256",
      use: "sig",
      n: "sXchQwK1...base64url-encoded-modulus...",
      e: "AQAB",
      d: "MIIEvgIBADAN...base64url-encoded-private-exponent...",
      p: "7v1...base64url...",
      q: "w9A...base64url...",
      dp: "Gk...base64url...",
      dq: "Jk...base64url...",
      qi: "Vg...base64url...",
      private:
        "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BA...full PEM...\n-----END PRIVATE KEY-----",
      public:
        "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BA...full PEM...\n-----END PUBLIC KEY-----",
    },
  ]
};
