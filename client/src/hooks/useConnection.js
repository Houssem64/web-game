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
  const hasConnected = useRef(false);
  
  // Access the game store
  const { 
    setPlayers, 
    addPlayer, 
    removePlayer, 
    updatePlayer, 
    setCurrentPlayerId,
    resetGame
  } = useGameStore();

  // Initialize connection to the Colyseus server without joining a room
  const initializeConnection = useCallback(async () => {
    try {
      // Create a Colyseus client if it doesn't exist
      if (!clientInstance) {
        console.log('Creating new Colyseus client');
        clientInstance = new Client('ws://localhost:2567');
      }
      return clientInstance;
    } catch (err) {
      console.error('Failed to initialize connection:', err);
      setError(err.message);
      throw err;
    }
  }, []);

  // Get available rooms
  const getAvailableRooms = useCallback(async () => {
    try {
      const client = await initializeConnection();
      const rooms = await client.getAvailableRooms('game_room');
      setAvailableRooms(rooms);
      return rooms;
    } catch (err) {
      console.error('Failed to get available rooms:', err);
      setError(err.message);
      throw err;
    }
  }, [initializeConnection]);

  // Create a new room with a specific name
  const createRoom = useCallback(async (roomName) => {
    try {
      setConnectionState(CONNECTION_STATE.CONNECTING);
      const client = await initializeConnection();
      
      // Create a new game room with the provided name
      console.log(`Creating new game room with name: ${roomName}`);
      const gameRoom = await client.create('game_room', { roomName });
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
      const gameRoom = await client.joinOrCreate('game_room');
      console.log('Successfully joined room with ID:', gameRoom.id);
      
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
    
    // Handle room events
    gameRoom.onMessage('game_event', (message) => {
      console.log('Game event received:', message);
    });
    
    // Handle disconnection
    gameRoom.onLeave((code) => {
      console.log('Left room. Code:', code);
      setConnectionState(CONNECTION_STATE.DISCONNECTED);
      hasConnected.current = false;
      setRoom(null);
      resetGame();
    });
  };

  // Clean up function - only leave room when the application is closed
  useEffect(() => {
    // Reconnect if needed at startup
    if (!hasConnected.current && connectionState === CONNECTION_STATE.DISCONNECTED) {
      connect();
    }
    
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
    getAvailableRooms,
    createRoom,
    joinRoomById
  };
};
