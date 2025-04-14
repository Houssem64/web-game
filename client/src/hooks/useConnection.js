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

export const useConnection = () => {
  // State
  const [room, setRoom] = useState(null);
  const [connectionState, setConnectionState] = useState(CONNECTION_STATE.DISCONNECTED);
  const [error, setError] = useState(null);
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

  // Connect to the Colyseus server
  const connect = useCallback(async () => {
    // Prevent multiple connection attempts
    if (hasConnected.current || connectionState === CONNECTION_STATE.CONNECTING) {
      return;
    }
    
    try {
      setConnectionState(CONNECTION_STATE.CONNECTING);
      
      // Create a Colyseus client if it doesn't exist
      if (!clientInstance) {
        clientInstance = new Client('ws://localhost:2567');
      }
      
      // Join the game room
      console.log('Attempting to join game room...');
      const gameRoom = await clientInstance.joinOrCreate('game_room');
      console.log('Successfully joined room with ID:', gameRoom.sessionId);
      
      setRoom(gameRoom);
      setConnectionState(CONNECTION_STATE.CONNECTED);
      hasConnected.current = true;
      
      // Set the current player ID
      setCurrentPlayerId(gameRoom.sessionId);
      
      // Handle player updates
      gameRoom.state.players.onAdd = (player, playerId) => {
        console.log('Player added:', playerId);
        addPlayer(playerId, {
          x: player.x,
          y: player.y,
          z: player.z,
          rotationY: player.rotationY
        });
        
        // Listen for changes to this player
        player.onChange = (changes) => {
          changes.forEach(change => {
            updatePlayer(playerId, { [change.field]: change.value });
          });
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
      
      return gameRoom;
    } catch (err) {
      console.error('Failed to connect:', err);
      setError(err.message);
      setConnectionState(CONNECTION_STATE.ERROR);
      hasConnected.current = false;
      return null;
    }
  }, [addPlayer, removePlayer, setCurrentPlayerId, updatePlayer, resetGame, connectionState]);

  // Clean up function
  useEffect(() => {
    return () => {
      if (room) {
        console.log('Component unmounting, leaving room');
        room.leave();
      }
    };
  }, [room]);

  return {
    client: clientInstance,
    room,
    connectionState,
    error,
    connect
  };
};
