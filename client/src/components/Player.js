import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useKeyboardControls } from '../hooks/useKeyboardControls';
import { useGameStore } from '../store/gameStore';
import { useConnection } from '../hooks/useConnection';

// Player movement speed constants
const MOVE_SPEED = 0.1;
const ROTATE_SPEED = 0.05;

const Player = ({ position, rotation, isCurrentPlayer }) => {
  const meshRef = useRef();
  const { room } = useConnection();
  
  // Always call hooks at the top level
  const controls = useKeyboardControls();
  
  // Only use the controls for the current player
  const { moveForward, moveBackward, moveLeft, moveRight, rotateLeft, rotateRight } = 
    isCurrentPlayer ? controls : { moveForward: false, moveBackward: false, moveLeft: false, moveRight: false, rotateLeft: false, rotateRight: false };
  
  useFrame(() => {
    if (!isCurrentPlayer || !meshRef.current) return;
    
    // Handle player movement
    let moved = false;
    const newPosition = [...position];
    const newRotation = [...rotation];
    
    // Rotation (Y axis)
    if (rotateLeft) {
      newRotation[1] += ROTATE_SPEED;
      moved = true;
    }
    if (rotateRight) {
      newRotation[1] -= ROTATE_SPEED;
      moved = true;
    }
    
    // Calculate forward vector based on current rotation
    const angle = newRotation[1];
    const forwardX = Math.sin(angle);
    const forwardZ = Math.cos(angle);
    
    // Movement
    if (moveForward) {
      newPosition[0] += forwardX * MOVE_SPEED;
      newPosition[2] -= forwardZ * MOVE_SPEED;
      moved = true;
    }
    if (moveBackward) {
      newPosition[0] -= forwardX * MOVE_SPEED;
      newPosition[2] += forwardZ * MOVE_SPEED;
      moved = true;
    }
    if (moveLeft) {
      newPosition[0] -= forwardZ * MOVE_SPEED;
      newPosition[2] -= forwardX * MOVE_SPEED;
      moved = true;
    }
    if (moveRight) {
      newPosition[0] += forwardZ * MOVE_SPEED;
      newPosition[2] += forwardX * MOVE_SPEED;
      moved = true;
    }
    
    // If there was movement, update the mesh and send to server
    if (moved && room) {
      // Update position and rotation in the mesh
      meshRef.current.position.set(newPosition[0], newPosition[1], newPosition[2]);
      meshRef.current.rotation.set(newRotation[0], newRotation[1], newRotation[2]);
      
      // Send updates to the server
      room.send('move', {
        x: newPosition[0],
        y: newPosition[1],
        z: newPosition[2],
        rotationY: newRotation[1]
      });
    }
  });
  
  // Different colors for current player vs other players
  const color = isCurrentPlayer ? '#2196f3' : '#f44336';
  
  return (
    <mesh
      ref={meshRef}
      position={position}
      rotation={rotation}
      castShadow
    >
      {/* Player body */}
      <capsuleGeometry args={[0.5, 1, 8, 16]} />
      <meshStandardMaterial color={color} />
      
      {/* Player direction indicator */}
      <group position={[0, 0, -0.5]}>
        <mesh>
          <coneGeometry args={[0.25, 0.5, 8]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      </group>
    </mesh>
  );
};

export default Player;
