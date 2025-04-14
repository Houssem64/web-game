const { Room } = require('colyseus');
const { Schema, MapSchema, ArraySchema, defineTypes } = require('@colyseus/schema');

// Define the Player schema for network synchronization
class Player extends Schema {
  constructor() {
    super();
    this.id = "";
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.rotationY = 0;
    this.chairIndex = -1;
    this.isHost = false;
    this.playerNumber = 0;
    this.connected = true;
    this.lastActive = Date.now();
    this.isReady = false;
    this.username = "";
    this.score = 0;
  }
}
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
  lastActive: "number",
  isReady: "boolean", // Whether the player is ready to start the game
  username: "string",
  score: "number"
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

// Quiz constants
const QUESTION_TIME = 20; // Seconds per question
const ROUNDS_BEFORE_ELIMINATION = 5;
const MAX_SCORE_PER_QUESTION = 1000;
const QUESTIONS = [
  {
    question: "What is the capital of France?",
    options: ["Berlin", "Paris", "London", "Madrid"],
    correctAnswer: 1 // 0-based index
  },
  {
    question: "Which planet is closest to the sun?",
    options: ["Venus", "Earth", "Mercury", "Mars"],
    correctAnswer: 2
  },
  {
    question: "Who painted the Mona Lisa?",
    options: ["Michelangelo", "Leonardo da Vinci", "Raphael", "Donatello"],
    correctAnswer: 1
  },
  {
    question: "What is the largest mammal?",
    options: ["Elephant", "Blue Whale", "Giraffe", "Hippopotamus"],
    correctAnswer: 1
  },
  {
    question: "What is the chemical symbol for gold?",
    options: ["Go", "Gl", "Gd", "Au"],
    correctAnswer: 3
  },
  {
    question: "Which country has the largest population?",
    options: ["India", "USA", "China", "Russia"],
    correctAnswer: 2
  },
  {
    question: "What is the largest organ in the human body?",
    options: ["Heart", "Liver", "Skin", "Brain"],
    correctAnswer: 2
  },
  {
    question: "Which famous scientist developed the theory of relativity?",
    options: ["Isaac Newton", "Albert Einstein", "Galileo Galilei", "Stephen Hawking"],
    correctAnswer: 1
  },
  {
    question: "What is the tallest mountain in the world?",
    options: ["K2", "Mount Everest", "Mount Kilimanjaro", "Matterhorn"],
    correctAnswer: 1
  },
  {
    question: "Which element has the chemical symbol 'O'?",
    options: ["Osmium", "Oxygen", "Oganesson", "Oregano"],
    correctAnswer: 1
  },
];

class GameRoom extends Room {
  // Store client activity timeouts
  clientTimeouts = {};
  
  // Chair positions for quick reference
  chairPositions = [];
  
  // Quiz game state
  currentRound = 0;
  currentQuestion = null;
  questionStartTime = null;
  playerAnswers = {};
  playerScores = {};
  roundInProgress = false;
  gamePhase = "waiting"; // waiting, quiz, elimination, finished
  eliminatedPlayers = [];
  questionTimer = null;
  usedQuestions = [];
  playerReadyStatus = {}; // Track players' ready status
  
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
      name: roomName,
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
    
    // Room events for clients to listen to
    this.onMessage("start_game", (client) => {
      // Only the host can start the game
      const player = this.state.players.get(client.sessionId);
      if (player && player.isHost) {
        console.log("Host started the game, broadcasting to all clients");
        // Broadcast to all clients that the game is starting
        this.broadcast("game_started", { started: true });
        // Start the game after a short delay to ensure all clients receive the message
        setTimeout(() => {
          this.startGame();
        }, 200);
      }
    });
    
