import { useEffect, Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera, PointerLockControls, Environment, Stats } from '@react-three/drei';
import { useGameStore } from './store/gameStore';
import { ConnectionStatus } from './components/UI/ConnectionStatus';
import { useConnection } from './hooks/useConnection';
import Room from './components/Room';
import Table from './components/Table';
import Chair from './components/Chair';
import RemotePlayer from './components/RemotePlayer';

function App() {
  const { connectionState, connect, room } = useConnection();
  const players = useGameStore((state) => state.players);
  const currentPlayerId = useGameStore((state) => state.currentPlayerId);
  
  useEffect(() => {
    // Connect to the game server when the component mounts
    // Only connect if we're not already connected
    if (connectionState !== 'connected') {
      console.log('Connecting to server from App component');
      connect();
    }
    
    // Don't leave room when component unmounts
    // Connection will be managed by the useConnection hook
  }, [connect, connectionState]);

  return (
    <div style={{ height: '100vh', width: '100vw' }}>
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
          <Table position={[0, 0.5, 0]} />
          
          {/* Four chairs positioned around the table */}
          <Chair position={[0, 0, 1.25]} rotation={[0, Math.PI, 0]} isPlayerSeat={true} />
          <Chair position={[0, 0, -1.25]} rotation={[0, 0, 0]} />
          <Chair position={[1.25, 0, 0]} rotation={[0, Math.PI * 1.5, 0]} />
          <Chair position={[-1.25, 0, 0]} rotation={[0, Math.PI * 0.5, 0]} />
          
          {/* Remote players */}
          {Object.entries(players)
            .filter(([id]) => id !== currentPlayerId)
            .map(([id, player]) => (
              <RemotePlayer
                key={id}
                position={[player.x, player.y, player.z]}
                rotation={[0, player.rotationY, 0]}
              />
            ))}
        </Suspense>
      </Canvas>
    </div>
  );
}

export default App;
