import React from 'react';

const Ground = () => {
  return (
    <mesh 
      rotation={[-Math.PI / 2, 0, 0]} 
      position={[0, -0.5, 0]} 
      receiveShadow
    >
      <planeGeometry args={[100, 100]} />
      <meshStandardMaterial 
        color="#4caf50" 
        roughness={1} 
        metalness={0}
      />
    </mesh>
  );
};

export default Ground;
