import * as usersHandlers from './api/users.js';
import * as clientsHandlers from './api/clients.js';
import { jwtClaims } from './store.js';
import { listSessions } from './api/sessions.js';
import { getErrorSimulations, setErrorSimulation, deleteErrorSimulation } from './api/errorSimulations.js';
import { getDelaySimulations, setDelaySimulation, deleteDelaySimulation } from './api/delaySimulations.js';

function isPlainObject(obj) {
  return typeof obj === 'object' && obj !== null && !Array.isArray(obj);
}

export function registerSimApi(app) {
  // Users endpoints
  app.get('/sim/users', usersHandlers.listUsers);
  app.post('/sim/users', usersHandlers.createUser);
  app.get('/sim/users/:username', usersHandlers.getUser);
  app.put('/sim/users/:username', usersHandlers.updateUser);
  app.delete('/sim/users/:username', usersHandlers.deleteUser);

  // Clients endpoints
  app.get('/sim/clients', clientsHandlers.listClients);
  app.post('/sim/clients', clientsHandlers.createClient);
  app.get('/sim/clients/:clientId', clientsHandlers.getClient);
  app.put('/sim/clients/:clientId', clientsHandlers.updateClient);
  app.delete('/sim/clients/:clientId', clientsHandlers.deleteClient);

  // Sessions endpoints
  app.get('/sim/sessions', listSessions);

  // JWT Claims config endpoints
  app.get('/sim/config/jwt', (req, res) => {
    res.json(jwtClaims);
  });
  app.post('/sim/config/jwt', (req, res) => {
    if (!req.body || !('globals' in req.body) || !isPlainObject(req.body.globals)) {
      res.status(400).json({ error: 'Missing or invalid "globals" in body' });
      return;
    }
    jwtClaims.globals = { ...jwtClaims.globals, ...req.body.globals };
    res.json({ globals: jwtClaims.globals });
  });
  app.post('/sim/config/jwt/clients/:clientId', (req, res) => {
    if (!req.body || !('claims' in req.body) || !isPlainObject(req.body.claims)) {
      res.status(400).json({ error: 'Missing or invalid "claims" in body' });
      return;
    }
    jwtClaims.clients[req.params.clientId] = { ...jwtClaims.clients[req.params.clientId], ...req.body.claims };
    res.json({ claims: jwtClaims.clients[req.params.clientId] });
  });
  app.post('/sim/config/jwt/users/:userName', (req, res) => {
    if (!req.body || !('claims' in req.body) || !isPlainObject(req.body.claims)) {
      res.status(400).json({ error: 'Missing or invalid "claims" in body' });
      return;
    }
    jwtClaims.users[req.params.userName] = { ...jwtClaims.users[req.params.userName], ...req.body.claims };
    res.json({ claims: jwtClaims.users[req.params.userName] });
  });

  // Error simulation endpoints
  app.get('/sim/config/errors', getErrorSimulations);
  app.post('/sim/config/errors', setErrorSimulation);
  app.delete('/sim/config/errors', deleteErrorSimulation);

  // Delay simulation endpoints
  app.get('/sim/config/delays', getDelaySimulations);
  app.post('/sim/config/delays', setDelaySimulation);
  app.delete('/sim/config/delays', deleteDelaySimulation);
}
