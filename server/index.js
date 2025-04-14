const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('colyseus');
const { monitor } = require('@colyseus/monitor');

// Import our game room
const { GameRoom } = require('./rooms/GameRoom');

const port = process.env.PORT || 2567;
const app = express();

app.use(cors());
app.use(express.json());

// Create and attach the Colyseus server
const server = http.createServer(app);
const gameServer = new Server({
  server,
  // Improved settings for connection management
  pingInterval: 2000, // Check connection status every 2 seconds
  pingMaxRetries: 3,  // Allow 3 retries before considering connection lost
  verifyClient: false, // Disable client verification to speed up connections
  gracefullyShutdown: false, // Don't wait for all clients to disconnect on shutdown
});

// Register our custom game room
gameServer.define('game_room', GameRoom, {
  // Make room public (default is true, but explicit is better)
  private: false,
  // Allow at most 1 room with the same name (prevents multiple identical rooms)
  maxRooms: 5,
  // Configure room presence
  presence: true
});

// Attach the Colyseus monitor (available at /colyseus)
app.use('/colyseus', monitor());

// Serve a simple status page
app.get('/', (req, res) => {
  res.send('3D Multiplayer Game Server is running');
});

// Start the server
gameServer.listen(port);
console.log(`Game server started on http://localhost:${port}`);
