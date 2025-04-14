import React from 'react';
import { Text } from '@react-three/drei';

// Player colors based on their player number
const PLAYER_COLORS = {
  1: "#1565C0", // Host - Blue
  2: "#D32F2F", // Red
  3: "#388E3C", // Green
  4: "#FFA000"  // Orange
};

const RemotePlayer = ({ position, rotation, playerNumber = 1, isHost = false }) => {
  // Validate player number to ensure it's between 1 and 4
  const validPlayerNumber = Math.max(1, Math.min(4, playerNumber));
  
  // Determine player label and color
  const playerLabel = `P${validPlayerNumber}`;
  const playerColor = PLAYER_COLORS[validPlayerNumber] || PLAYER_COLORS[1]; // Default to host color if invalid
  
  return (
    <group position={position} rotation={rotation}>
      {/* Player label */}
      <Text
        position={[0, 1.9, 0]}
        color="white"
        fontSize={0.3}
        font="https://fonts.gstatic.com/s/raleway/v14/1Ptrg8zYS_SKggPNwK4vaqI.woff"
        anchorX="center"
        anchorY="middle"
        backgroundColor={playerColor}
        paddingTop={0.05}
        paddingBottom={0.05}
        paddingLeft={0.1}
        paddingRight={0.1}
        borderRadius={0.1}
      >
        {playerLabel}
      </Text>
      
      {/* Simple avatar for remote players - a head and body */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial color={playerColor} />
      </mesh>
      
      {/* Body */}
      <mesh position={[0, 1.1, 0]} castShadow>
        <capsuleGeometry args={[0.2, 0.6, 8, 16]} />
        <meshStandardMaterial color={playerColor} />
      </mesh>
      
      {/* Display front direction indicator */}
      <mesh position={[0, 1.5, -0.2]} castShadow>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#FF5722" />
      </mesh>
    </group>
  );
};

export default RemotePlayer;
