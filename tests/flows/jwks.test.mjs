import request from 'supertest';
import app from '../../lib/index.js';
import { signingKeys } from '../../lib/store.js';

describe('/jwks endpoint', () => {
  it('returns the keys array from store.js', async () => {
    const res = await request(app).get('/jwks');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.keys)).toBe(true);
    // Check that each key in response matches a key in store
    for (const key of signingKeys.keys) {
      const found = res.body.keys.find(k => k.kid === key.kid);
      expect(found).toBeDefined();
      expect(found.kty).toBe(key.kty);
      expect(found.alg).toBe(key.alg);
      expect(found.use).toBe(key.use);
      if (key.kty === 'RSA') {
        expect(found.n).toBe(key.n);
        expect(found.e).toBe(key.e);
      } else if (key.kty === 'EC') {
        expect(found.crv).toBe(key.crv);
        expect(found.x).toBe(key.x);
        expect(found.y).toBe(key.y);
      }
    }
  });
});
