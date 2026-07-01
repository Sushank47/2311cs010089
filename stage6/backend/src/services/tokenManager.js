const axios = require('axios');
const config = require('../config/dotenv');

let cachedToken = null;
let tokenExpiresAt = 0; // Unix timestamp in seconds

async function refreshAccessToken() {
  const url = `${config.BASE_URL}/evaluation-service/auth`;
  const payload = {
    email: config.EMAIL,
    name: config.NAME,
    rollNo: config.ROLL_NO,
    accessCode: config.ACCESS_CODE,
    clientID: config.CLIENT_ID,
    clientSecret: config.CLIENT_SECRET
  };

  try {
    const response = await axios.post(url, payload, { timeout: 8000 });
    if (response.data && response.data.access_token) {
      cachedToken = response.data.access_token;
      // expires_in is the unix timestamp in seconds
      tokenExpiresAt = response.data.expires_in || (Math.floor(Date.now() / 1000) + 3600);
      return cachedToken;
    } else {
      throw new Error('Authentication response did not contain access_token');
    }
  } catch (error) {
    const message = error.response ? JSON.stringify(error.response.data) : error.message;
    throw new Error(`Failed to authenticate with evaluation service: ${message}`);
  }
}

async function getAccessToken() {
  const currentTimestamp = Math.floor(Date.now() / 1000);
  // If no token exists, or it expires in less than 5 minutes (300 seconds), refresh it
  if (!cachedToken || (tokenExpiresAt - currentTimestamp) < 300) {
    await refreshAccessToken();
  }
  return cachedToken;
}

module.exports = {
  getAccessToken,
  refreshAccessToken
};
