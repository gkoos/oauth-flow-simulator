import { userinfoScopes } from '../store.js';

// GET /sim/config/userinfo
export function getUserinfoConfig(req, res) {
  res.json(userinfoScopes);
}

// POST /sim/config/userinfo
export function updateGlobalUserinfoConfig(req, res) {
  Object.assign(userinfoScopes.globals, req.body);
  res.json(userinfoScopes.globals);
}

// POST /sim/config/userinfo/clients/:clientId
export function updateClientUserinfoConfig(req, res) {
  const { clientId } = req.params;
  userinfoScopes.clients[clientId] = req.body;
  res.json(userinfoScopes.clients[clientId]);
}

// POST /sim/config/userinfo/users/:userName
export function updateUserUserinfoConfig(req, res) {
  const { userName } = req.params;
  userinfoScopes.users[userName] = req.body;
  res.json(userinfoScopes.users[userName]);
}
