// Express route handlers for /sim/scopes endpoints
import { scopes } from '../store.js';

export function listScopes(req, res) {
  res.json(scopes);
}

export function createScope(req, res) {
  const { name, description } = req.body;
  // Uniqueness check only; OpenAPI validator handles required/type
  if (scopes.find(s => s.name === name)) {
    return res.status(409).json({ error: 'Scope already exists' });
  }
  const scope = { name, description };
  scopes.push(scope);
  res.status(201).json(scope);
}

export function getScope(req, res) {
  const scope = scopes.find(s => s.name === req.params.scope);
  if (!scope) return res.status(404).json({ error: 'Scope not found' });
  res.json(scope);
}

export function updateScope(req, res) {
  const scope = scopes.find(s => s.name === req.params.scope);
  if (!scope) return res.status(404).json({ error: 'Scope not found' });
  const { description } = req.body;
  if (description !== undefined) scope.description = description;
  res.json(scope);
}

export function deleteScope(req, res) {
  const idx = scopes.findIndex(s => s.name === req.params.scope);
  if (idx === -1) return res.status(404).json({ error: 'Scope not found' });
  scopes.splice(idx, 1);
  res.status(204).send();
}
