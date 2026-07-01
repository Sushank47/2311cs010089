const axios = require('axios');
const config = require('../config/dotenv');
const { getAccessToken } = require('./tokenManager');

// Translate package names to the exact singular strings accepted by the logging endpoint
function mapPackage(stack, pkg) {
  if (!pkg) return 'utils';
  
  // Clean string and strip standard web-backend/web-frontend prefixes
  const clean = pkg.replace(/^(web-)?(backend|frontend)-/, '').toLowerCase();
  
  if (stack === 'backend') {
    if (clean.startsWith('controller')) return 'controller';
    if (clean.startsWith('route')) return 'route';
    if (clean.startsWith('service')) return 'service';
    if (clean.startsWith('model') || clean.startsWith('db') || clean.startsWith('schema')) return 'db';
    if (clean.startsWith('repository')) return 'repository';
    if (clean.startsWith('middleware')) return 'middleware';
    if (clean.startsWith('utils') || clean.startsWith('util')) return 'utils';
    if (clean.startsWith('config')) return 'config';
    return 'utils'; // fallback
  } else if (stack === 'frontend') {
    if (clean.startsWith('component')) return 'component';
    if (clean.startsWith('page')) return 'page';
    if (clean.startsWith('hook')) return 'hook';
    if (clean.startsWith('utils') || clean.startsWith('util')) return 'utils';
    return 'utils'; // fallback
  }
  return clean;
}

/**
 * Reusable Log Function
 * @param {string} stack - 'backend' or 'frontend'
 * @param {string} level - 'info', 'warn', 'error', or 'debug'
 * @param {string} packageName - The originating code package (e.g. 'web-backend-controllers')
 * @param {string} message - Description message
 */
async function Log(stack, level, packageName, message) {
  // Normalize parameters
  const normStack = (stack || 'backend').toLowerCase();
  const normLevel = (level || 'info').toLowerCase();
  const mappedPkg = mapPackage(normStack, packageName);
  
  // Build API payload (truncate message to max 48 characters per API constraints)
  const sanitizedMessage = (message || '').substring(0, 48);

  const payload = {
    stack: normStack,
    level: normLevel,
    package: mappedPkg,
    message: sanitizedMessage
  };

  const url = `${config.BASE_URL}/evaluation-service/logs`;

  try {
    const token = await getAccessToken();
    await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });
  } catch (error) {
    // Graceful error logging to server standard output without crashing application
    const errorDetails = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error(`[LOGGER FAILURE] Could not transmit log to server: ${errorDetails} | Payload: ${JSON.stringify(payload)}`);
  }
}

module.exports = Log;
