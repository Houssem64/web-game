import { useEffect, Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera, PointerLockControls, Environment, Stats } from '@react-three/drei';
import { useGameStore } from './store/gameStore';
import { ConnectionStatus } from './components/UI/ConnectionStatus';
import { useConnection } from './hooks/useConnection';
import { useCrosshair } from './hooks/useCrosshair';
import GameMenu from './components/UI/GameMenu';
import Room from './components/Room';
import Table from './components/Table';
import Chair from './components/Chair';
import RemotePlayer from './components/RemotePlayer';
import QuizDisplay from './components/QuizDisplay';
import Crosshair from './components/Crosshair';
import * as THREE from 'three';
import './App.css';

function App() {
  const { connectionState, connect, room } = useConnection();
  const players = useGameStore((state) => state.players);
  const currentPlayerId = useGameStore((state) => state.currentPlayerId);
  const [showMenu, setShowMenu] = useState(true); // Start with menu visible
  const [chairOccupancy, setChairOccupancy] = useState([false, false, false, false]);
  const [chairPlayerNumbers, setChairPlayerNumbers] = useState([0, 0, 0, 0]);
  
  // Set up crosshair interaction only in game mode
  useCrosshair(!showMenu);
  
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

  // Add cursor hiding when the game is active (not in menu)
  useEffect(() => {
    if (showMenu) {
      document.body.classList.remove('cursor-hidden');
    } else {
      document.body.classList.add('cursor-hidden');
    }
    
    return () => {
      document.body.classList.remove('cursor-hidden');
    };
  }, [showMenu]);

  // Handle starting the game from the menu
  const handleStartGame = () => {
    setShowMenu(false);
  };

  // Add event listener for Start Game button
  useEffect(() => {
    const startGameListener = (e) => {
      // Check if we're clicking roughly in the center of the screen
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      
      // If the click is close to center, find if there's a start-game button there
      if (Math.abs(e.clientX - centerX) < 50 && Math.abs(e.clientY - centerY) < 50) {
        const startButton = document.getElementById('start-game-button');
        if (startButton) {
          console.log('Direct start game button click detected');
          startButton.click();
          handleStartGame();
        }
      }
    };
    
    window.addEventListener('click', startGameListener);
    return () => window.removeEventListener('click', startGameListener);
  }, []);

  return (
    <div className="app-container">
      {/* Only show crosshair when game is active, not in menu */}
      {!showMenu && <Crosshair />}
      
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
              <ambientLight intensity={0.7} />
              <directionalLight
                castShadow
                position={[2, 4, 1]}
                intensity={1.2}
                shadow-mapSize-width={1024}
                shadow-mapSize-height={1024}
              />
              
              {/* Additional spotlight to highlight the table area */}
              <spotLight 
                position={[0, 2.5, 0]} 
                intensity={0.8} 
                angle={0.6} 
                penumbra={0.5} 
                castShadow 
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
                    
                    {/* Screen displays on the table for each player */}
                    {/* Current player's screen */}
                    {playerChairIndex === 0 && chairOccupancy[0] && (
                      <QuizDisplay 
                        position={[0, 0.81, 0.73]} 
                        rotation={[0, Math.PI, 0]} 
                      />
                    )}
                    {playerChairIndex === 1 && chairOccupancy[1] && (
                      <QuizDisplay 
                        position={[0, 0.81, -0.73]} 
                        rotation={[0, 0, 0]} 
                      />
                    )}
                    {playerChairIndex === 2 && chairOccupancy[2] && (
                      <QuizDisplay 
                        position={[0.73, 0.81, 0]} 
                        rotation={[0, Math.PI * 1.5, 0]} 
                      />
                    )}
                    {playerChairIndex === 3 && chairOccupancy[3] && (
                      <QuizDisplay 
                        position={[-0.73, 0.81, 0]} 
                        rotation={[0, Math.PI * 0.5, 0]} 
                      />
                    )}
                    
                    {/* Placeholder displays for other players' screens */}
                    {playerChairIndex !== 0 && chairOccupancy[0] && (
                      <mesh 
                        position={[0, 0.81, 0.73]} 
                        rotation={[0.3, Math.PI, 0]}
                        castShadow 
                        receiveShadow
                      >
                        <boxGeometry args={[0.5, 0.32, 0.02]} />
                        <meshStandardMaterial color="#111111" />
                        <mesh position={[0, 0, 0.005]}>
                          <boxGeometry args={[0.46, 0.28, 0.001]} />
                          <meshStandardMaterial color="#222244" emissive={new THREE.Color(0x3366cc)} emissiveIntensity={0.2} />
                        </mesh>
                      </mesh>
                    )}
                    {playerChairIndex !== 1 && chairOccupancy[1] && (
                      <mesh 
                        position={[0, 0.81, -0.73]} 
                        rotation={[0.3, 0, 0]}
                        castShadow 
                        receiveShadow
                      >
                        <boxGeometry args={[0.5, 0.32, 0.02]} />
                        <meshStandardMaterial color="#111111" />
                        <mesh position={[0, 0, 0.005]}>
                          <boxGeometry args={[0.46, 0.28, 0.001]} />
                          <meshStandardMaterial color="#222244" emissive={new THREE.Color(0x3366cc)} emissiveIntensity={0.2} />
                        </mesh>
                      </mesh>
                    )}
                    {playerChairIndex !== 2 && chairOccupancy[2] && (
                      <mesh 
                        position={[0.73, 0.81, 0]} 
                        rotation={[0.3, Math.PI * 1.5, 0]}
                        castShadow 
                        receiveShadow
                      >
                        <boxGeometry args={[0.5, 0.32, 0.02]} />
                        <meshStandardMaterial color="#111111" />
                        <mesh position={[0, 0, 0.005]}>
                          <boxGeometry args={[0.46, 0.28, 0.001]} />
                          <meshStandardMaterial color="#222244" emissive={new THREE.Color(0x3366cc)} emissiveIntensity={0.2} />
                        </mesh>
                      </mesh>
                    )}
                    {playerChairIndex !== 3 && chairOccupancy[3] && (
                      <mesh 
                        position={[-0.73, 0.81, 0]} 
                        rotation={[0.3, Math.PI * 0.5, 0]}
                        castShadow 
                        receiveShadow
                      >
                        <boxGeometry args={[0.5, 0.32, 0.02]} />
                        <meshStandardMaterial color="#111111" />
                        <mesh position={[0, 0, 0.005]}>
                          <boxGeometry args={[0.46, 0.28, 0.001]} />
                          <meshStandardMaterial color="#222244" emissive={new THREE.Color(0x3366cc)} emissiveIntensity={0.2} />
                        </mesh>
                      </mesh>
                    )}
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
          <div className="controls-hint">
            Press <kbd className="keyboard-key">ESC</kbd> to open menu
          </div>
        </>
      )}
    </div>
  );
}

export default App;
