import React, { useState, useEffect } from 'react';
import { useConnection } from '../../hooks/useConnection';
import './UI.css';

const GameMenu = ({ onStartGame }) => {
  const [menuState, setMenuState] = useState('main'); // main, create, join, browse
  const [roomName, setRoomName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [createdRoomId, setCreatedRoomId] = useState('');
  const [error, setError] = useState('');
  const [selectedRoom, setSelectedRoom] = useState(null);
  const { createRoom, joinRoomById, getAvailableRooms, availableRooms, isLoadingRooms } = useConnection();
  
  // Fetch available rooms when the browse menu is opened
  useEffect(() => {
    if (menuState === 'browse') {
      refreshRoomList();
    }
  }, [menuState]);
  
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
      onStartGame();
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
      onStartGame();
    } catch (err) {
      setError(err.message || 'Failed to join room');
    }
  };

  const handleStartGame = () => {
    onStartGame();
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
            <button 
              onClick={handleStartGame}
              className="menu-btn menu-btn-green"
            >
              Start Game
            </button>
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
                        <p style={{ margin: 0, fontWeight: 'bold', color: 'white' }}>{room.metadata.name}</p>
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
          </div>
        )}
      </div>
    </div>
  );
};

export default GameMenu;
