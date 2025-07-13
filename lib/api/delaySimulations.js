import { delaySimulations } from '../store.js';

// GET /sim/config/delays
export function getDelaySimulations(req, res) {
  res.json(delaySimulations);
}

// POST /sim/config/delays
export function setDelaySimulation(req, res) {
  const { target, delay } = req.body;
  if (!target || typeof delay !== 'number') {
    return res.status(400).json({ error: 'Missing required fields: target and delay (number)' });
  }
  delaySimulations[target] = { delay };
  res.json({ [target]: delaySimulations[target] });
}

// DELETE /sim/config/delays
export function deleteDelaySimulation(req, res) {
  const { target } = req.query;
  if (target) {
    delete delaySimulations[target];
  } else {
    // Clear all delay simulations
    Object.keys(delaySimulations).forEach(k => delete delaySimulations[k]);
  }
  res.json(delaySimulations);
}
