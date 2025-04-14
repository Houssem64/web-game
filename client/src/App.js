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
  const [chairOccupancy, setChairOccupancy] = useState([false, false, false, false]);
  const [chairPlayerNumbers, setChairPlayerNumbers] = useState([0, 0, 0, 0]);
  
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
  
  // Track chair occupancy based on player positions
  useEffect(() => {
    if (!players) return;
    
    // Create a new occupancy array
    const newOccupancy = [false, false, false, false];
    const newPlayerNumbers = [0, 0, 0, 0];
    
    // Log player data for debugging
    console.log('Current players:', players);
    
    // Check each player
    Object.values(players).forEach(player => {
      // Check if player has a valid chair index and is connected
      if (player.chairIndex >= 0 && 
          player.chairIndex < 4 && 
          player.connected !== false) {
        newOccupancy[player.chairIndex] = true;
        newPlayerNumbers[player.chairIndex] = player.playerNumber || 0;
        console.log(`Chair ${player.chairIndex} is occupied by player ${player.playerNumber}`);
      }
    });
    
    setChairOccupancy(newOccupancy);
    setChairPlayerNumbers(newPlayerNumbers);
  }, [players]);

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
              
              {/* Only activate pointer lock when game is active (not in menu) */}
              <PointerLockControls makeDefault enabled={!showMenu} />
              
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
              
              {/* Get current player data to identify which chair is the player's */}
              {(() => {
                const currentPlayer = players?.[currentPlayerId];
                const playerChairIndex = currentPlayer?.chairIndex ?? -1;
                
                console.log('Current player chair index:', playerChairIndex);
                
                return (
                  <>
                    {/* Four chairs positioned around the table with player info */}
                    <Chair 
                      position={[0, 0, 1.25]} 
                      rotation={[0, Math.PI, 0]} 
                      isPlayerSeat={playerChairIndex === 0} 
                      playerNumber={chairPlayerNumbers[0]} 
                      occupied={chairOccupancy[0]} 
                    />
                    <Chair 
                      position={[0, 0, -1.25]} 
                      rotation={[0, 0, 0]} 
                      isPlayerSeat={playerChairIndex === 1}
                      playerNumber={chairPlayerNumbers[1]} 
                      occupied={chairOccupancy[1]} 
                    />
                    <Chair 
                      position={[1.25, 0, 0]} 
                      rotation={[0, Math.PI * 1.5, 0]} 
                      isPlayerSeat={playerChairIndex === 2}
                      playerNumber={chairPlayerNumbers[2]} 
                      occupied={chairOccupancy[2]} 
                    />
                    <Chair 
                      position={[-1.25, 0, 0]} 
                      rotation={[0, Math.PI * 0.5, 0]} 
                      isPlayerSeat={playerChairIndex === 3}
                      playerNumber={chairPlayerNumbers[3]} 
                      occupied={chairOccupancy[3]} 
                    />
                  </>
                );
              })()}
              
              {/* Remote players - only render those with valid positions */}
              {(() => {
                // Add debugging to see what players we're trying to render
                const remotePlayerEntries = Object.entries(players || {})
                  .filter(([id]) => id !== currentPlayerId);
                
                console.log('Remote players before filtering:', remotePlayerEntries);
                
                const validRemotePlayers = remotePlayerEntries
                  .filter(([_, player]) => {
                    // Only render players with valid positions and who are active
                    const isValid = player && 
                      typeof player.x === 'number' && 
                      typeof player.y === 'number' && 
                      typeof player.z === 'number' &&
                      player.connected !== false && // Check if player is connected
                      player.playerNumber > 0 &&    // Must have a valid player number
                      player.playerNumber <= 4;     // Only show P1-P4
                      
                    if (!isValid) {
                      console.log('Filtering out invalid player:', player);
                    }
                    
                    return isValid;
                  });
                
                console.log('Valid remote players after filtering:', validRemotePlayers);
                
                return validRemotePlayers.map(([id, player]) => {
                  console.log(`Rendering remote player ${id} at position:`, [player.x, player.y, player.z]);
                  return (
                    <RemotePlayer
                      key={id}
                      position={[player.x, player.y, player.z]}
                      rotation={[0, player.rotationY, 0]}
                      playerNumber={player.playerNumber}
                      isHost={player.isHost}
                    />
                  );
                });
              })()}
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
