// Central in-memory store for OAuth Flow Simulator
export const clients = [
  {
    clientId: 'web-app',
    clientSecret: 'shhh',
    redirectUris: ['http://localhost:3000/callback'],
    scopes: [
      { name: 'openid', description: 'OpenID Connect basic scope', consentNeeded: false },
      { name: 'profile', description: 'User profile information', consentNeeded: false },
      { name: 'offline_access', description: 'Offline access', consentNeeded: false }
    ],
    refreshTokenLifetime: 7 * 24 * 60 * 60 * 1000 // 7 days in ms
  }
];

export const users = [
  {
    username: 'alice',
    password: 'pw123'
  }
];

export const authCodes = {};
export const tokens = {};
export const refreshTokens = {};
export const errorSimulations = [];
export const delaySimulations = [];