    this.onMessage("submit_answer", (client, data) => {
      // Only accept answers if a question is active
      if (this.gamePhase === "quiz" && this.roundInProgress) {
        const timeTaken = Date.now() - this.questionStartTime;
        
        // Save the player's answer with timestamp
        this.playerAnswers[client.sessionId] = {
          answer: data.answer,
          timeTaken: timeTaken
        };
        
        // Check if all players have answered
        this.checkAllPlayersAnswered();
      }
    });
    
    // Handle player ready status updates
    this.onMessage("set_ready_status", (client, data) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        // Update player's ready status
        player.isReady = !!data.ready;
        this.playerReadyStatus[client.sessionId] = !!data.ready;
        
        // Broadcast updated ready status to all clients
        this.broadcastReadyStatus();
        
        console.log(`Player ${player.playerNumber} (${client.sessionId}) is now ${player.isReady ? 'ready' : 'not ready'}`);
        
        // Check if all players are ready to start the game
        if (this.areAllPlayersReady() && this.gamePhase === "waiting") {
          console.log("All players are ready! Game can start now.");
          this.broadcast("all_players_ready", { ready: true });
          
          // If auto-start is enabled, the host could start the game automatically here
          // For now, we'll just notify clients that everyone is ready
        }
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
    
    // Calculate player number based on chair index (P1-P4)
    // This ensures consistent player numbers regardless of join order
    player.playerNumber = chairIndex + 1;
    
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
    
    // Explicitly initialize player ready status 
    player.isReady = false;
    this.playerReadyStatus[client.sessionId] = false;
    
    // Broadcast updated ready status
    this.broadcastReadyStatus();
    
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
  
  // Helper methods for the quiz game
  startGame() {
    if (this.state.gameStarted) return;
    
    // Reset game state
    this.currentRound = 0;
    this.playerScores = {};
    this.eliminatedPlayers = [];
    this.usedQuestions = [];
    
    // Initialize scores for all connected players
    this.state.players.forEach((player, sessionId) => {
      this.playerScores[sessionId] = 0;
    });
    
    // Update game state
    this.state.gameStarted = true;
    this.gamePhase = "quiz";
    this.state.gamePhase = "quiz";
    
    // Start the first round
    this.startNextRound();
    
    // Notify all clients that the game has started
    this.broadcast("game_started");
    
    console.log("Game started!");
  }
  
  startNextRound() {
    // Check if we need to eliminate players
    if (this.currentRound > 0 && this.currentRound % ROUNDS_BEFORE_ELIMINATION === 0) {
      this.eliminateLowestScorer();
      return; // The next round will be started after elimination
    }
    
    this.currentRound++;
    this.state.currentRound = this.currentRound;
    this.roundInProgress = true;
    this.playerAnswers = {};
    
    // Select a random question that hasn't been used yet
    const availableQuestions = QUESTIONS.filter(q => !this.usedQuestions.includes(q));
    if (availableQuestions.length === 0) {
      // If we've used all questions, reset the used questions
      this.usedQuestions = [];
      this.currentQuestion = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
    } else {
      this.currentQuestion = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
    }
    
    // Mark this question as used
    this.usedQuestions.push(this.currentQuestion);
    
    // Update game state for clients
    this.state.currentQuestion = this.currentQuestion;
    this.state.timeRemaining = QUESTION_TIME;
    
    // Record start time for score calculation
    this.questionStartTime = Date.now();
    
    // Start the question timer
    this.questionTimer = this.clock.setTimeout(() => {
      this.endRound();
    }, QUESTION_TIME * 1000);
    
    // Notify clients about the new question
    this.broadcast("new_question", {
      question: this.currentQuestion.question,
      options: this.currentQuestion.options,
      timeLimit: QUESTION_TIME,
      round: this.currentRound
    });
    
    // Start countdown timer updates to clients
    this.startCountdown();
    
    console.log(`Round ${this.currentRound} started with question: ${this.currentQuestion.question}`);
  }
  
  startCountdown() {
    // Send time updates to clients every second
    let timeLeft = QUESTION_TIME;
    
    const updateTime = () => {
      if (timeLeft > 0 && this.roundInProgress) {
        timeLeft--;
        this.state.timeRemaining = timeLeft;
        
        // Schedule the next update
        this.clock.setTimeout(updateTime, 1000);
      }
    };
    
    // Start the countdown
    updateTime();
  }
  
  checkAllPlayersAnswered() {
    // Get active (non-eliminated) players
    const activePlayers = Array.from(this.state.players.keys())
      .filter(id => !this.eliminatedPlayers.includes(id));
    
    // Check if all active players have answered
    const allAnswered = activePlayers.every(id => this.playerAnswers[id] !== undefined);
    
    if (allAnswered) {
      // End the round early if everyone has answered
      if (this.questionTimer) {
        this.clock.clearTimeout(this.questionTimer);
      }
      this.endRound();
    }
  }
  
  endRound() {
    if (!this.roundInProgress) return;
    
    this.roundInProgress = false;
    
    // Calculate scores for this round
    const correctAnswer = this.currentQuestion.correctAnswer;
    const roundResults = {};
    
    // Calculate points for each player based on their answer and time taken
    this.state.players.forEach((player, sessionId) => {
      // Skip eliminated players
      if (this.eliminatedPlayers.includes(sessionId)) return;
      
      const playerAnswer = this.playerAnswers[sessionId];
      
      // If player didn't answer, they get 0 points
      if (!playerAnswer) {
        roundResults[sessionId] = {
          correct: false,
          answer: -1,
          timeTaken: QUESTION_TIME * 1000,
          points: 0
        };
        return;
      }
      
      // Check if answer is correct
      const isCorrect = playerAnswer.answer === correctAnswer;
      
      // Calculate points - faster answers get more points
      let points = 0;
      if (isCorrect) {
        // Maximum points for instant answer, decreasing to min points at time limit
        const timeRatio = Math.min(playerAnswer.timeTaken / (QUESTION_TIME * 1000), 1);
        points = Math.round(MAX_SCORE_PER_QUESTION * (1 - timeRatio * 0.7)); // At full time, still get 30% of max
      }
      
      // Update player's total score
      this.playerScores[sessionId] = (this.playerScores[sessionId] || 0) + points;
      
      // Store round results for this player
      roundResults[sessionId] = {
        correct: isCorrect,
        answer: playerAnswer.answer,
        timeTaken: playerAnswer.timeTaken,
        points: points
      };
    });
    
    // Send results to all clients
    this.broadcast("round_results", {
      correctAnswer: correctAnswer,
      playerResults: roundResults,
      scores: this.playerScores
    });
    
    // Check if the game is over
    if (this.getActivePlayers().length <= 1) {
      this.endGame();
    } else {
      // Start the next round after a delay
      this.clock.setTimeout(() => {
        this.startNextRound();
      }, 5000); // 5 seconds between rounds
    }
    
    console.log(`Round ${this.currentRound} ended. Scores:`, this.playerScores);
  }
  
  eliminateLowestScorer() {
    // Change phase to elimination
    this.gamePhase = "elimination";
    this.state.gamePhase = "elimination";
    
    // Get currently active players
    const activePlayers = this.getActivePlayers();
    
    if (activePlayers.length <= 1) {
      // Game is over, declare the remaining player as winner
      this.endGame();
      return;
    }
    
    // Find player with lowest score
    let lowestScore = Infinity;
    let lowestScorer = null;
    
    activePlayers.forEach(id => {
      const score = this.playerScores[id] || 0;
      if (score < lowestScore) {
        lowestScore = score;
        lowestScorer = id;
      }
    });
    
    if (lowestScorer) {
      // Add player to eliminated list
      this.eliminatedPlayers.push(lowestScorer);
      this.state.eliminatedPlayers.push(lowestScorer);
      
      // Get player data for the eliminated player
      const eliminatedPlayer = this.state.players.get(lowestScorer);
      
      // Send elimination notification to all clients
      this.broadcast("player_eliminated", {
        playerId: lowestScorer,
        playerNumber: eliminatedPlayer.playerNumber,
        score: lowestScore
      });
      
      console.log(`Player ${lowestScorer} (P${eliminatedPlayer.playerNumber}) eliminated with score ${lowestScore}`);
      
      // Start next round after a delay
      this.clock.setTimeout(() => {
        this.gamePhase = "quiz";
        this.state.gamePhase = "quiz";
        this.startNextRound();
      }, 5000); // 5 seconds to show elimination
    }
  }
  
  endGame() {
    // Get the winner (last remaining player)
    const activePlayers = this.getActivePlayers();
    
    if (activePlayers.length === 1) {
      const winnerId = activePlayers[0];
      const winner = this.state.players.get(winnerId);
      
      // Set game phase to finished
      this.gamePhase = "finished";
      this.state.gamePhase = "finished";
      
      // Notify all clients about the winner
      this.broadcast("game_over", {
        winnerId: winnerId,
        winnerNumber: winner.playerNumber,
        winnerScore: this.playerScores[winnerId] || 0
      });
      
      console.log(`Game over! Player ${winnerId} (P${winner.playerNumber}) wins with score ${this.playerScores[winnerId] || 0}`);
    } else {
      // No winner (could be a tie or everyone eliminated)
      this.broadcast("game_over", { tie: true });
      console.log("Game over with no clear winner!");
    }
    
    // Reset game state after a delay
    this.clock.setTimeout(() => {
      this.state.gameStarted = false;
      this.state.gamePhase = "waiting";
      this.gamePhase = "waiting";
      this.currentRound = 0;
      this.state.currentRound = 0;
      this.eliminatedPlayers = [];
      this.state.eliminatedPlayers = [];
    }, 10000); // 10 seconds to show end game screen
  }
  
  getActivePlayers() {
    // Return array of player IDs who haven't been eliminated
    return Array.from(this.state.players.keys())
      .filter(id => !this.eliminatedPlayers.includes(id));
  }
  
  broadcastScoreboard() {
    // Create scoreboard data
    const scoreboard = [];
    this.state.players.forEach((player, sessionId) => {
      scoreboard.push({
        playerNumber: player.playerNumber,
        username: player.username,
        score: player.score,
      });
    });
    
    // Sort by score (descending)
    scoreboard.sort((a, b) => b.score - a.score);
    
    // Broadcast to all clients
    this.broadcast("scoreboard_update", { scoreboard });
  }
  
  // Broadcast ready status of all players to all clients
  broadcastReadyStatus() {
    // Create a clean object to store ready status
    const readyStatus = {};
    
    // Iterate through all players and record their ready status
    this.state.players.forEach((player, sessionId) => {
      if (player) {
        // Store by session ID
        readyStatus[sessionId] = !!player.isReady;
        
        // Also store by player number for easier client-side handling
        if (typeof player.playerNumber === 'number') {
          readyStatus[player.playerNumber] = !!player.isReady;
        }
      }
    });
    
    // Keep track of ready status locally for reference
    this.playerReadyStatus = { ...readyStatus };
    
    // Debug log
    console.log("Broadcasting ready status:", readyStatus);
    
    // Broadcast to all connected clients
    this.broadcast("ready_status_update", readyStatus);
  }
  
  // Check if all players are ready
  areAllPlayersReady() {
    let readyCount = 0;
    let totalCount = 0;
    
    this.state.players.forEach((player) => {
      // Only count connected players
      if (player.connected) {
        totalCount++;
        
        if (player.isReady) {
          readyCount++;
        }
      }
    });
    
    console.log(`Ready check: ${readyCount}/${totalCount} players ready`);
    
    // Make sure we have at least 2 players and all are ready
    return totalCount >= 2 && readyCount === totalCount;
  }
}

module.exports = {
  GameRoom
};
