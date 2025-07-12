// Express route handlers for /sim/clients endpoints
import { clients } from '../store.js';

export function listClients(req, res) {
  res.json(clients);
}

export function createClient(req, res) {
  const { clientId, clientSecret, redirectUris, scopes } = req.body;
  // Uniqueness check only; OpenAPI validator handles required/type
  if (clients.find(c => c.clientId === clientId)) {
    return res.status(409).json({ error: 'Client already exists' });
  }
  const client = { clientId, clientSecret, redirectUris, scopes: scopes || [] };
  clients.push(client);
  res.status(201).json(client);
}

export function getClient(req, res) {
  const client = clients.find(c => c.clientId === req.params.clientId);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  res.json(client);
}

export function updateClient(req, res) {
  const client = clients.find(c => c.clientId === req.params.clientId);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  const { clientSecret, redirectUris, scopes } = req.body;
  if (clientSecret !== undefined) client.clientSecret = clientSecret;
  if (redirectUris !== undefined) client.redirectUris = redirectUris;
  if (scopes !== undefined) client.scopes = scopes;
  res.json(client);
}

export function deleteClient(req, res) {
  const idx = clients.findIndex(c => c.clientId === req.params.clientId);
  if (idx === -1) return res.status(404).json({ error: 'Client not found' });
  clients.splice(idx, 1);
  res.status(204).send();
}
