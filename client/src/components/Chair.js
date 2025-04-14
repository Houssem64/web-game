import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

// Player colors based on their player number
const PLAYER_COLORS = {
  1: "#1565C0", // Host - Blue
  2: "#D32F2F", // Red
  3: "#388E3C", // Green
  4: "#FFA000"  // Orange
};

const Chair = ({ position = [0, 0, 0], rotation = [0, 0, 0], isPlayerSeat = false, playerNumber = 0, occupied = false }) => {
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
      
      // Important: We need to make sure the player is facing toward the table
      // Based on which chair they're seated in
      let lookAtTarget;
      
      // Calculate the look direction based on the chair position
      // We want to invert the chair's looking direction to look at the table
      if (Math.abs(position[0]) > Math.abs(position[2])) {
        // We're on the left or right side of the table
        lookAtTarget = new THREE.Vector3(0, position[1] + eyeHeight, 0);
      } else {
        // We're on the top or bottom side of the table
        lookAtTarget = new THREE.Vector3(0, position[1] + eyeHeight, 0);
      }
      
      // Make the camera look at the center of the table
      camera.lookAt(lookAtTarget);
      
      // For a seated position, we need to offset the camera slightly forward
      // to simulate someone sitting in the chair looking at the table
      const towardTable = new THREE.Vector3()
        .subVectors(lookAtTarget, camera.position)
        .normalize()
        .multiplyScalar(0.2);
      
      camera.position.add(towardTable);
      
      // Make sure the camera is looking at the table again after the position adjustment
      camera.lookAt(lookAtTarget);
      
      console.log('Player seated in chair at position:', camera.position);
    }
  }, [camera, isPlayerSeat, position, rotation, seatHeight]);

  // Only show player labels for occupied seats
  const playerLabel = occupied ? `P${playerNumber}` : "";
  const playerColor = playerNumber > 0 ? PLAYER_COLORS[playerNumber] || PLAYER_COLORS[1] : "#795548";
  
  return (
    <group ref={chairRef} position={position} rotation={rotation}>
      {/* Player Label - only visible for occupied, non-player seats */}
      {!isPlayerSeat && occupied && playerLabel && (
        <Text
          position={[0, seatHeight + backHeight + 0.3, 0]}
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
      )}
      
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
