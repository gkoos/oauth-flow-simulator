// delayMiddleware.js
// Express middleware to inject artificial delay via ?delay=ms query param

const delayMiddleware = (req, res, next) => {
  const delay = parseInt(req.query.delay, 10);
  if (!isNaN(delay) && delay > 0 && delay < 30000) { // max 30s for safety
    req._delayInjected = delay;
    setTimeout(next, delay);
  } else {
    next();
  }
};

export default delayMiddleware;
