import { errorSimulations } from '../store.js';

// GET /sim/config/errors
export function getErrorSimulations(req, res) {
  res.json(errorSimulations);
}

// POST /sim/config/errors
export function setErrorSimulation(req, res) {
  const { target, status, error, error_description } = req.body;
  if (!target || !status || !error) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  errorSimulations[target] = { status, error, error_description };
  res.json({ [target]: errorSimulations[target] });
}

// DELETE /sim/config/errors
export function deleteErrorSimulation(req, res) {
  const { target } = req.query;
  if (target) {
    delete errorSimulations[target];
  } else {
    // Clear all error simulations
    Object.keys(errorSimulations).forEach(k => delete errorSimulations[k]);
  }
  res.json(errorSimulations);
}
