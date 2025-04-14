import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const Chair = ({ position = [0, 0, 0], rotation = [0, 0, 0], isPlayerSeat = false }) => {
  // Chair dimensions
  const seatHeight = 0.45;
  const seatWidth = 0.5;
  const seatDepth = 0.5;
  const legHeight = 0.45;
  const backHeight = 0.7;
  const legWidth = 0.05;
  const chairRef = useRef();

  // Get the camera and controls from the Three.js context
  const { camera } = useThree();
  
  // Position player's camera for first-person view when seated
  useEffect(() => {
    if (isPlayerSeat && chairRef.current) {
      // Calculate the world position of the chair
      const chairPosition = new THREE.Vector3();
      chairRef.current.getWorldPosition(chairPosition);
      
      // Calculate the seated eye position (slightly above seat)
      const eyeHeight = seatHeight + 0.6; // Eye level when seated
      
      // Position camera at eye level on the chair
      camera.position.set(
        position[0],
        position[1] + eyeHeight,
        position[2]
      );
      
      // Calculate the rotation to look toward the table (away from the chair back)
      const chairRotation = new THREE.Euler(
        rotation[0],
        rotation[1],
        rotation[2],
        'XYZ'
      );
      
      // Apply rotation to camera
      camera.rotation.copy(chairRotation);
      
      // For a seated position, we need to offset the camera slightly forward
      // to simulate someone sitting in the chair looking at the table
      const forward = new THREE.Vector3(0, 0, -0.2); // Move forward relative to chair orientation
      forward.applyEuler(chairRotation);
      camera.position.add(forward);
      
      console.log('Player seated in chair at position:', camera.position);
    }
  }, [camera, isPlayerSeat, position, rotation, seatHeight]);

  return (
    <group ref={chairRef} position={position} rotation={rotation}>
      {/* Seat */}
      <mesh position={[0, seatHeight, 0]} castShadow receiveShadow>
        <boxGeometry args={[seatWidth, 0.05, seatDepth]} />
        <meshStandardMaterial color="#795548" />
      </mesh>
      
      {/* Back */}
      <mesh position={[0, seatHeight + backHeight / 2, -seatDepth / 2 + 0.025]} castShadow receiveShadow>
        <boxGeometry args={[seatWidth, backHeight, 0.05]} />
        <meshStandardMaterial color="#795548" />
      </mesh>
      
      {/* Legs */}
      {/* Front left leg */}
      <mesh position={[-seatWidth/2 + legWidth/2, legHeight/2, -seatDepth/2 + legWidth/2]} castShadow>
        <boxGeometry args={[legWidth, legHeight, legWidth]} />
        <meshStandardMaterial color="#5D4037" />
      </mesh>
      
      {/* Front right leg */}
      <mesh position={[seatWidth/2 - legWidth/2, legHeight/2, -seatDepth/2 + legWidth/2]} castShadow>
        <boxGeometry args={[legWidth, legHeight, legWidth]} />
        <meshStandardMaterial color="#5D4037" />
      </mesh>
      
      {/* Back left leg */}
      <mesh position={[-seatWidth/2 + legWidth/2, legHeight/2, seatDepth/2 - legWidth/2]} castShadow>
        <boxGeometry args={[legWidth, legHeight, legWidth]} />
        <meshStandardMaterial color="#5D4037" />
      </mesh>
      
      {/* Back right leg */}
      <mesh position={[seatWidth/2 - legWidth/2, legHeight/2, seatDepth/2 - legWidth/2]} castShadow>
        <boxGeometry args={[legWidth, legHeight, legWidth]} />
        <meshStandardMaterial color="#5D4037" />
      </mesh>
    </group>
  );
};

export default Chair;
