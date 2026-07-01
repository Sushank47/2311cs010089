const app = require('./app');
const config = require('./config/dotenv');
const { getAccessToken } = require('./services/tokenManager');
const Log = require('./services/logger');

async function startServer() {
  const PORT = config.PORT;

  try {
    // 1. Verify credentials and retrieve token on startup
    console.log('Validating credentials against evaluation service...');
    await getAccessToken();
    console.log('Access token generated successfully. Evaluation credentials validated.');

    // 2. Start listening
    app.listen(PORT, async () => {
      console.log(`Server is running on port ${PORT}`);
      // Record startup log in evaluation service (maps to utils)
      await Log(
        'backend',
        'info',
        'web-backend-utils',
        `Express server successfully booted and listening on port ${PORT}. Ready to route requests.`
      );
    });

  } catch (error) {
    console.error('Critical failure during server startup:', error.message);
    process.exit(1);
  }
}

startServer();
