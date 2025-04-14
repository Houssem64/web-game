import React, { useState, useEffect } from 'react';
import { useConnection } from '../../hooks/useConnection';

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
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-75 z-50">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full">
        {menuState === 'main' && (
          <div className="flex flex-col space-y-6">
            <h1 className="text-3xl font-bold text-center text-white">3D Multiplayer Game</h1>
            <button 
              onClick={() => setMenuState('create')}
              className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg text-lg font-semibold"
            >
              Create New Game
            </button>
            <button 
              onClick={() => setMenuState('browse')}
              className="bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-lg text-lg font-semibold"
            >
              Browse Servers
            </button>
            <button 
              onClick={() => setMenuState('join')}
              className="bg-purple-600 hover:bg-purple-700 text-white py-3 px-6 rounded-lg text-lg font-semibold"
            >
              Join by Room ID
            </button>
          </div>
        )}

        {menuState === 'create' && (
          <div className="flex flex-col space-y-6">
            <h2 className="text-2xl font-bold text-center text-white">Create New Game</h2>
            <div>
              <label htmlFor="roomName" className="block text-sm font-medium text-gray-300 mb-1">
                Room Name
              </label>
              <input
                id="roomName"
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter a room name"
              />
            </div>
            {error && <p className="text-red-500">{error}</p>}
            <div className="flex space-x-4">
              <button 
                onClick={() => setMenuState('main')}
                className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg font-medium flex-1"
              >
                Back
              </button>
              <button 
                onClick={handleCreateRoom}
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium flex-1"
              >
                Create Room
              </button>
            </div>
          </div>
        )}

        {menuState === 'created' && (
          <div className="flex flex-col space-y-6">
            <h2 className="text-2xl font-bold text-center text-white">Room Created!</h2>
            <div>
              <p className="text-gray-300 mb-2">Share this Room ID with your friends:</p>
              <div className="flex">
                <input
                  type="text"
                  value={createdRoomId}
                  readOnly
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded-l-md focus:outline-none"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(createdRoomId);
                  }}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 rounded-r-md"
                >
                  Copy
                </button>
              </div>
            </div>
            <button 
              onClick={handleStartGame}
              className="bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-lg text-lg font-semibold"
            >
              Start Game
            </button>
          </div>
        )}

        {menuState === 'join' && (
          <div className="flex flex-col space-y-6">
            <h2 className="text-2xl font-bold text-center text-white">Join Game by ID</h2>
            <div>
              <label htmlFor="roomId" className="block text-sm font-medium text-gray-300 mb-1">
                Room ID
              </label>
              <input
                id="roomId"
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter the room ID"
              />
            </div>
            {error && <p className="text-red-500">{error}</p>}
            <div className="flex space-x-4">
              <button 
                onClick={() => setMenuState('main')}
                className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg font-medium flex-1"
              >
                Back
              </button>
              <button 
                onClick={handleJoinRoom}
                className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg font-medium flex-1"
              >
                Join Room
              </button>
            </div>
          </div>
        )}
        
        {menuState === 'browse' && (
          <div className="flex flex-col space-y-6">
            <h2 className="text-2xl font-bold text-center text-white">Browse Servers</h2>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Available games: {availableRooms.length}</span>
              <button 
                onClick={refreshRoomList}
                className="bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded text-sm"
                disabled={isLoadingRooms}
              >
                {isLoadingRooms ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
            
            <div className="bg-gray-900 rounded-md overflow-hidden max-h-64 overflow-y-auto">
              {isLoadingRooms ? (
                <div className="flex justify-center items-center py-8">
                  <p className="text-gray-400">Loading available servers...</p>
                </div>
              ) : availableRooms.length > 0 ? (
                <table className="w-full">
                  <thead className="bg-gray-800 text-gray-200 text-xs uppercase">
                    <tr>
                      <th className="px-4 py-2 text-left">Room Name</th>
                      <th className="px-4 py-2 text-center">Players</th>
                      <th className="px-4 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {availableRooms.map((room) => (
                      <tr 
                        key={room.roomId} 
                        className={`border-t border-gray-700 ${selectedRoom?.roomId === room.roomId ? 'bg-gray-700' : 'hover:bg-gray-800'}`}
                        onClick={() => setSelectedRoom(room)}
                      >
                        <td className="px-4 py-3 text-gray-300">{room.roomName}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${room.clients >= room.maxClients ? 'bg-red-900 text-red-200' : 'bg-green-900 text-green-200'}`}>
                            {room.clients} / {room.maxClients}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRoom(room);
                              if (room.clients < room.maxClients) {
                                handleJoinSelectedRoom();
                              } else {
                                setError('This room is full');
                              }
                            }}
                            disabled={room.clients >= room.maxClients}
                            className={`text-xs font-medium py-1 px-3 rounded ${room.clients >= room.maxClients ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                          >
                            {room.clients >= room.maxClients ? 'Full' : 'Join'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="flex justify-center items-center py-8">
                  <p className="text-gray-400">No servers available</p>
                </div>
              )}
            </div>
            
            {error && <p className="text-red-500">{error}</p>}
            
            <div className="flex space-x-4">
              <button 
                onClick={() => setMenuState('main')}
                className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg font-medium flex-1"
              >
                Back
              </button>
              <button 
                onClick={handleJoinSelectedRoom}
                disabled={!selectedRoom || selectedRoom.clients >= selectedRoom.maxClients}
                className={`py-2 px-4 rounded-lg font-medium flex-1 ${!selectedRoom || selectedRoom.clients >= selectedRoom.maxClients ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'}`}
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
