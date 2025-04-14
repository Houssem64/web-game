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
  // Add any additional player properties here
});

// Define the game state schema
class GameState extends Schema {
  constructor() {
    super();
    this.players = new MapSchema();
  }
}
defineTypes(GameState, {
  players: { map: Player }
});

class GameRoom extends Room {
  onCreate(options) {
    console.log("Game room created!", options);
    
    // Initialize the room state
    this.setState(new GameState());
    
    // Set the patch rate - how often to send updates to clients (in milliseconds)
    this.setPatchRate(50);
    
    // Set the simulation interval - how often to update the game state (in milliseconds)
    this.setSimulationInterval((deltaTime) => this.update(deltaTime), 16);
    
    // Handle messages from clients
    this.onMessage("move", (client, data) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.x = data.x;
        player.y = data.y;
        player.z = data.z;
        player.rotationY = data.rotationY;
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
    
    // Add the player to the game state
    this.state.players.set(client.sessionId, player);
  }
  
  onLeave(client, consented) {
    console.log("Client left:", client.sessionId);
    
    // Remove the player from the game state
    this.state.players.delete(client.sessionId);
  }
  
  update(deltaTime) {
    // Implement game logic here
    // This method is called at the simulation interval rate
  }
}

module.exports = {
  GameRoom
};
