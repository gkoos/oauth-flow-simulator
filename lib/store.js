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

export const configSigning = {
asymKeySigning: false, // Whether to use asymmetric key signing
includeJwtKid: true // Whether to include kid in JWT header when asymmetric key signing is enabled
}

export const signingKeys = {
  activeKid: "abc123",
  keys: [
    {
      kid: "abc123", // Use a short unique string, not the PEM
      kty: "RSA",
      alg: "RS256",
      use: "sig",
      n: "1T2V5ICkYgtg1XLomj7czZIch-9jigqQrZ50QcIFxVdbZsscLdfOMrJqAnwc_1JoyhywuAZiIWb-dPk6uLU7QsC4GBJyil2pnJw0QhbeO4XHM0Zq6ux0ff4JYgleqHtLIYtD3Vh7ezunUklTYAT1ajWwQjzWVG-jr4fV792CuqXn3st71iFH4iG3hVAxQ0_QdvI8449jkl_9XICPvds-Os1U35myVtwDiVg_nELp0XMHRzncZHu5OAEWwEWNW5IHZROv3pgqhzQHu-gjML44_kFtafXzGjmNWlyn_fGxW1vgOa41cnB2AGT9TXqeAghZTz3OccLYVmo73eu2bB0-Hw",
      e: "AQAB",
      d: "CuWTxFKCk_QK5b1yf3dY5zRhOt0T1BkIHacsP7P_gX8eT5lvfjQ5-EM_wZLAFJgMfM-MhErnNtfBhw65Xnj8Z0Pb5HcE3Wc95J_i18G9Z4NFk6w0iH6-0TVrG1RpPujWBQfN1wDPhpOc0Eqo9Q4r0FqgADKFrVjrH2wslY5XQNxjo-SSHrhJA-I4GiAPKqpuPYwpAr6tobJOctqfDVZee4PJ5j5sBdDuvSQIA6uZbopoGReyXhNVpRVm0gz7n7_SpeJEL3l1qMiMZNRLqZ685b-EVavNd5D0-1wg_4F7NUrris78mB6ovkxBURxIPbea5K9kesZeL4RIGU2PNboKUQ",
      p: "7dlLC60i5DXqbPVsb7lGSKxPti_dcK6ijHRYklDUQMGxcjXRFdz7Oap9Z249Q9_N8uLeV8mKLDtIb_ISodzx44JguBPb-YIxAKraOXfgrZRhQ-Xg3tATXcO_UwKnW63I4XeTw81HCLRZ3SGB4xpE4HplHynVPAByni7iKA-aERk",
      q: "5YOJTeR4yoyNNjPXu4V7SAqpXPj5ZGAdIjyxvkn8Ocsvf78WBnsuVV6HSGrl_nObPxWQEvSOC9jKZKZP1uBIWxkhphi7VyUZ3q1SrAp5NvxhflnM1QuDBPyT-pSEc5VovG2sG_JsjWfKo58yzFV3v78J-fNleQdtSaF0_hiJl_c",
      dp: "Ph4t91K0dh2Op_5A37znmjtGZjKCBtfVJBGOwEfT50Wu7kEX5jnccucP8V9dKMjepLyTjSHZsEubU4FJVHS7x8tZLzogjT1vRtlYPQIN78d8z5rN6-Mz650f7rIWu17bw-bS9KQ8FQ3lGleR8Jn_uxC8MDNguVb0mFNuRUAt4KE",
      dq: "gp6TnAL1Q8Et9LUYiB51hRCcRs9jj96rdfq45aVRqMqcY8WqkVG1ktxTfcFo16GPrx1ke4U2-kMNHK8SLSZDx6TL462boQL6cCKQNF1ZkxOboL8WtgDxNftRdIDlyKo1i1eXZehYIzn4t5o43NWfaz8cPGZrT7AMYKVE4f-w_w0",
      qi: "dougXwosXylfX0GVYSgKJIK2NeQI-v-wTmivM0qB2p-Wggt1amPbs-c6GQAZ3uFu3sIQG5BbK7Ht2fOV2ql49nohikJTC6-fftoEFEe7Lyw8RBHadlfutrQ9hc6QBUSwzd7pAvhQ2M7Z2jAoAJiB_SUW5QCXf25zAC_G1VF39VQ",
      private: `-----BEGIN PRIVATE KEY-----
MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQC1d6algaRa3upL
8CoE7MlpY6/+8sz+CzX6fNd66MBe67XTWhajyPsD0y6mKIlIAGyo7TAzFJLOyjpp
KNGjJKKhhGbo7aSYHrwAiV5212PIgVGOYRgg/K4YBx0hJTz+Zgt/+lWTOUBZh5fa
eYLe4dir8St+tfvNMXUgjmvi0U443eoZsu5qREZ2H8ryR9kFWKFeoa68v5mnsx19
4Atbt+VgRQW9kzg3qPmUrP8mIPz2nxbaz2xC5zxTnGKVXh+vIsk7TYYnY1z39CuZ
NXFM0rpUDUfn81dqvahOTwMJ0kWFVIzwKJj1pSSJ+F3H/VToD7pmcRPrrlkZHuaT
Uah60mobAgMBAAECggEAR/JN5H2va4XI792i0zwMKNgovZSHOMu6FXtstWLVbmzW
tJqZsksrVltiuecFcsIUUq9jdkUYZZthKDNSVnPedNo5MO2TXeqFkFLmXIjOG39G
FgSh2+ZCoe0kG/GXKqfLtGxMhGfk/voW9zxI6lQxow4luAGv+S08KnG9DXr9n+aT
a2lvMYI6boz1OvmOB3L7L9xqVxfYJ1AppFA1WvOpcgLczbEBKfR1x+As/iyRLbi+
Dwijd4+PqfF3kgxYlrB0zqgM4uETgeJ7mQ125llD4ztTWU5R5lK7JCb7jy8DHgFj
7v1Q/ywQEzktC2oTb/DlCAknR0fawNGFrJt2YB80QQKBgQD3rSaPMOu/LJPjhsZD
zBZiYKoMbJz0ZJ7TBFqYaP2BHSE9uUnecoPcSnbDVW1M4tfh+6AmWJU3IwBbTD58
6AwEUUTYYhwZPyyivsenlzihV3mXOVwllcYVqGY6L7QH3eE8gpDl2DeyZMZA3zYU
L3E4UYifvWNFy/44VJTCT5AP2wKBgQC7kOFpd1U/ihDp432r5N4twwJvaliJKVJr
rrYChpP7qZjKUllaNr82rR2b3iolDVIX2AorP3CiaNxKZ65/03BA8zAtOhqJJaxa
GmyvV1yvawo9CwJqlxe5/WmIoyfg4jhQSpWivstpKDaJ+DiFwHupEsDiKzfPBbwC
QpvJC2BCwQKBgQC55ea5NzjbJvRhpHkPzhFHCdLYvHUaIqPrMqtlFfigfmLC114Q
btd18xYtCuOc/+6Vma3c2kQ1PDo6TIHicrECVJVd7FW2xWoVRSjKK4C/6M5EqTL2
qvIgs2L3bXKtLOav6jgjrCQx6926N0952xoZ8WigrR/j9Xb8hM+bAOjaXQKBgQCs
+zP4CVc0j0eD/QsUsbF6MMQZLtHSRaq+ptUzRRxLV6ESzpmbSqxUZ5nL+zuRClTw
qozOT+a30c+AS1iyiLSZIe8HdvOsEnN+capUl1Rib2x02adz2D7Ih/6BRj9r9hYL
bo3MFvwP0kdiPOsb52XkiugabdM9eUNoLjfwVS6EwQKBgQC4zTtFmrY8v17z00lG
WpP/zA61kx0TEescuuu9Dd/xmFRSpkQuscZPYRLLGv0r1PWmL7pqbchy1oCA0tmE
2azk2eNmG88Pu46hSzAhqRTuD/2aAvhBdWb/2KVuOnpIX7HXbvnh4IFcTpUtxGxH
VsYo89LFjNrVWIKMh9XyWSaEFg==
-----END PRIVATE KEY-----
`,
      public: `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtXempYGkWt7qS/AqBOzJ
aWOv/vLM/gs1+nzXeujAXuu101oWo8j7A9MupiiJSABsqO0wMxSSzso6aSjRoySi
oYRm6O2kmB68AIledtdjyIFRjmEYIPyuGAcdISU8/mYLf/pVkzlAWYeX2nmC3uHY
q/ErfrX7zTF1II5r4tFOON3qGbLuakRGdh/K8kfZBVihXqGuvL+Zp7MdfeALW7fl
YEUFvZM4N6j5lKz/JiD89p8W2s9sQuc8U5xilV4fryLJO02GJ2Nc9/QrmTVxTNK6
VA1H5/NXar2oTk8DCdJFhVSM8CiY9aUkifhdx/1U6A+6ZnET665ZGR7mk1GoetJq
GwIDAQAB
-----END PUBLIC KEY-----
`,
    },
  ],
};
