
import supertest from "supertest";

const baseUrl = "http://localhost:4000";
const client_id = "web-app";
const redirect_uri = "http://localhost:3000/callback";
const username = "alice";
const password = "pw123";
const scope = "openid profile";
const state = "xyz";

const agent = supertest.agent(baseUrl);

async function runFlow() {

  // 1. Call /authorize and follow all redirects until code is found
  let res = await agent.get("/authorize").query({
    response_type: "code",
    client_id,
    redirect_uri,
    scope,
    state,
  }).redirects(0);

  let step = 0;
  const maxSteps = 20;
  let code = null;
  while (res && res.status === 302) {
    let location = res.headers.location;
    step++;
    if (step > maxSteps) {
      console.error('Too many redirects');
      return;
    }
    if (location === '/') {
      res = await agent.get(location).redirects(0);
      continue;
    }
    if (location && location.startsWith('http://localhost:3000/callback')) {
      const urlObj = new URL(location);
      code = urlObj.searchParams.get('code');
      console.log('Authorization code:', code);
      break;
    }
    // If redirected to /authorize, follow it
    if (location && location.startsWith('/authorize')) {
      res = await agent.get(location).redirects(0);
      continue;
    }
    // If redirected to /consent, accept consent
    if (location && location.startsWith('/consent')) {
      res = await agent.post('/consent').send({
        client_id,
        redirect_uri,
        state,
        action: 'accept',
        scope,
        response_type: 'code',
      }).redirects(0);
      continue;
    }
    // If redirected to /login, follow and post credentials
    if (location && location.startsWith('/login')) {
      res = await agent.get(location).redirects(0);
      res = await agent.post(location).type('form').send({ username, password }).redirects(0);
      continue;
    }
    // Unexpected error
    if (location && location.startsWith('/error')) {
      console.error('Unexpected error redirect:', location);
      return;
    }
    // Otherwise, break
    break;
  }

  if (!code) {
    console.error('No authorization code found.');
    return;
  }

  // 5. Call the token endpoint to get an access token
  const tokenRes = await agent.post("/token").type("form").send({
    grant_type: "authorization_code",
    code,
    redirect_uri,
    client_id,
    client_secret: "shhh",
  });

  console.log("Token endpoint status:", tokenRes.status);
  const access_token = tokenRes.body.access_token;
  console.log("Access token:", access_token);
}

runFlow().catch((err) => {
  console.error("Flow failed:", err);
  process.exit(1);
});
