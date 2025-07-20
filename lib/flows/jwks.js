// JWKS endpoint handler
import { signingKeys } from '../store.js';

function getPublicJwk(key) {
  // Only include public fields for RSA and EC keys
  const jwk = {
    kid: key.kid,
    kty: key.kty,
    alg: key.alg,
    use: key.use,
  };
  if (key.kty === 'RSA') {
    jwk.n = key.n;
    jwk.e = key.e;
  } else if (key.kty === 'EC') {
    jwk.crv = key.crv;
    jwk.x = key.x;
    jwk.y = key.y;
  }
  return jwk;
}

export function jwks(req, res) {
  const keys = signingKeys.keys.map(getPublicJwk);
  res.json({ keys });
}
