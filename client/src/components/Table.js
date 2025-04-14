import React from 'react';

const Table = ({ position = [0, 0, 0] }) => {
  // Table dimensions
  const width = 2;
  const height = 0.8;
  const depth = 2;
  const thickness = 0.05;
  const legWidth = 0.1;
  
  return (
    <group position={position}>
      {/* Table top */}
      <mesh position={[0, height, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, thickness, depth]} />
        <meshStandardMaterial color="#5D4037" />
      </mesh>
      
      {/* Table legs */}
      {/* Front left leg */}
      <mesh position={[-width/2 + legWidth/2, height/2, -depth/2 + legWidth/2]} castShadow>
        <boxGeometry args={[legWidth, height, legWidth]} />
        <meshStandardMaterial color="#4E342E" />
      </mesh>
      
      {/* Front right leg */}
      <mesh position={[width/2 - legWidth/2, height/2, -depth/2 + legWidth/2]} castShadow>
        <boxGeometry args={[legWidth, height, legWidth]} />
        <meshStandardMaterial color="#4E342E" />
      </mesh>
      
      {/* Back left leg */}
      <mesh position={[-width/2 + legWidth/2, height/2, depth/2 - legWidth/2]} castShadow>
        <boxGeometry args={[legWidth, height, legWidth]} />
        <meshStandardMaterial color="#4E342E" />
      </mesh>
      
      {/* Back right leg */}
      <mesh position={[width/2 - legWidth/2, height/2, depth/2 - legWidth/2]} castShadow>
        <boxGeometry args={[legWidth, height, legWidth]} />
        <meshStandardMaterial color="#4E342E" />
      </mesh>
      
      {/* Optional decorative elements */}
      <mesh position={[0, height - thickness/2, 0]} receiveShadow>
        <boxGeometry args={[width * 0.9, thickness * 0.5, depth * 0.9]} />
        <meshStandardMaterial color="#6D4C41" />
      </mesh>
    </group>
  );
};

export default Table;
