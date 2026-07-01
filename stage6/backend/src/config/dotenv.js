const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env
dotenv.config({ path: path.join(__dirname, '../../.env') });

const config = {
  PORT: process.env.PORT || 5000,
  CLIENT_ID: process.env.CLIENT_ID,
  CLIENT_SECRET: process.env.CLIENT_SECRET,
  EMAIL: process.env.EMAIL,
  NAME: process.env.NAME,
  ROLL_NO: process.env.ROLL_NO,
  ACCESS_CODE: process.env.ACCESS_CODE,
  BASE_URL: process.env.BASE_URL || 'http://4.224.186.213'
};

// Simple validation
const missingKeys = Object.entries(config)
  .filter(([key, val]) => !val)
  .map(([key]) => key);

if (missingKeys.length > 0) {
  console.warn(`[WARNING] Missing environment configurations: ${missingKeys.join(', ')}`);
}

module.exports = config;
