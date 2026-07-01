const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const config = {
  PORT: process.env.PORT || 5001,
  CLIENT_ID: process.env.CLIENT_ID,
  CLIENT_SECRET: process.env.CLIENT_SECRET,
  EMAIL: process.env.EMAIL,
  NAME: process.env.NAME,
  ROLL_NO: process.env.ROLL_NO,
  ACCESS_CODE: process.env.ACCESS_CODE,
  BASE_URL: process.env.BASE_URL || 'http://4.224.186.213'
};

module.exports = config;
