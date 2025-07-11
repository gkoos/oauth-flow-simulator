import * as usersHandlers from './api/users.js';
import * as clientsHandlers from './api/clients.js';
import * as scopesHandlers from './api/scopes.js';

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

  // Scopes endpoints
  app.get('/sim/scopes', scopesHandlers.listScopes);
  app.post('/sim/scopes', scopesHandlers.createScope);
  app.get('/sim/scopes/:scope', scopesHandlers.getScope);
  app.put('/sim/scopes/:scope', scopesHandlers.updateScope);
  app.delete('/sim/scopes/:scope', scopesHandlers.deleteScope);
}
