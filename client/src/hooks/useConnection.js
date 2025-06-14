import { useState, useCallback, useEffect, useRef } from 'react';
import { Client } from 'colyseus.js';
import { useGameStore } from '../store/gameStore';

// Connection states
export const CONNECTION_STATE = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  ERROR: 'error'
};

// Create a single client instance to be reused
let clientInstance = null;
let roomInstance = null;

export const useConnection = () => {
  // State
  const [room, setRoom] = useState(null);
  const [connectionState, setConnectionState] = useState(CONNECTION_STATE.DISCONNECTED);
  const [error, setError] = useState(null);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const hasConnected = useRef(false);
  
  // Access the game store
  const { 
    setPlayers, 
    addPlayer, 
    removePlayer, 
    updatePlayer, 
    setCurrentPlayerId,
    resetGame,
    setGamePhase,
    setCurrentRound,
    setCurrentQuestion,
    setTimeRemaining,
    updateGameState,
    setAnnouncement
  } = useGameStore();

  // Initialize connection to the Colyseus server without joining a room
  const initializeConnection = useCallback(async () => {
    try {
      // Create a Colyseus client if it doesn't exist
      if (!clientInstance) {
        console.log('Creating new Colyseus client');
        // Update the server URL to use the current window's hostname
        // This ensures it works both locally and when deployed
        const getServerUrl = () => {
          // Use window location hostname but with the server port
          const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          const host = window.location.hostname;
          // Use the same port as the current URL if in production, otherwise use server port
          const port = process.env.NODE_ENV === 'production' ? window.location.port : 2567;
          
          const serverUrl = port ? `${protocol}//${host}:${port}` : `${protocol}//${host}`;
          console.log(`Using server URL: ${serverUrl}`);
          return serverUrl;
        };
        
        // Then in initializeConnection:
        clientInstance = new Client(getServerUrl(), {
          reconnect: true,
          reconnectInterval: 1000,
          maxReconnectAttempts: 10
        });
      }
      return clientInstance;
    } catch (err) {
      console.error('Failed to initialize connection:', err);
      setError(err.message);
      throw err;
    }
  }, []);

  // Get available rooms with detailed information
  const getAvailableRooms = useCallback(async () => {
    try {
      setIsLoadingRooms(true);
      const client = await initializeConnection();
      const rooms = await client.getAvailableRooms('game_room');
      
      // Format room data for display with additional information
      const formattedRooms = rooms.map(room => ({
        roomId: room.roomId,
        roomName: room.metadata?.roomName || 'Unnamed Room',
        clients: room.clients || 0,  // Current player count
        maxClients: 4,               // Max 4 players per room
        createdAt: room.metadata?.createdAt || Date.now(),
        locked: room.metadata?.locked || false
      }));
      
      console.log('Available rooms:', formattedRooms);
      setAvailableRooms(formattedRooms);
      return formattedRooms;
    } catch (err) {
      console.error('Failed to get available rooms:', err);
      setError(err.message);
      setAvailableRooms([]);
      throw err;
    } finally {
      setIsLoadingRooms(false);
    }
  }, [initializeConnection]);

  // Create a new room with a specific name
  const createRoom = useCallback(async (roomName) => {
    try {
      setConnectionState(CONNECTION_STATE.CONNECTING);
      const client = await initializeConnection();
      
      // Create a new game room with the provided name
      console.log(`Creating new game room with name: ${roomName}`);
      const gameRoom = await client.create('game_room', { 
        roomName,
        createdByPlayer: true  // Mark this room as created by a player
      });
      console.log('Successfully created room with ID:', gameRoom.id);
      
      // Set up the room
      setupRoom(gameRoom);
      
      return gameRoom.id;
    } catch (err) {
      console.error('Failed to create room:', err);
      setConnectionState(CONNECTION_STATE.ERROR);
      setError(err.message);
      throw err;
    }
  }, [initializeConnection]);

  // Join a room by its ID
  const joinRoomById = useCallback(async (roomId) => {
    try {
      setConnectionState(CONNECTION_STATE.CONNECTING);
      const client = await initializeConnection();
      
      // Join the specific room by ID
      console.log(`Joining game room with ID: ${roomId}`);
      const gameRoom = await client.joinById(roomId);
      console.log('Successfully joined room:', gameRoom.id);
      
      // Set up the room
      setupRoom(gameRoom);
      
      return gameRoom;
    } catch (err) {
      console.error('Failed to join room:', err);
      setConnectionState(CONNECTION_STATE.ERROR);
      setError(err.message);
      throw err;
    }
  }, [initializeConnection]);

  // Connect to the default game room (legacy method)
  const connect = useCallback(async () => {
    // If we already have a room, don't create a new connection
    if (roomInstance && roomInstance.connection.isOpen) {
      console.log('Already connected to a room, reusing existing connection');
      setRoom(roomInstance);
      setConnectionState(CONNECTION_STATE.CONNECTED);
      return roomInstance;
    }
    
    // Prevent multiple connection attempts
    if (hasConnected.current || connectionState === CONNECTION_STATE.CONNECTING) {
      return;
    }
    
    try {
      setConnectionState(CONNECTION_STATE.CONNECTING);
      const client = await initializeConnection();
      
      // Join any available game room
      console.log('Attempting to join any available game room...');
      
      // IMPORTANT: Explicitly create the room with createdByPlayer flag
      // This prevents the issue of automatically joining existing rooms
      const gameRoom = await client.create('game_room', {
        roomName: 'Custom Game',
        createdByPlayer: true // Mark this room as created by a player
      });
      
      console.log('Successfully created room with ID:', gameRoom.id);
      
      // Set up the room
      setupRoom(gameRoom);
      
      return gameRoom;
    } catch (err) {
      console.error('Failed to connect:', err);
      setConnectionState(CONNECTION_STATE.ERROR);
      setError(err.message);
      return null;
    }
  }, [initializeConnection, connectionState]);

  // Common room setup function
  const setupRoom = (gameRoom) => {
    // Store the room instance globally
    roomInstance = gameRoom;
    
    setRoom(gameRoom);
    setConnectionState(CONNECTION_STATE.CONNECTED);
    hasConnected.current = true;
    console.log('[Connection] Room joined and connection state set to CONNECTED. Room:', gameRoom.id, 'Session:', gameRoom.sessionId);
      
    // Set the current player ID
    setCurrentPlayerId(gameRoom.sessionId);
    
    // Handle player updates
    gameRoom.state.players.onAdd = (player, playerId) => {
      console.log('Player added:', playerId, player);
      addPlayer(playerId, {
        x: player.x,
        y: player.y,
        z: player.z,
        rotationY: player.rotationY,
        playerNumber: player.playerNumber,
        isHost: player.isHost,
        chairIndex: player.chairIndex,
        connected: player.connected
      });
      
      // Listen for changes to this player
      player.onChange = (changes) => {
        // Log changes for debugging
        console.log(`Player ${playerId} changed:`, changes);
        
        // Build a single update with all changed fields
        const updates = {};
        changes.forEach(change => {
          updates[change.field] = change.value;
        });
        
        // Apply all updates at once
        updatePlayer(playerId, updates);
      };
    };
    
    // Handle player removals
    gameRoom.state.players.onRemove = (player, playerId) => {
      console.log('Player removed:', playerId);
      removePlayer(playerId);
    };
    
    // Handle game state changes
    gameRoom.state.listen("gamePhase", (newValue) => {
      console.log("Game phase changed:", newValue);
      setGamePhase(newValue);
    });
    
    gameRoom.state.listen("currentRound", (newValue) => {
      console.log("Current round changed:", newValue);
      setCurrentRound(newValue);
    });
    
    gameRoom.state.listen("currentQuestion", (newValue) => {
      console.log("Current question received from state:", newValue);
      if (newValue) {
        try {
          // Ensure the question object has all required properties
          const questionData = {
            question: newValue.question || "Question not provided",
            options: Array.isArray(newValue.options) ? newValue.options : ["Option A", "Option B", "Option C", "Option D"],
            correctAnswer: typeof newValue.correctAnswer === 'number' ? newValue.correctAnswer : 0
          };
          
          setCurrentQuestion(questionData);
          console.log("Set current question in game store:", questionData);
        } catch (error) {
          console.error("Error processing question data:", error);
        }
      }
    });
    
    gameRoom.state.listen("timeRemaining", (newValue) => {
      setTimeRemaining(newValue);
    });
    
    gameRoom.state.listen("eliminatedPlayers", (newValue) => {
      console.log("Eliminated players changed:", newValue);
      // As this is an array we need to copy it
      const eliminatedPlayersArray = [...newValue];
      updateGameState({ eliminatedPlayers: eliminatedPlayersArray });
    });
    
    // Handle specific game events
    gameRoom.onMessage("game_announcement", (data) => {
      console.log('Game announcement received - ignoring since announcement phase was removed');
      // No longer update announcement or phase - the game will go directly to quiz
    });
    
    // Handle new questions
    gameRoom.onMessage("new_question", (data) => {
      console.log('New question message received:', data);
      
      if (data && data.question && data.options) {
        const questionData = {
          question: data.question,
          options: data.options,
          correctAnswer: data.correctAnswer || 0
        };
        
        // Update game phase to quiz directly
        setGamePhase("quiz");
        
        // Then update the question
        setCurrentQuestion(questionData);
        console.log("Updated question from message:", questionData);
      } else {
        console.error("Invalid question data received:", data);
        
        // Fallback data if server sends malformed question
        const fallbackQuestion = {
          question: "Sample question - server data was invalid",
          options: ["Option A", "Option B", "Option C", "Option D"],
          correctAnswer: 0
        };
        
        setCurrentQuestion(fallbackQuestion);
        setGamePhase("quiz");
      }
    });
    
    // Handle room events
    gameRoom.onMessage("game_event", (message) => {
      console.log('Game event received:', message);
    });
    
    // Handle disconnection
    gameRoom.onLeave((code) => {
      console.log('[Connection] Left room. Code:', code);
      setConnectionState(CONNECTION_STATE.DISCONNECTED);
      hasConnected.current = false;
      setRoom(null);
      resetGame();
      
      // Clear the roomInstance reference when we leave
      roomInstance = null;
      
      // If the disconnection was unexpected (code >= 1000), attempt to reconnect
      if (code >= 1000 && code < 4000) {
        console.log(`[Connection] Unexpected disconnection with code ${code}, attempting to reconnect...`);
        // Wait a moment before trying to reconnect
        setTimeout(() => {
          connect().catch(err => {
            console.error('[Connection] Reconnection attempt failed:', err);
          });
        }, 3000);
      }
    });
    
    // Set up a more robust heartbeat system
    let heartbeatInterval = null;
    
    const startHeartbeat = () => {
      // Clear any existing interval first
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      
      // Send heartbeat every 15 seconds (reduced from 30s)
      heartbeatInterval = setInterval(() => {
        if (gameRoom.connection.isOpen) {
          console.log('Sending heartbeat to server...');
          gameRoom.send('heartbeat', {});
        } else {
          console.log('Connection closed, clearing heartbeat interval');
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
          
          // Update connection state to reflect disconnection
          setConnectionState(CONNECTION_STATE.DISCONNECTED);
          
          // Don't set room to null here - let onLeave handle that
        }
      }, 15000);
    };
    
    // Start the heartbeat immediately
    startHeartbeat();
    // Listen for low-level connection events (for extra robustness)
    if (gameRoom.connection) {
      gameRoom.connection.onopen = () => {
        console.log('[Connection] WebSocket connection opened.');
        setConnectionState(CONNECTION_STATE.CONNECTED);
      };
      gameRoom.connection.onclose = (event) => {
        console.log('[Connection] WebSocket closed:', event);
        setConnectionState(CONNECTION_STATE.DISCONNECTED);
      };
      gameRoom.connection.onerror = (event) => {
        console.error('[Connection] WebSocket error:', event);
        setConnectionState(CONNECTION_STATE.ERROR);
      };
    }
    
    // Also set up a connection state change listener
    gameRoom.onStateChange((state) => {
      console.log("Room state changed:", state);
    });
    
    // Add error handler
    gameRoom.onError((err) => {
      console.error('[Connection] Room connection error:', err);
      setError(err.message || 'Unknown connection error');
      setConnectionState(CONNECTION_STATE.ERROR);
    });
  };

  // Clean up function - only leave room when the application is closed
  useEffect(() => {
    // We no longer auto-connect at startup to prevent unwanted connections
    // if (!hasConnected.current && connectionState === CONNECTION_STATE.DISCONNECTED) {
    //   connect();
    // }
    
    // Add window beforeunload event to properly clean up
    const handleBeforeUnload = () => {
      if (roomInstance) {
        console.log('Application closing, leaving room');
        roomInstance.leave();
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Don't automatically leave the room when the component unmounts
      // Only leave when the application is actually closing
    };
  }, [connect, connectionState]);

  return {
    client: clientInstance,
    room,
    connectionState,
    error,
    connect,
    availableRooms,
    isLoadingRooms,
    getAvailableRooms,
    createRoom,
    joinRoomById
  };
};
