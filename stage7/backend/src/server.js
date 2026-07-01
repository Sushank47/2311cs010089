const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const config = require('./config/dotenv');
const { getAccessToken } = require('./services/tokenManager');
const Log = require('./services/logger');

const server = http.createServer(app);

// Initialize Socket.io Server instance
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  }
});

// Cache socket server reference in Express application context
app.set('io', io);

// Monitor Socket connections
io.on('connection', (socket) => {
  console.log(`[WEBSOCKETS] New client connection established: ${socket.id}`);
  
  socket.on('disconnect', () => {
    console.log(`[WEBSOCKETS] Client disconnected: ${socket.id}`);
  });
});

async function startServer() {
  const PORT = config.PORT;

  try {
    // 1. Verify credentials and get token
    console.log('Validating credentials against evaluation service...');
    await getAccessToken();
    console.log('Access token generated successfully. Evaluation credentials validated.');

    // 2. Start HTTP & Socket server
    server.listen(PORT, async () => {
      console.log(`Real-time notification server listening on port ${PORT}`);
      await Log(
        'backend',
        'info',
        'web-backend-utils',
        `Express WebSockets server listening on port ${PORT}.`
      );
    });

  } catch (error) {
    console.error('Startup error:', error.message);
    process.exit(1);
  }
}

startServer();
