import request from 'supertest';
import { app } from '../lib/index.js';
import { discoveryDocument } from '../lib/store.js';

describe('/.well-known/openid-configuration', () => {
  it('should return the discovery document with host substituted', async () => {
    const res = await request(app)
      .get('/.well-known/openid-configuration')
      .expect('Content-Type', /json/)
      .expect(200);
    // Use actual host/port from response/request
    const protocol = 'http';
    const host = res.request.host; // Supertest sets this to the actual host:port
    const fullHost = `${protocol}://${host}`;
    const substituteHost = (obj) => {
      if (typeof obj === 'string') {
        return obj.replace(/\{\{host\}\}/g, fullHost);
      } else if (Array.isArray(obj)) {
        return obj.map(substituteHost);
      } else if (obj && typeof obj === 'object') {
        const out = {};
        for (const k in obj) out[k] = substituteHost(obj[k]);
        return out;
      }
      return obj;
    };
    const expected = substituteHost(discoveryDocument);
    expect(res.body).toEqual(expected);
  });
});
