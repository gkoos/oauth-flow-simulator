import request from "supertest";
import { app } from "../../lib/index.js";

import { validatePkce } from '../../lib/helpers.js';

describe('PKCE /token endpoint validation', () => {
  let agent;
  let server;
  beforeEach(async () => {
    server = await app.listen(0);
    agent = request.agent(server);
  });
  afterEach(async () => {
    if (server && server.close) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  async function getAuthCode({ code_challenge, code_challenge_method = undefined }) {
    let res = await agent.get('/authorize').query({
      response_type: 'code',
      client_id: 'web-app',
      redirect_uri: 'http://localhost:3000/callback',
      scope: 'openid profile',
      state: 'xyz',
      code_challenge,
      ...(code_challenge_method ? { code_challenge_method } : {})
    });
    let step = 0;
    const maxSteps = 20;
    let issuedCode = null;
    while (res.status === 302) {
      const location = res.headers.location;
      step++;
      if (step > maxSteps) throw new Error('Too many redirects');
      if (location.startsWith('/login')) {
        res = await agent.get(location);
        res = await agent.post(location).send({ username: 'alice', password: 'pw123' });
      } else if (location.startsWith('/consent')) {
        res = await agent.post('/consent').send({
          client_id: 'web-app',
          redirect_uri: 'http://localhost:3000/callback',
          state: 'xyz',
          action: 'accept',
          scope: 'openid profile',
          response_type: 'code',
        });
      } else if (location.startsWith('http://localhost:3000/callback')) {
        const urlObj = new URL(location);
        issuedCode = urlObj.searchParams.get('code');
        break;
      } else if (location.startsWith('/authorize')) {
        res = await agent.get(location);
      } else if (location.startsWith('/error')) {
        throw new Error('Unexpected error redirect: ' + location);
      } else {
        break;
      }
    }
    return issuedCode;
  }

  it('returns invalid_grant if code_verifier is missing', async () => {
    const code = await getAuthCode({ code_challenge: 'aaaa' });
    const tokenRes = await agent.post('/token').send({
      grant_type: 'authorization_code',
      code,
      redirect_uri: 'http://localhost:3000/callback',
      client_id: 'web-app',
      client_secret: 'shhh'
    });
    expect(tokenRes.status).toBe(400);
    expect(tokenRes.body.error).toBe('invalid_grant');
  });

  it('returns invalid_grant if code_verifier is wrong', async () => {
    const code = await getAuthCode({ code_challenge: 'aaaa' });
    const tokenRes = await agent.post('/token').send({
      grant_type: 'authorization_code',
      code,
      redirect_uri: 'http://localhost:3000/callback',
      client_id: 'web-app',
      client_secret: 'shhh',
      code_verifier: 'wrong'
    });
    expect(tokenRes.status).toBe(400);
    expect(tokenRes.body.error).toBe('invalid_grant');
  });

  it('issues token if code_verifier is correct', async () => {
    const code = await getAuthCode({ code_challenge: 'aaaa' });
    const tokenRes = await agent.post('/token').send({
      grant_type: 'authorization_code',
      code,
      redirect_uri: 'http://localhost:3000/callback',
      client_id: 'web-app',
      client_secret: 'shhh',
      code_verifier: 'aaaa'
    });
    expect(tokenRes.status).toBe(200);
    expect(tokenRes.body.access_token).toBeDefined();
  });

  it('issues token with code_challenge_method=plain', async () => {
    const code = await getAuthCode({ code_challenge: 'aaaa', code_challenge_method: 'plain' });
    const tokenRes = await agent.post('/token').send({
      grant_type: 'authorization_code',
      code,
      redirect_uri: 'http://localhost:3000/callback',
      client_id: 'web-app',
      client_secret: 'shhh',
      code_verifier: 'aaaa'
    });
    expect(tokenRes.status).toBe(200);
    expect(tokenRes.body.access_token).toBeDefined();
  });

  it('issues token with S256 and correct verifier', async () => {
    // Generate code_verifier and code_challenge using helpers.js logic
    const code_verifier = 'pkceS256test';
    // S256 challenge calculation using dynamic import for crypto
    const { createHash } = await import('crypto');
    const hashBuffer = createHash('sha256').update(code_verifier).digest();
    const code_challenge = hashBuffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const code = await getAuthCode({ code_challenge, code_challenge_method: 'S256' });
    const tokenRes = await agent.post('/token').send({
      grant_type: 'authorization_code',
      code,
      redirect_uri: 'http://localhost:3000/callback',
      client_id: 'web-app',
      client_secret: 'shhh',
      code_verifier
    });
    expect(tokenRes.status).toBe(200);
    expect(tokenRes.body.access_token).toBeDefined();
  });
});

describe("PKCE Authorization Code Flow", () => {
  let agent;
  let server;
  beforeEach(async () => {
    server = await app.listen(0); // Use ephemeral port
    agent = request.agent(server);
  });

  afterEach(async () => {
    if (server && server.close) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it("stores code_challenge in session after full authorization flow", async () => {
    // Step 1: Start /authorize with code_challenge
    let res = await agent.get("/authorize").query({
      response_type: "code",
      client_id: "web-app",
      redirect_uri: "http://localhost:3000/callback",
      scope: "openid profile",
      state: "xyz",
      code_challenge: "pkce-test-1",
    });
    let step = 0;
    const maxSteps = 20;
    let issuedCode = null;
    while (res.status === 302) {
      const location = res.headers.location;
      step++;
      // ...existing code...
      if (step > maxSteps) {
        throw new Error(
          "Too many redirects, possible infinite loop. Last location: " + location
        );
      }
      if (location.startsWith("/login")) {
        if (location.includes("error=Invalid%20username%20or%20password")) {
          throw new Error("Login failed: Invalid username or password");
        }
        res = await agent.get(location);
        res = await agent
          .post(location) // Use the full login URL with OAuth params
          .send({ username: "alice", password: "pw123" });
        // ...existing code...
      } else if (location.startsWith("/consent")) {
        res = await agent.post("/consent").send({
          client_id: "web-app",
          redirect_uri: "http://localhost:3000/callback",
          state: "xyz",
          action: "accept",
          scope: "openid profile",
          response_type: "code",
        });
        // ...existing code...
      } else if (location.startsWith("http://localhost:3000/callback")) {
        // Final redirect to client callback (code issued)
        const urlObj = new URL(location);
        issuedCode = urlObj.searchParams.get("code");
        break;
      } else if (location.startsWith("/authorize")) {
        // Follow the /authorize?... redirect after login
        res = await agent.get(location);
        // ...existing code...
      } else if (location.startsWith("/error")) {
        throw new Error("Unexpected error redirect: " + location);
      } else {
        break;
      }
    }
    // Now check /sim/sessions for code_challenge
    const sessionsRes = await agent.get("/sim/sessions");
    expect(sessionsRes.status).toBe(200);
    // ...existing code...
    const found = Object.values(sessionsRes.body.authCodes).some(
      (code) => code.pkce && code.pkce.code_challenge === "pkce-test-1"
    );
    expect(found).toBe(true);
  });

  it("stores code_challenge and code_challenge_method in session after full authorization flow", async () => {
    // Step 2: Start /authorize with code_challenge and code_challenge_method=S256
    let res = await agent.get("/authorize").query({
      response_type: "code",
      client_id: "web-app",
      redirect_uri: "http://localhost:3000/callback",
      scope: "openid profile",
      state: "xyz",
      code_challenge: "pkce-test-2",
      code_challenge_method: "S256",
    });
    let step = 0;
    const maxSteps = 20;
    let issuedCode = null;
    while (res.status === 302) {
      const location = res.headers.location;
      step++;
      // ...existing code...
      if (step > maxSteps) {
        throw new Error(
          "Too many redirects, possible infinite loop. Last location: " + location
        );
      }
      if (location.startsWith("/login")) {
        if (location.includes("error=Invalid%20username%20or%20password")) {
          throw new Error("Login failed: Invalid username or password");
        }
        res = await agent.get(location);
        res = await agent
          .post(location) // Use the full login URL with OAuth params
          .send({ username: "alice", password: "pw123" });
        // ...existing code...
      } else if (location.startsWith("/consent")) {
        res = await agent.post("/consent").send({
          client_id: "web-app",
          redirect_uri: "http://localhost:3000/callback",
          state: "xyz",
          action: "accept",
          scope: "openid profile",
          response_type: "code",
        });
        // ...existing code...
      } else if (location.startsWith("http://localhost:3000/callback")) {
        // Final redirect to client callback (code issued)
        const urlObj = new URL(location);
        issuedCode = urlObj.searchParams.get("code");
        break;
      } else if (location.startsWith("/authorize")) {
        // Follow the /authorize?... redirect after login
        res = await agent.get(location);
        // ...existing code...
      } else if (location.startsWith("/error")) {
        throw new Error("Unexpected error redirect: " + location);
      } else {
        break;
      }
    }
    // Now check /sim/sessions for code_challenge and method
    const sessionsRes = await agent.get("/sim/sessions");
    expect(sessionsRes.status).toBe(200);
    // ...existing code...
    const found = Object.values(sessionsRes.body.authCodes).some(
      (code) =>
        code.pkce &&
        code.pkce.code_challenge === "pkce-test-2" &&
        code.pkce.code_challenge_method === "S256"
    );
    expect(found).toBe(true);
  });

  it("rejects invalid code_challenge_method", async () => {
    // Step 3: Start /authorize with invalid code_challenge_method
    const authRes = await agent.get("/authorize").query({
      response_type: "code",
      client_id: "web-app",
      redirect_uri: "http://localhost:3000/callback",
      scope: "openid profile",
      state: "xyz",
      code_challenge: "pkce-test-3",
      code_challenge_method: "text",
    });
    // Should redirect to /error with invalid_request
    expect(authRes.status).toBe(302);
    expect(authRes.headers.location).toMatch(/error=invalid_request/);
    expect(authRes.headers.location).toMatch(/code_challenge_method/);
  });
});
