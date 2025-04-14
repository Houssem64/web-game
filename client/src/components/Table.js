import React from 'react';

const Table = ({ position = [0, 0, 0] }) => {
  // Table dimensions
  const width = 2.2;  // Slightly wider to fit monitors
  const height = 0.8;
  const depth = 2.2;  // Slightly deeper to fit monitors
  const thickness = 0.05;
  const legWidth = 0.1;
  
  return (
    <group position={position}>
      {/* Table top */}
      <mesh position={[0, height, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, thickness, depth]} />
        <meshStandardMaterial color="#5D4037" />
      </mesh>
      
      {/* Monitor slots/grooves on the table */}
      {/* North player slot */}
      <mesh position={[0, height + thickness/2 + 0.001, depth/3]} receiveShadow>
        <boxGeometry args={[0.52, 0.01, 0.22]} />
        <meshStandardMaterial color="#3D2C27" />
      </mesh>
      
      {/* South player slot */}
      <mesh position={[0, height + thickness/2 + 0.001, -depth/3]} receiveShadow>
        <boxGeometry args={[0.52, 0.01, 0.22]} />
        <meshStandardMaterial color="#3D2C27" />
      </mesh>
      
      {/* East player slot */}
      <mesh position={[depth/3, height + thickness/2 + 0.001, 0]} receiveShadow>
        <boxGeometry args={[0.22, 0.01, 0.52]} />
        <meshStandardMaterial color="#3D2C27" />
      </mesh>
      
      {/* West player slot */}
      <mesh position={[-depth/3, height + thickness/2 + 0.001, 0]} receiveShadow>
        <boxGeometry args={[0.22, 0.01, 0.52]} />
        <meshStandardMaterial color="#3D2C27" />
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
      
      {/* Center decoration */}
      <mesh position={[0, height + thickness/2 + 0.005, 0]} receiveShadow>
        <cylinderGeometry args={[0.3, 0.3, 0.01, 32]} />
        <meshStandardMaterial color="#8D6E63" />
      </mesh>
    </group>
  );
};

export default Table;
