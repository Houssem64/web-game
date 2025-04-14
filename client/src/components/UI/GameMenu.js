import React, { useState, useEffect } from 'react';
import { useConnection } from '../../hooks/useConnection';
import { useGameStore } from '../../store/gameStore';
import './UI.css';

const GameMenu = ({ onStartGame }) => {
  const [menuState, setMenuState] = useState('main'); // main, create, join, browse
  const [roomName, setRoomName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [createdRoomId, setCreatedRoomId] = useState('');
  const [error, setError] = useState('');
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [playerReadyStatus, setPlayerReadyStatus] = useState({});
  
  const { createRoom, joinRoomById, getAvailableRooms, availableRooms, isLoadingRooms, room } = useConnection();
  const players = useGameStore(state => state.players);
  const currentPlayerId = useGameStore(state => state.currentPlayerId);
  
  // Get the current player and check if they're the host
  const currentPlayer = players?.[currentPlayerId];
  const isHost = currentPlayer?.isHost || false;
  
  // Calculate how many players are ready
  const totalPlayers = Object.keys(players || {}).length;
  
  // Count ready players correctly by checking each player's individual ready status
  const readyPlayers = Object.entries(players || {}).reduce((count, [playerId, player]) => {
    // Check if this player is marked as ready in the ready status
    const isPlayerReady = (
      playerReadyStatus[playerId] === true || 
      (player.playerNumber && playerReadyStatus[player.playerNumber] === true)
    );
    
    return isPlayerReady ? count + 1 : count;
  }, 0);
  
  // All players are ready only if there are multiple players and all of them are ready
  const allPlayersReady = totalPlayers >= 2 && readyPlayers === totalPlayers;
  
  // Fetch available rooms when the browse menu is opened
  useEffect(() => {
    if (menuState === 'browse') {
      refreshRoomList();
    }
  }, [menuState]);
  
  // Handle ready status messages
  useEffect(() => {
    if (!room) return;
    
    // Listen for player ready status updates
    const onReadyStatusUpdate = (data) => {
      console.log("Received ready status update:", data);
      
      // Create a copy of the current player ready status
      let updatedStatus = { ...playerReadyStatus };
      
      // Process the data object which contains player IDs or numbers as keys
      if (data && typeof data === 'object') {
        Object.entries(data).forEach(([key, value]) => {
          updatedStatus[key] = value;
        });
        
        setPlayerReadyStatus(updatedStatus);
        console.log("Updated player ready status:", updatedStatus);
      }
    };
    
    // Register for ready status updates
    room.onMessage("ready_status_update", onReadyStatusUpdate);
    
    // Send initial ready status when joining
    room.send("set_ready_status", { ready: isReady });
    
    return () => {
      if (room) {
        room.removeAllListeners("ready_status_update");
      }
    };
  }, [room, isReady]);
  
  // Listen for game start event from server
  useEffect(() => {
    if (!room) return;
    
    // Listen for game start event
    const onGameStarted = () => {
      console.log("Received game_started event from server");
      onStartGame();
    };
    
    // Register for game start updates
    room.onMessage("game_started", onGameStarted);
    
    return () => {
      if (room) {
        room.removeAllListeners("game_started");
      }
    };
  }, [room, onStartGame]);
  
  // Function to refresh the room list
  const refreshRoomList = async () => {
    try {
      setError('');
      await getAvailableRooms();
    } catch (err) {
      setError('Failed to fetch server list. Please try again.');
    }
  };

  const handleCreateRoom = async () => {
    try {
      setError('');
      if (!roomName.trim()) {
        setError('Please enter a room name');
        return;
      }
      
      const newRoomId = await createRoom(roomName);
      setCreatedRoomId(newRoomId);
      setMenuState('created');
    } catch (err) {
      setError(err.message || 'Failed to create room');
    }
  };

  const handleJoinRoom = async () => {
    try {
      setError('');
      if (!roomId.trim()) {
        setError('Please enter a room ID');
        return;
      }
      
      await joinRoomById(roomId);
    } catch (err) {
      setError(err.message || 'Failed to join room');
    }
  };
  
  // Join a room from the server browser
  const handleJoinSelectedRoom = async () => {
    try {
      setError('');
      if (!selectedRoom) {
        setError('Please select a room first');
        return;
      }
      
      // Check if room is full
      if (selectedRoom.clients >= selectedRoom.maxClients) {
        setError('This room is full');
        return;
      }
      
      await joinRoomById(selectedRoom.roomId);
    } catch (err) {
      setError(err.message || 'Failed to join room');
    }
  };

  const handleReadyToggle = () => {
    // Toggle the ready state
    const newReadyState = !isReady;
    setIsReady(newReadyState);
    
    // Send ready status to the server
    if (room) {
      console.log(`Sending ready status to server: ${newReadyState}`);
      room.send("set_ready_status", { ready: newReadyState });
    } else {
      console.error("Cannot send ready status - room is not connected");
    }
  };

  const handleStartGame = () => {
    if (isHost && allPlayersReady) {
      // Notify the server that the game should start
      // The server will broadcast a game_started event to all clients
      if (room) {
        console.log("Host sending start_game message to server");
        room.send("start_game");
        // Don't call onStartGame() directly here - wait for the server broadcast
      }
    }
  };

  // Render player status list for the ready up screen
  const renderPlayerStatusList = () => {
    try {
      if (!players || Object.keys(players || {}).length === 0) {
        return <p style={{ color: '#d1d5db', textAlign: 'center' }}>No players connected</p>;
      }
      
      console.log("Current players:", players);
      console.log("Current ready status:", playerReadyStatus);
      
      return (
        <div className="player-status-list">
          {Object.entries(players).map(([playerId, player]) => {
            if (!player) return null;
            
            // Check ready status by ID and player number
            const isPlayerReady = (
              playerReadyStatus[playerId] === true || 
              (player.playerNumber && playerReadyStatus[player.playerNumber] === true)
            );
            
            const isCurrentPlayer = playerId === currentPlayerId;
            
            return (
              <div key={playerId} className="player-status-item">
                <div className="player-name">
                  Player {player.playerNumber || '?'} {isCurrentPlayer ? "(You)" : ""} {player.isHost ? "👑" : ""}
                </div>
                <div className={`player-status ${isPlayerReady ? 'status-ready' : 'status-not-ready'}`}>
                  {isPlayerReady ? 'Ready' : 'Not Ready'}
                </div>
              </div>
            );
          })}
        </div>
      );
    } catch (err) {
      console.error("Error rendering player list:", err);
      return <p style={{ color: '#d1d5db', textAlign: 'center' }}>Error loading player list</p>;
    }
  };

  // Helper function to display a warning if not enough players
  const displayPlayersReadyWarning = () => {
    if (totalPlayers < 2) {
      return (
        <span style={{ color: '#f87171', display: 'block', marginTop: '4px', fontSize: '0.8em' }}>
          Need at least 2 players to start
        </span>
      );
    }
    return null;
  };

  return (
    <div className="game-menu-container">
      <div className="game-menu-panel">
        {menuState === 'main' && (
          <div className="menu-flex-col">
            <h1 className="menu-title">3D Multiplayer Game</h1>
            <button 
              onClick={() => setMenuState('create')}
              className="menu-btn menu-btn-blue"
            >
              Create New Game
            </button>
            <button 
              onClick={() => setMenuState('browse')}
              className="menu-btn menu-btn-green"
            >
              Browse Servers
            </button>
            <button 
              onClick={() => setMenuState('join')}
              className="menu-btn menu-btn-purple"
            >
              Join by Room ID
            </button>
          </div>
        )}

        {menuState === 'create' && (
          <div className="menu-flex-col">
            <h2 className="menu-subtitle">Create New Game</h2>
            <div>
              <label htmlFor="roomName" className="menu-input-label">
                Room Name
              </label>
              <input
                id="roomName"
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="menu-input"
                placeholder="Enter a room name"
              />
            </div>
            {error && <p className="menu-error">{error}</p>}
            <div className="menu-flex-row">
              <button 
                onClick={() => setMenuState('main')}
                className="menu-btn menu-btn-gray flex-1"
              >
                Back
              </button>
              <button 
                onClick={handleCreateRoom}
                className="menu-btn menu-btn-blue flex-1"
              >
                Create Room
              </button>
            </div>
          </div>
        )}

        {menuState === 'created' && (
          <div className="menu-flex-col">
            <h2 className="menu-subtitle">Room Created!</h2>
            <div>
              <p style={{ color: '#d1d5db', marginBottom: '0.5rem' }}>Share this Room ID with your friends:</p>
              <div style={{ display: 'flex' }}>
                <input
                  type="text"
                  value={createdRoomId}
                  readOnly
                  className="menu-input"
                  style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(createdRoomId);
                  }}
                  style={{ 
                    backgroundColor: '#4b5563', 
                    color: 'white', 
                    padding: '0.5rem 1rem',
                    borderTopRightRadius: '0.375rem',
                    borderBottomRightRadius: '0.375rem',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Copy
                </button>
              </div>
            </div>
            
            {/* Ready Up System */}
            <div className="ready-up-container">
              <div className="ready-up-title">Players Ready Status</div>
              
              {renderPlayerStatusList()}
              
              <button 
                id="ready-up-button"
                onClick={handleReadyToggle}
                className={`ready-button ${isReady ? 'ready-button-ready' : 'ready-button-not-ready'}`}
              >
                {isReady ? 'I\'m Ready!' : 'Ready Up'}
              </button>
              
              <div className="ready-count">
                {readyPlayers} of {totalPlayers} players ready
                {displayPlayersReadyWarning()}
              </div>
              
              {/* Debug info - can be removed in production */}
              <div style={{ fontSize: '10px', color: '#999', marginTop: '8px', borderTop: '1px solid #555', paddingTop: '8px' }}>
                <details>
                  <summary>Debug Info</summary>
                  <pre style={{ overflow: 'auto', maxHeight: '100px' }}>
                    {JSON.stringify({
                      readyStatus: playerReadyStatus,
                      currentPlayer: currentPlayerId,
                      isReady: isReady
                    }, null, 2)}
                  </pre>
                </details>
              </div>
              
              {isHost && (
                <div className="host-controls">
                  <button 
                    onClick={handleStartGame}
                    disabled={!allPlayersReady}
                    className="menu-btn menu-btn-green"
                    style={{ 
                      marginTop: '1rem',
                      opacity: allPlayersReady ? 1 : 0.5
                    }}
                  >
                    {allPlayersReady ? 'Start Game' : 'Waiting for all players...'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {menuState === 'join' && (
          <div className="menu-flex-col">
            <h2 className="menu-subtitle">Join Game by ID</h2>
            <div>
              <label htmlFor="roomId" className="menu-input-label">
                Room ID
              </label>
              <input
                id="roomId"
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="menu-input"
                placeholder="Enter the room ID"
              />
            </div>
            {error && <p className="menu-error">{error}</p>}
            <div className="menu-flex-row">
              <button 
                onClick={() => setMenuState('main')}
                className="menu-btn menu-btn-gray flex-1"
              >
                Back
              </button>
              <button 
                onClick={handleJoinRoom}
                className="menu-btn menu-btn-blue flex-1"
              >
                Join Room
              </button>
            </div>
            
            {/* Ready Up System (appears after joining) */}
            {room && (
              <div className="ready-up-container">
                <div className="ready-up-title">Players Ready Status</div>
                
                {renderPlayerStatusList()}
                
                <button 
                  id="ready-up-button"
                  onClick={handleReadyToggle}
                  className={`ready-button ${isReady ? 'ready-button-ready' : 'ready-button-not-ready'}`}
                >
                  {isReady ? 'I\'m Ready!' : 'Ready Up'}
                </button>
                
                <div className="ready-count">
                  {readyPlayers} of {totalPlayers} players ready
                  {displayPlayersReadyWarning()}
                </div>
                
                {/* Debug info - can be removed in production */}
                <div style={{ fontSize: '10px', color: '#999', marginTop: '8px', borderTop: '1px solid #555', paddingTop: '8px' }}>
                  <details>
                    <summary>Debug Info</summary>
                    <pre style={{ overflow: 'auto', maxHeight: '100px' }}>
                      {JSON.stringify({
                        readyStatus: playerReadyStatus,
                        currentPlayer: currentPlayerId,
                        isReady: isReady
                      }, null, 2)}
                    </pre>
                  </details>
                </div>
                
                {isHost && (
                  <div className="host-controls">
                    <button 
                      onClick={handleStartGame}
                      disabled={!allPlayersReady}
                      className="menu-btn menu-btn-green"
                      style={{ 
                        marginTop: '1rem',
                        opacity: allPlayersReady ? 1 : 0.5
                      }}
                    >
                      {allPlayersReady ? 'Start Game' : 'Waiting for all players...'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {menuState === 'browse' && (
          <div className="menu-flex-col">
            <h2 className="menu-subtitle">Server Browser</h2>
            <div style={{ 
              maxHeight: '240px', 
              overflowY: 'auto', 
              backgroundColor: '#1f2937',
              border: '1px solid #374151', 
              borderRadius: '0.375rem', 
              padding: '0.5rem' 
            }}>
              {isLoadingRooms ? (
                <p style={{ color: '#d1d5db', textAlign: 'center', padding: '1rem' }}>Loading servers...</p>
              ) : (
                availableRooms.length === 0 ? (
                  <p style={{ color: '#d1d5db', textAlign: 'center', padding: '1rem' }}>No active servers found.</p>
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {availableRooms.map((room) => (
                      <li 
                        key={room.roomId} 
                        onClick={() => setSelectedRoom(room)}
                        style={{ 
                          padding: '0.5rem', 
                          margin: '0.25rem 0',
                          backgroundColor: selectedRoom?.roomId === room.roomId ? '#3b82f6' : '#374151',
                          borderRadius: '0.25rem',
                          cursor: 'pointer'
                        }}
                      >
                        <p style={{ margin: 0, fontWeight: 'bold', color: 'white' }}>
                          {room.metadata?.name || room.metadata?.roomName || `Room ${room.roomId}`}
                        </p>
                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#d1d5db' }}>
                          Players: {room.clients}/{room.maxClients}
                        </p>
                      </li>
                    ))}
                  </ul>
                )
              )}
            </div>
            <div className="menu-flex-row">
              <button 
                onClick={refreshRoomList}
                className="menu-btn menu-btn-gray"
                style={{ flex: '0 0 auto' }}
              >
                Refresh
              </button>
              <button 
                onClick={() => setMenuState('main')}
                className="menu-btn menu-btn-gray flex-1"
              >
                Back
              </button>
              <button 
                onClick={handleJoinSelectedRoom}
                className="menu-btn menu-btn-blue flex-1"
                disabled={!selectedRoom}
                style={{ opacity: !selectedRoom ? 0.5 : 1 }}
              >
                Join Selected
              </button>
            </div>
            
            {/* Ready Up System (appears after joining) */}
            {room && (
              <div className="ready-up-container">
                <div className="ready-up-title">Players Ready Status</div>
                
                {renderPlayerStatusList()}
                
                <button 
                  id="ready-up-button"
                  onClick={handleReadyToggle}
                  className={`ready-button ${isReady ? 'ready-button-ready' : 'ready-button-not-ready'}`}
                >
                  {isReady ? 'I\'m Ready!' : 'Ready Up'}
                </button>
                
                <div className="ready-count">
                  {readyPlayers} of {totalPlayers} players ready
                  {displayPlayersReadyWarning()}
                </div>
                
                {/* Debug info - can be removed in production */}
                <div style={{ fontSize: '10px', color: '#999', marginTop: '8px', borderTop: '1px solid #555', paddingTop: '8px' }}>
                  <details>
                    <summary>Debug Info</summary>
                    <pre style={{ overflow: 'auto', maxHeight: '100px' }}>
                      {JSON.stringify({
                        readyStatus: playerReadyStatus,
                        currentPlayer: currentPlayerId,
                        isReady: isReady
                      }, null, 2)}
                    </pre>
                  </details>
                </div>
                
                {isHost && (
                  <div className="host-controls">
                    <button 
                      onClick={handleStartGame}
                      disabled={!allPlayersReady}
                      className="menu-btn menu-btn-green"
                      style={{ 
                        marginTop: '1rem',
                        opacity: allPlayersReady ? 1 : 0.5
                      }}
                    >
                      {allPlayersReady ? 'Start Game' : 'Waiting for all players...'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GameMenu;
