const { Room } = require('colyseus');
const { Schema, MapSchema, ArraySchema, defineTypes } = require('@colyseus/schema');

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
    // Initialize as an ArraySchema for proper synchronization
    this.occupiedChairs = new ArraySchema(false, false, false, false);
  }
}

// Define types for GameState schema
defineTypes(GameState, {
  players: { map: Player },
  roomId: "string",
  roomName: "string",
  createdAt: "number",
  hostId: "string",
  nextPlayerNumber: "number",
  occupiedChairs: { array: "boolean" }
});

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
    const roomName = options?.roomName || `Game ${this.roomId}`;
    
    // Set the name in state AND in room metadata (for listings)
    this.state.roomName = roomName;
    
    // This is crucial: set metadata for room listings
    this.setMetadata({
      roomName: roomName,
      createdAt: Date.now(),
      maxPlayers: 4,
      createdByPlayer: options.createdByPlayer || false
    });
    
    console.log(`Room created with name: "${roomName}" (visible in listings)`);
    
    // Only register the room if it was explicitly created by a player or with specific options
    if (!options || (!options.createdByPlayer && Object.keys(options).length <= 1)) {
      console.log("Room was auto-created without explicit player request. Will be disposed shortly.");
      // Set a short timeout to dispose this room since it was auto-created
      setTimeout(() => {
        console.log(`Auto-disposing room ${this.roomId} that was not created by a player`);
        try {
          this.disconnect();
        } catch (e) {
          console.error(`Error disposing auto-created room: ${e.message}`);
        }
      }, 100);
      return; // Skip further initialization for auto-created rooms
    }
    
    console.log(`Room ${this.roomId} with name "${roomName}" registered as active (created by player: ${options.createdByPlayer})`);
    
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
    
    // Validate chair occupancy before assigning a new chair
    this.validateChairOccupancy();
    
    // For the host, ensure chair 0 is available and assign it
    // For other players, find any available chair
    let chairIndex;
    if (isFirstPlayer) {
      // Make sure chair 0 is not already occupied
      if (!this.state.occupiedChairs[0]) {
        chairIndex = 0;
      } else {
        // If somehow chair 0 is already taken, find another one
        chairIndex = this.findAvailableChair();
      }
    } else {
      // Find any available chair for non-host players
      chairIndex = this.findAvailableChair();
    }
    
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
    
    // Log chair assignments for debug purposes
    console.log(`Current chair occupancy before assignment: ${JSON.stringify(this.state.occupiedChairs)}`);
    
    // Set player position and rotation based on their assigned chair
    if (chairIndex !== -1) {
      const chairData = CHAIR_POSITIONS[chairIndex];
      
      // Set position and rotation
      player.x = chairData.position[0];
      player.y = chairData.position[1];
      player.z = chairData.position[2];
      player.rotationY = chairData.rotation;
      
      // Ensure values are properly initialized as numbers
      if (isNaN(player.x)) player.x = 0;
      if (isNaN(player.y)) player.y = 0;
      if (isNaN(player.z)) player.z = 0;
      if (isNaN(player.rotationY)) player.rotationY = 0;
      
      // Mark this chair as occupied
      this.state.occupiedChairs[chairIndex] = true;
      console.log(`Player ${client.sessionId} assigned to chair ${chairIndex} (P${player.playerNumber}) at position: [${player.x}, ${player.y}, ${player.z}]`);
    } else {
      // No chairs available, place the player in a default position
      // Try to find a position not on top of the table or other players
      player.x = 3 * (Math.random() - 0.5); // Random position around the table
      player.y = 0;
      player.z = 3 * (Math.random() - 0.5);
      player.rotationY = Math.random() * Math.PI * 2; // Random rotation
      console.log(`No chairs available for player ${client.sessionId} (P${player.playerNumber}). Using random position: [${player.x}, ${player.y}, ${player.z}]`);
    }
    
    // Log complete player state for debugging
    console.log(`Player state for ${client.sessionId}:`, {
      position: [player.x, player.y, player.z],
      rotation: player.rotationY,
      playerNumber: player.playerNumber,
      isHost: player.isHost,
      chairIndex: player.chairIndex
    });
    
    // Log final chair assignments
    console.log(`Chair occupancy after assignment: ${JSON.stringify(this.state.occupiedChairs)}`);
    
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
  
  // Set timeout to mark player as inactive if no activity
  setClientTimeout(clientId) {
    // Clear any existing timeout
    if (this.clientTimeouts[clientId]) {
      clearTimeout(this.clientTimeouts[clientId]);
    }
    
    // Set a new timeout - increasing from default to 5 minutes (300000ms)
    // This prevents players from being marked inactive too quickly
    this.clientTimeouts[clientId] = setTimeout(() => {
      console.log(`Client ${clientId} marked as inactive due to timeout`);
      const player = this.state.players.get(clientId);
      if (player) {
        player.connected = false; // Just mark as disconnected but don't remove yet
      }
      
      // Don't auto-cleanup inactive players for testing purposes
      // this.cleanupInactiveClients();
    }, 300000);
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
    // Log current chair occupancy for debugging
    console.log(`Finding available chair, current occupancy: ${JSON.stringify(this.state.occupiedChairs)}`);
    
    // First, verify the occupiedChairs array against actual player assignments
    this.validateChairOccupancy();
    
    // Try to find a completely unoccupied chair
    for (let i = 0; i < this.state.occupiedChairs.length; i++) {
      if (!this.state.occupiedChairs[i]) {
        console.log(`Found available chair at index ${i}`);
        return i;
      }
    }
    
    // If we reach here, all chairs are marked as occupied
    // Maybe there are disconnected players we can replace
    console.log("All chairs marked as occupied, checking for inactive players...");
    
    // Check which chairs are occupied by active players
    const activelyOccupiedChairs = new Set();
    for (const player of this.state.players.values()) {
      if (player.connected && player.chairIndex >= 0 && player.chairIndex < this.state.occupiedChairs.length) {
        activelyOccupiedChairs.add(player.chairIndex);
        console.log(`Chair ${player.chairIndex} is actively occupied by player ${player.id}`);
      }
    }
    
    // Find a chair that's marked as occupied but doesn't actually have an active player
    for (let i = 0; i < this.state.occupiedChairs.length; i++) {
      if (!activelyOccupiedChairs.has(i)) {
        // This chair is not actually occupied by an active player
        console.log(`Chair ${i} was marked as occupied but has no active player, making it available`);
        this.state.occupiedChairs[i] = false; // Mark it as available
        return i;
      }
    }
    
    // Still no chair available
    console.log("No available chairs found, returning -1");
    return -1; // Will place the player in a random position
  }
  
  // Validate and correct chair occupancy state
  validateChairOccupancy() {
    // Reset occupancy based on actual player data
    const newOccupancy = [false, false, false, false];
    
    // Check each player and mark their chair as occupied
    this.state.players.forEach((player, sessionId) => {
      if (player.chairIndex >= 0 && player.chairIndex < 4 && player.connected) {
        newOccupancy[player.chairIndex] = true;
      }
    });
    
    // Update the occupancy state
    for (let i = 0; i < 4; i++) {
      this.state.occupiedChairs[i] = newOccupancy[i];
    }
    
    console.log(`Chair occupancy validated: ${JSON.stringify(this.state.occupiedChairs)}`);
  }
  
  // Cleanup function to remove inactive clients periodically
  cleanupInactiveClients() {
    try {
      console.log("Running cleanup of inactive clients...");
      
      // Temporary disable for testing - just log instead of removing
      const inactiveClients = [];
      
      this.state.players.forEach((player, sessionId) => {
        // Check last activity time
        const now = Date.now();
        const inactiveTime = now - player.lastActive;
        
        // If player hasn't been active for over 5 minutes, consider inactive
        if (inactiveTime > 300000 && player.connected === false) {
          console.log(`Player ${sessionId} inactive for ${Math.floor(inactiveTime / 1000)} seconds`);
          inactiveClients.push(sessionId);
        }
      });
      
      // Just log how many would be cleaned up, but don't actually do it for testing
      if (inactiveClients.length > 0) {
        console.log(`Found ${inactiveClients.length} inactive clients that would be cleaned up`);
      }
      
      // Disabled for testing
      /*
      // Cleanup inactive clients
      let cleanedUp = 0;
      inactiveClients.forEach(sessionId => {
        // Get the player's chair index before removal
        const player = this.state.players.get(sessionId);
        if (player && player.chairIndex >= 0 && player.chairIndex < this.state.occupiedChairs.length) {
          // Mark the chair as available
          this.state.occupiedChairs[player.chairIndex] = false;
          console.log(`Chair ${player.chairIndex} is now available after cleanup`);
        }
        
        this.state.players.delete(sessionId);
        cleanedUp++;
      });
      
      if (cleanedUp > 0) {
        console.log(`Cleaned up ${cleanedUp} inactive clients`);
      }
      */
      
    } catch (error) {
      console.error("Error in cleanupInactiveClients:", error);
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
