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
  chairIndex: "number", // Which chair the player is sitting in (0-3)
  isHost: "boolean",   // Whether this player is the host
  playerNumber: "number", // Player number (1, 2, 3, 4)
  connected: "boolean",
  lastActive: "number"
});

// Define the game state schema
class GameState extends Schema {
  constructor() {
    super();
    this.players = new MapSchema();
    this.roomId = Math.random().toString(36).substring(2, 8);
    this.roomName = ""; // Room name will be set from options
    this.createdAt = Date.now();
    this.hostId = null;  // ID of the host player
    this.nextPlayerNumber = 1; // Counter for assigning player numbers
    
    // Track which chairs are occupied (indexed 0-3)
    this.occupiedChairs = [false, false, false, false];
  }
}

// Chair positions and rotations around the table
const CHAIR_POSITIONS = [
  // P1 - facing the table from the bottom (Z+)
  { position: [0, 0, 1.25], rotation: Math.PI },
  // P2 - facing the table from the top (Z-)
  { position: [0, 0, -1.25], rotation: 0 },
  // P3 - facing the table from the right (X+)
  { position: [1.25, 0, 0], rotation: Math.PI * 1.5 },
  // P4 - facing the table from the left (X-)
  { position: [-1.25, 0, 0], rotation: Math.PI * 0.5 }
];
defineTypes(GameState, {
  players: { map: Player },
  roomId: "string",
  roomName: "string",
  createdAt: "number",
  hostId: "string",
  nextPlayerNumber: "number",
  occupiedChairs: "array"
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
    
    // Set the room name if provided in options
    if (options && options.roomName) {
      this.state.roomName = options.roomName;
      console.log(`Room name set to: ${options.roomName}`);
    } else {
      // Default name if none provided
      this.state.roomName = `Game ${this.state.roomId}`;
    }
    
    // Register this room in active rooms map
    activeRooms.set(this.roomId, this);
    console.log(`Room ${this.state.roomId} created with name "${this.state.roomName}". Total active rooms: ${activeRooms.size}`);
    
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
    
    // Determine if this is the first player (host)
    const isFirstPlayer = this.state.hostId === null;
    
    // Find an available chair for the player
    // For the host, we always try to assign chair 0 (P1 position)
    const chairIndex = isFirstPlayer ? 0 : this.findAvailableChair();
    
    // Create a new player for this client
    const player = new Player();
    player.id = client.sessionId;
    player.connected = true;
    player.lastActive = Date.now();
    player.chairIndex = chairIndex;
    
    // Set host status and player number
    player.isHost = isFirstPlayer;
    player.playerNumber = this.state.nextPlayerNumber++;
    
    // If this is the first player, set them as the host
    if (isFirstPlayer) {
      this.state.hostId = client.sessionId;
      console.log(`Player ${client.sessionId} is the host (P1)`);
    }
    
    // Set player position and rotation based on their assigned chair
    if (chairIndex !== -1) {
      const chairData = CHAIR_POSITIONS[chairIndex];
      player.x = chairData.position[0];
      player.y = chairData.position[1];
      player.z = chairData.position[2];
      player.rotationY = chairData.rotation;
      
      // Mark this chair as occupied
      this.state.occupiedChairs[chairIndex] = true;
      console.log(`Player ${client.sessionId} assigned to chair ${chairIndex} (P${player.playerNumber})`);
    } else {
      // No chairs available, place the player in a default position
      player.x = 0;
      player.y = 0;
      player.z = 0;
      player.rotationY = 0;
      console.log(`No chairs available for player ${client.sessionId} (P${player.playerNumber})`);
    }
    
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
        
        // Store chair index for potential cleanup later
        const chairIndex = player.chairIndex;
        
        // If host leaves, try to assign a new host
        if (player.isHost && this.state.hostId === client.sessionId) {
          this.assignNewHost();
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
          
          // Free up their chair
          if (chairIndex >= 0 && chairIndex < this.state.occupiedChairs.length) {
            this.state.occupiedChairs[chairIndex] = false;
            console.log(`Chair ${chairIndex} is now available`);
          }
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
            
            // Free up their chair
            if (chairIndex >= 0 && chairIndex < this.state.occupiedChairs.length) {
              this.state.occupiedChairs[chairIndex] = false;
              console.log(`Chair ${chairIndex} is now available after failed reconnection`);
            }
          }
        }
      }
    } catch (e) {
      console.error(`Error in onLeave for ${client.sessionId}:`, e);
      // Make sure we clean up the player
      const player = this.state.players.get(client.sessionId);
      if (player && player.chairIndex >= 0) {
        this.state.occupiedChairs[player.chairIndex] = false;
      }
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
  
  // Assign a new host if the current host leaves
  assignNewHost() {
    // Find another connected player to be the new host
    for (const [clientId, player] of this.state.players.entries()) {
      if (player.connected && !player.isHost) {
        // Mark this player as the new host
        player.isHost = true;
        this.state.hostId = clientId;
        console.log(`Assigned player ${clientId} as the new host (P${player.playerNumber})`);
        return;
      }
    }
    
    // If no other connected players, set hostId to null
    this.state.hostId = null;
    console.log('No players available to be host');
  }
  
  // Find an available chair for a new player
  findAvailableChair() {
    // First, try to find a completely unoccupied chair
    for (let i = 0; i < this.state.occupiedChairs.length; i++) {
      if (!this.state.occupiedChairs[i]) {
        return i;
      }
    }
    
    // If all chairs are marked as occupied, find one that doesn't have an active player
    // This handles cases where a player might have disconnected without properly freeing the chair
    const occupiedChairIndices = new Set();
    for (const player of this.state.players.values()) {
      if (player.connected && player.chairIndex >= 0) {
        occupiedChairIndices.add(player.chairIndex);
      }
    }
    
    // Check if there's any chair not actively occupied
    for (let i = 0; i < this.state.occupiedChairs.length; i++) {
      if (!occupiedChairIndices.has(i)) {
        // Mark it as available in our tracking array
        this.state.occupiedChairs[i] = false;
        return i;
      }
    }
    
    // No chair available - could return a random one or -1
    // For now, we'll return -1, which will place the player in a default position
    return -1;
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
        
        // Free up their chair
        if (player.chairIndex >= 0 && player.chairIndex < this.state.occupiedChairs.length) {
          this.state.occupiedChairs[player.chairIndex] = false;
          console.log(`Chair ${player.chairIndex} is now available after cleanup`);
        }
        
        // Remove from players list
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
