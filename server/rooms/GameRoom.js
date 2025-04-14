const { Room } = require('colyseus');
const { Schema, MapSchema, defineTypes } = require('@colyseus/schema');

// Define the Player schema for network synchronization
class Player extends Schema {}
defineTypes(Player, {
  id: "string",
  x: "number",
  y: "number",
  z: "number",
  rotationY: "number",
  connected: "boolean",
  lastActive: "number"
});

// Define the game state schema
class GameState extends Schema {
  constructor() {
    super();
    this.players = new MapSchema();
    this.roomId = Math.random().toString(36).substring(2, 8);
  }
}
defineTypes(GameState, {
  players: { map: Player },
  roomId: "string"
});

// Track active rooms to prevent creating too many
const activeRooms = new Map();

class GameRoom extends Room {
  // Store client activity timeouts
  clientTimeouts = {};
  
  onCreate(options) {
    console.log("Game room created!", options);
    
    // Initialize the room state
    this.setState(new GameState());
    
    // Register this room in active rooms map
    activeRooms.set(this.roomId, this);
    console.log(`Room ${this.state.roomId} created. Total active rooms: ${activeRooms.size}`);
    
    // Set a lower patch rate to reduce network traffic
    this.setPatchRate(100);
    
    // Set the simulation interval - how often to update the game state
    this.setSimulationInterval((deltaTime) => this.update(deltaTime), 16);
    
    // Set the maximum number of clients allowed in this room
    this.maxClients = 8;
    
    // Room will be destroyed when empty
    this.autoDispose = true;
    
    // Run cleanup every 60 seconds
    this.setSimulationInterval(() => this.cleanupInactiveClients(), 60000);
    
    // Handle movement messages from clients
    this.onMessage("move", (client, data) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.x = data.x;
        player.y = data.y;
        player.z = data.z;
        player.rotationY = data.rotationY;
        player.lastActive = Date.now();
      }
    });
    
    // Handle heartbeat messages to keep connection alive
    this.onMessage("heartbeat", (client) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.connected = true;
        player.lastActive = Date.now();
        this.refreshClientTimeout(client.sessionId);
      }
    });
  }
  
  onJoin(client, options) {
    console.log("Client joined:", client.sessionId);
    
    // Create a new player for this client
    const player = new Player();
    player.id = client.sessionId;
    player.x = 0;
    player.y = 0;
    player.z = 0;
    player.rotationY = 0;
    player.connected = true;
    player.lastActive = Date.now();
    
    // Add the player to the game state
    this.state.players.set(client.sessionId, player);
    
    // Set timeout to mark player as inactive if no activity
    this.setClientTimeout(client.sessionId);
    
    // Send welcome message
    this.broadcast("system_message", {
      message: `Player ${client.sessionId} has joined the room ${this.state.roomId}`
    });
  }
  
  async onLeave(client, consented) {
    console.log("Client left:", client.sessionId);
    
    try {
      const player = this.state.players.get(client.sessionId);
      
      // Mark player as disconnected but keep in state temporarily
      if (player) {
        player.connected = false;
        player.lastActive = Date.now();
      }
      
      // Clear any existing timeout
      if (this.clientTimeouts[client.sessionId]) {
        clearTimeout(this.clientTimeouts[client.sessionId]);
        delete this.clientTimeouts[client.sessionId];
      }
      
      // Allow reconnection for shorter duration (10 seconds)
      if (consented) {
        // Player intentionally disconnected - remove immediately
        console.log(`Client ${client.sessionId} intentionally disconnected`);
        this.state.players.delete(client.sessionId);
      } else {
        // Player disconnected due to network issues, allow time to reconnect
        console.log(`Client ${client.sessionId} disconnected. Waiting for reconnection...`);
        try {
          const reconnection = await this.allowReconnection(client, 10);
          console.log(`Client ${client.sessionId} reconnected`);
          
          // Player is back - update the state
          const player = this.state.players.get(client.sessionId);
          if (player) {
            player.connected = true;
            player.lastActive = Date.now();
            this.setClientTimeout(client.sessionId);
          }
        } catch (e) {
          // Player didn't reconnect in time
          console.log(`Client ${client.sessionId} didn't reconnect in time, removing player`);
          this.state.players.delete(client.sessionId);
        }
      }
    } catch (e) {
      console.error(`Error in onLeave for ${client.sessionId}:`, e);
      // Make sure we clean up the player
      this.state.players.delete(client.sessionId);
    }
  }
  
  onDispose() {
    console.log(`Room ${this.state.roomId} disposing...`);
    
    // Clear all timeouts for this room
    for (const timeoutId of Object.values(this.clientTimeouts)) {
      clearTimeout(timeoutId);
    }
    this.clientTimeouts = {};
    
    // Remove from active rooms map
    activeRooms.delete(this.roomId);
    console.log(`Room disposed. Total active rooms: ${activeRooms.size}`);
  }
  
  // Set a timeout to mark a client as inactive if no messages received
  setClientTimeout(clientId) {
    // Clear any existing timeout
    if (this.clientTimeouts[clientId]) {
      clearTimeout(this.clientTimeouts[clientId]);
    }
    
    // Set a new timeout - if no activity for 20 seconds, mark as inactive
    this.clientTimeouts[clientId] = setTimeout(() => {
      const player = this.state.players.get(clientId);
      if (player) {
        player.connected = false;
        console.log(`Client ${clientId} marked as inactive due to timeout`);
      }
    }, 20000);
  }
  
  // Refresh client timeout
  refreshClientTimeout(clientId) {
    this.setClientTimeout(clientId);
  }
  
  // Clean up inactive clients
  cleanupInactiveClients() {
    const now = Date.now();
    const inactivityThreshold = 30000; // 30 seconds
    let removeCount = 0;
    
    for (const [clientId, player] of this.state.players.entries()) {
      if (!player.connected && (now - player.lastActive) > inactivityThreshold) {
        // Remove players that have been disconnected for more than 30 seconds
        console.log(`Cleaning up inactive client ${clientId}`);
        this.state.players.delete(clientId);
        
        // Clear any timeout
        if (this.clientTimeouts[clientId]) {
          clearTimeout(this.clientTimeouts[clientId]);
          delete this.clientTimeouts[clientId];
        }
        
        removeCount++;
      }
    }
    
    if (removeCount > 0) {
      console.log(`Cleaned up ${removeCount} inactive clients`);
    }
  }
  
  update(deltaTime) {
    // Game logic update - runs at 60fps
    // Currently empty since the game state is driven by client updates
  }
}

module.exports = {
  GameRoom
};
