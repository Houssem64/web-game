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
gameServer.define('game_room', GameRoom);

// Attach the Colyseus monitor (available at /colyseus)
app.use('/colyseus', monitor());

// Serve a simple status page
app.get('/', (req, res) => {
  res.send('3D Multiplayer Game Server is running');
});

// Start the server
gameServer.listen(port);
console.log(`Game server started on http://localhost:${port}`);
