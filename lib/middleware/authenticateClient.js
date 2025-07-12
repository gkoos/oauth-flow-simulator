// authenticateClient.js - reusable client authentication middleware
// Supports client_id/client_secret in body or HTTP Basic Auth

export function authenticateClient(req, res, getClient) {
  let clientId = req.body.client_id;
  let clientSecret = req.body.client_secret;
  // Check HTTP Basic Auth header
  const headers = req.headers || {};
  const authHeader = headers['authorization'];
  if (authHeader && authHeader.startsWith('Basic ')) {
    const base64 = authHeader.slice(6);
    try {
      const decoded = Buffer.from(base64, 'base64').toString('utf8');
      const [id, secret] = decoded.split(':');
      if (id) clientId = id;
      if (secret) clientSecret = secret;
    } catch (e) {
      // ignore, fallback to body
    }
  }
  const client = getClient(clientId);
  // Only check credentials, not token ownership
  if (!client || client.clientSecret !== clientSecret) {
    res.status(401).json({ error: 'invalid_client', error_description: 'Invalid client credentials' });
    return null;
  }
  return client;
}
