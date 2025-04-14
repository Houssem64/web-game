import React, { useState } from 'react';
import { useConnection } from '../../hooks/useConnection';

const GameMenu = ({ onStartGame }) => {
  const [menuState, setMenuState] = useState('main'); // main, create, join
  const [roomName, setRoomName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [createdRoomId, setCreatedRoomId] = useState('');
  const [error, setError] = useState('');
  const { createRoom, joinRoomById } = useConnection();

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
              onClick={() => setMenuState('join')}
              className="bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-lg text-lg font-semibold"
            >
              Join Game
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
            <h2 className="text-2xl font-bold text-center text-white">Join Game</h2>
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
      </div>
    </div>
  );
};

export default GameMenu;
