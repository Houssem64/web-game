import React from 'react';

const Room = () => {
  // Room dimensions
  const width = 10;
  const height = 4;
  const depth = 10;
  
  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
      
      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, height, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#F5F5F5" />
      </mesh>
      
      {/* Walls */}
      {/* Back wall */}
      <mesh position={[0, height / 2, -depth / 2]} receiveShadow>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color="#E8E8E8" />
      </mesh>
      
      {/* Front wall */}
      <mesh position={[0, height / 2, depth / 2]} rotation={[0, Math.PI, 0]} receiveShadow>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color="#E8E8E8" />
      </mesh>
      
      {/* Left wall */}
      <mesh position={[-width / 2, height / 2, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[depth, height]} />
        <meshStandardMaterial color="#D3D3D3" />
      </mesh>
      
      {/* Right wall */}
      <mesh position={[width / 2, height / 2, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[depth, height]} />
        <meshStandardMaterial color="#D3D3D3" />
      </mesh>
      
      {/* Add some ambient lighting */}
      <ambientLight intensity={0.2} />
      
      {/* Add some spot lights */}
      <pointLight position={[0, 3.5, 0]} intensity={0.8} castShadow />
    </group>
  );
};

export default Room;
