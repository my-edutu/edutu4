require('dotenv').config();

const authenticateApiKey = (req, res, next) => {
  const apiKey = req.header('X-API-Key') || req.query.apiKey;
  
  if (!apiKey) {
    return res.status(401).json({ 
      error: 'Access denied. No API key provided.' 
    });
  }

  if (apiKey !== process.env.API_KEY) {
    return res.status(403).json({ 
      error: 'Access denied. Invalid API key.' 
    });
  }

  next();
};

const validateApiKey = () => {
  if (!process.env.API_KEY) {
    console.error('ERROR: API_KEY environment variable is not set');
    process.exit(1);
  }
  if (process.env.API_KEY.length < 32) {
    console.warn('WARNING: API_KEY should be at least 32 characters long for security');
  }
};

module.exports = {
  authenticateApiKey,
  validateApiKey
};