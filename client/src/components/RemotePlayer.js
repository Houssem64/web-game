import React from 'react';

const RemotePlayer = ({ position, rotation }) => {
  return (
    <group position={position} rotation={rotation}>
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
