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
});

// Register our custom game room
gameServer.define('game_room', GameRoom, {
  // Make room public (default is true, but explicit is better)
  private: false,
  // Set a reasonable limit for concurrent rooms
  maxRooms: 5,
  // Configure room presence
  presence: true
});

// Improve automatic room cleanup and prevent auto-creation of rooms
gameServer.onShutdown(() => {
  console.log("Game server is shutting down.");
});

// Remove the matchMaker event listeners since they're not supported in this version
// gameServer.matchMaker.on('create', (room) => {
//   console.log(`Room created with ID: ${room.roomId}`);
// });

// gameServer.matchMaker.on('dispose', (room) => {
//   console.log(`Room disposed with ID: ${room.roomId}`);
// });

// gameServer.matchMaker.on('join', (room, client) => {
//   console.log(`Client ${client.sessionId} joined room ${room.roomId}`);
// });

// gameServer.matchMaker.on('leave', (room, client) => {
//   console.log(`Client ${client.sessionId} left room ${room.roomId}`);
// });

// Attach the Colyseus monitor (available at /colyseus)
app.use('/colyseus', monitor());

// API endpoints

// Serve a simple status page
app.get('/', (req, res) => {
  res.send('3D Multiplayer Game Server is running');
});

// Get available rooms
app.get('/rooms', (req, res) => {
  try {
    if (!gameServer.matchMaker || !gameServer.matchMaker.rooms) {
      return res.json([]);
    }
    
    const rooms = gameServer.matchMaker.rooms
      .filter(room => room.roomName === 'game_room')
      .map(room => ({
        roomId: room.roomId,
        name: room.state?.roomName || 'Unnamed Room',
        clients: room.clients.length,
        maxClients: room.maxClients,
        createdAt: room.state?.createdAt || Date.now(),
      }));
    
    res.json(rooms);
  } catch (error) {
    console.error("Error getting available rooms:", error);
    res.status(500).json({ error: "Failed to get available rooms" });
  }
});

// Debug endpoint to manually start the game (for testing)
app.get('/debug/start-game/:roomId', (req, res) => {
  try {
    const roomId = req.params.roomId;
    console.log(`Attempting to manually start game in room: ${roomId}`);
    
    // Find the room instance
    const room = gameServer.matchMaker.rooms.find(r => r.roomId === roomId);
    
    if (!room) {
      return res.status(404).json({ error: `Room ${roomId} not found` });
    }
    
    // Manually call the startGame method
    if (typeof room.startGame === 'function') {
      console.log("Manually starting game...");
      room.startGame();
      return res.json({ success: true, message: `Game started in room ${roomId}` });
    } else {
      return res.status(500).json({ error: "Room instance doesn't have startGame method" });
    }
  } catch (error) {
    console.error("Error starting game:", error);
    res.status(500).json({ error: "Failed to start game" });
  }
});

// Start the server
gameServer.listen(port);
console.log(`Game server started on http://localhost:${port}`);
console.log(`Server ready for WebSocket connections at ws://localhost:${port}`);
console.log(`Server monitor available at http://localhost:${port}/colyseus`);
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

// Log any network interface information that might be helpful
try {
  const os = require('os');
  const networkInterfaces = os.networkInterfaces();
  console.log('Available network interfaces:');
  Object.keys(networkInterfaces).forEach(interfaceName => {
    const interfaces = networkInterfaces[interfaceName];
    interfaces.forEach(iface => {
      if (iface.family === 'IPv4') {
        console.log(`  - ${interfaceName}: ${iface.address}`);
      }
    });
  });
} catch (err) {
  console.error('Error getting network interfaces:', err);
}

// Cleanup function to remove any automatically created rooms on server startup
const cleanupAutoCreatedRooms = () => {
  try {
    console.log("Checking for auto-created rooms...");
    
    // In Colyseus, check if matchMaker and rooms are available
    if (gameServer.matchMaker && gameServer.matchMaker.rooms) {
      const rooms = gameServer.matchMaker.rooms.filter(room => room.roomName === 'game_room');
      
      if (rooms && rooms.length > 0) {
        console.log(`Found ${rooms.length} rooms at startup. They will self-dispose if auto-created.`);
      } else {
        console.log("No auto-created rooms found.");
      }
    } else {
      console.log("MatchMaker rooms not available yet, skipping cleanup.");
    }
  } catch (error) {
    console.error("Error checking for auto-created rooms:", error);
  }
};

// Run the cleanup after a short delay to ensure server is fully started
setTimeout(cleanupAutoCreatedRooms, 1000);
