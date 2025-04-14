import { useEffect, Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera, PointerLockControls, Environment, Stats } from '@react-three/drei';
import { useGameStore } from './store/gameStore';
import { ConnectionStatus } from './components/UI/ConnectionStatus';
import { useConnection } from './hooks/useConnection';
import GameMenu from './components/UI/GameMenu';
import Room from './components/Room';
import Table from './components/Table';
import Chair from './components/Chair';
import RemotePlayer from './components/RemotePlayer';

function App() {
  const { connectionState, connect, room } = useConnection();
  const players = useGameStore((state) => state.players);
  const currentPlayerId = useGameStore((state) => state.currentPlayerId);
  const [showMenu, setShowMenu] = useState(true); // Start with menu visible
  
  // We no longer auto-connect on mount - the menu handles connections now
  useEffect(() => {
    // Listen for keyboard events to toggle menu
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowMenu(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle starting the game from the menu
  const handleStartGame = () => {
    setShowMenu(false);
  };

  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      {/* Show the game menu or the 3D game */}
      {showMenu ? (
        <GameMenu onStartGame={handleStartGame} />
      ) : (
        <>
          {/* Connection status UI */}
          <ConnectionStatus status={connectionState} />
          
          {/* Main 3D Canvas */}
          <Canvas shadows>
        <Suspense fallback={null}>
          {/* First-person camera - position will be set by the Chair component */}
          <PerspectiveCamera makeDefault position={[0, 0, 5]} fov={70} near={0.1} far={1000} />
          <PointerLockControls />
          <Stats />
          
          {/* Environment */}
          <Environment preset="apartment" background />
          <ambientLight intensity={0.5} />
          <directionalLight
            castShadow
            position={[2, 4, 1]}
            intensity={1}
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />
          
          {/* Room with furniture */}
          <Room />
          <Table position={[0, 0, 0]} />
          
          {/* Four chairs positioned around the table with player indices */}
          <Chair position={[0, 0, 1.25]} rotation={[0, Math.PI, 0]} isPlayerSeat={true} playerIndex={0} />
          <Chair position={[0, 0, -1.25]} rotation={[0, 0, 0]} playerIndex={1} />
          <Chair position={[1.25, 0, 0]} rotation={[0, Math.PI * 1.5, 0]} playerIndex={2} />
          <Chair position={[-1.25, 0, 0]} rotation={[0, Math.PI * 0.5, 0]} playerIndex={3} />
          
          {/* Remote players - only render those with valid positions */}
          {Object.entries(players)
            .filter(([id]) => id !== currentPlayerId)
            .filter(([_, player]) => {
              // Only render players with valid positions and who are active
              return player && 
                typeof player.x === 'number' && 
                typeof player.y === 'number' && 
                typeof player.z === 'number' &&
                // Filter out players at the default origin position (0,0,0)
                !(player.x === 0 && player.y === 0 && player.z === 0);
            })
            .map(([id, player], index) => (
              <RemotePlayer
                key={id}
                position={[player.x, player.y, player.z]}
                rotation={[0, player.rotationY, 0]}
                playerIndex={index}
              />
            ))}
        </Suspense>
      </Canvas>
          <div className="fixed bottom-4 right-4 text-white bg-gray-800 bg-opacity-75 p-2 rounded-lg">
            Press <kbd className="px-2 py-1 bg-gray-700 rounded">ESC</kbd> to open menu
          </div>
        </>
      )}
    </div>
  );
}

export default App;
