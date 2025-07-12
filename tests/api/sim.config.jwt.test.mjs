import request from 'supertest';
import { app } from '../../lib/index.js';
import { jwtClaims } from '../../lib/store.js';

describe('JWT Config API', () => {
  beforeEach(() => {
    // Reset claims before each test
    jwtClaims.globals = {
      iss: '{{now}}',
      sub: '{{username}}',
      aud: '{{aud}}',
      exp: '{{exp}}',
      iat: '{{iat}}',
      scope: '{{scope}}',
      client_id: '{{client}}',
      username: '{{username}}',
      token_type: 'access_token'
    };
    jwtClaims.clients = {};
    jwtClaims.users = {};
  });

  it('GET /sim/config/jwt returns all claims', async () => {
    const res = await request(app).get('/sim/config/jwt');
    expect(res.status).toBe(200);
    expect(res.body.globals).toBeDefined();
    expect(res.body.clients).toBeDefined();
    expect(res.body.users).toBeDefined();
    expect(res.body.globals.iss).toBe('{{now}}');
  });

  it('POST /sim/config/jwt updates global claims', async () => {
    const res = await request(app)
      .post('/sim/config/jwt')
      .send({ globals: { custom: 'value' } });
    expect(res.status).toBe(200);
    expect(res.body.globals.custom).toBe('value');
    expect(jwtClaims.globals.custom).toBe('value');
  });

  it('POST /sim/config/jwt/clients/:clientId sets client claim', async () => {
    const res = await request(app)
      .post('/sim/config/jwt/clients/web-app')
      .send({ claims: { foo: 'bar' } });
    expect(res.status).toBe(200);
    expect(res.body.claims.foo).toBe('bar');
    expect(jwtClaims.clients['web-app'].foo).toBe('bar');
  });

  it('POST /sim/config/jwt/clients/:clientId with null deletes claim', async () => {
    jwtClaims.clients['web-app'] = { foo: 'bar', baz: 'qux' };
    const res = await request(app)
      .post('/sim/config/jwt/clients/web-app')
      .send({ claims: { foo: null } });
    expect(res.status).toBe(200);
    expect(res.body.claims.foo).toBeNull();
    expect(jwtClaims.clients['web-app'].foo).toBeNull();
  });

  it('POST /sim/config/jwt/users/:userName sets user claim', async () => {
    const res = await request(app)
      .post('/sim/config/jwt/users/alice')
      .send({ claims: { hello: 'world' } });
    expect(res.status).toBe(200);
    expect(res.body.claims.hello).toBe('world');
    expect(jwtClaims.users['alice'].hello).toBe('world');
  });

  it('POST /sim/config/jwt/users/:userName with null deletes claim', async () => {
    jwtClaims.users['alice'] = { hello: 'world', test: '123' };
    const res = await request(app)
      .post('/sim/config/jwt/users/alice')
      .send({ claims: { hello: null } });
    expect(res.status).toBe(200);
    expect(res.body.claims.hello).toBeNull();
    expect(jwtClaims.users['alice'].hello).toBeNull();
  });

  it('POST /sim/config/jwt with invalid body returns 400', async () => {
    const res = await request(app)
      .post('/sim/config/jwt')
      .send({ notGlobals: { foo: 'bar' } });
    expect(res.status).toBe(400);
  });

  it('POST /sim/config/jwt/clients/:clientId with invalid body returns 400', async () => {
    const res = await request(app)
      .post('/sim/config/jwt/clients/web-app')
      .send({ notClaims: { foo: 'bar' } });
    expect(res.status).toBe(400);
  });

  it('POST /sim/config/jwt/users/:userName with invalid body returns 400', async () => {
    const res = await request(app)
      .post('/sim/config/jwt/users/alice')
      .send({ notClaims: { foo: 'bar' } });
    expect(res.status).toBe(400);
  });
});
