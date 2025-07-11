// Central in-memory store for OAuth Flow Simulator
export const clients = [
  {
    clientId: 'web-app',
    clientSecret: 'shhh',
    redirectUris: ['http://localhost:3000/callback'],
  },
];

export const users = [
  {
    username: 'alice',
    password: 'pw123',
    scopes: ['openid', 'profile'],
  },
];

export const authCodes = {};
export const tokens = {};
export const scopes = [
  { name: 'openid', description: 'OpenID Connect basic scope' },
  { name: 'profile', description: 'User profile information' },
];
export const refreshTokens = {};
// Optionally, add errorSimulations and delaySimulations here for /sim/errors and /sim/delays
export const errorSimulations = [];
export const delaySimulations = [];
