// Express route handlers for /sim/users endpoints
import { users } from '../store.js';

export function listUsers(req, res) {
  res.json(users);
}

export function createUser(req, res) {
  // Uniqueness check only; OpenAPI validator handles required/type
  const { username } = req.body;
  if (users.find(u => u.username === username)) {
    return res.status(409).json({ error: 'User already exists' });
  }
  const user = { ...req.body };
  users.push(user);
  res.status(201).json(user);
}

export function getUser(req, res) {
  const user = users.find(u => u.username === req.params.username);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
}

export function updateUser(req, res) {
  const { username } = req.params;
  const user = users.find(u => u.username === username);
  if (!user) {
    return res.status(404).json({ error: 'user_not_found' });
  }
  // Merge all fields from request body into user
  Object.assign(user, req.body);
  res.json(user);
}

export function deleteUser(req, res) {
  const idx = users.findIndex(u => u.username === req.params.username);
  if (idx === -1) return res.status(404).json({ error: 'User not found' });
  users.splice(idx, 1);
  res.status(204).send();
}
