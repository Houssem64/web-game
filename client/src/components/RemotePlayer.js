import React from 'react';
import { Text } from '@react-three/drei';

const RemotePlayer = ({ position, rotation, playerIndex = 1 }) => {
  // Determine player label based on index
  const playerLabel = `P${playerIndex + 1}`;
  
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
        backgroundColor="#1565C0"
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
        <meshStandardMaterial color="#2196F3" />
      </mesh>
      
      {/* Body */}
      <mesh position={[0, 1.1, 0]} castShadow>
        <capsuleGeometry args={[0.2, 0.6, 8, 16]} />
        <meshStandardMaterial color="#1976D2" />
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
