import React, { useRef } from 'react';
import { Html } from '@react-three/drei';
import { useGameStore } from '../store/gameStore';
import QuizScreen from './QuizScreen';
import * as THREE from 'three';

const QuizDisplay = ({ position = [0, 0, 0], rotation = [0, 0, 0] }) => {
  const ref = useRef();
  const screenRef = useRef();
  
  // Get the current game phase to change the screen color
  const gamePhase = useGameStore(state => state.gamePhase);
  
  // Choose screen color based on game phase
  let screenGlowColor;
  switch(gamePhase) {
    case 'waiting':
      screenGlowColor = new THREE.Color(0x3366cc); // Blue
      break;
    case 'quiz':
      screenGlowColor = new THREE.Color(0x33cc66); // Green
      break;
    case 'elimination':
      screenGlowColor = new THREE.Color(0xcc3333); // Red
      break;
    case 'finished':
      screenGlowColor = new THREE.Color(0xcccc33); // Yellow
      break;
    default:
      screenGlowColor = new THREE.Color(0x6688cc); // Default blue
  }
  
  // Create a tablet device that sits flat on the table
  return (
    <group position={position} rotation={rotation} ref={ref}>
      {/* Tablet stand (small angled piece) */}
      <mesh position={[0, 0.025, 0.05]} rotation={[0, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.1, 0.05, 0.1]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      
      {/* Tablet body */}
      <mesh position={[0, 0.075, 0]} rotation={[0.3, 0, 0]} castShadow receiveShadow ref={screenRef}>
        <boxGeometry args={[0.4, 0.25, 0.02]} />
        <meshStandardMaterial color="#111111" />
        
        {/* Tablet screen (slightly inset from the body) */}
        <mesh position={[0, 0, 0.005]} castShadow receiveShadow>
          <boxGeometry args={[0.36, 0.21, 0.001]} />
          <meshStandardMaterial color="#000000" emissive={screenGlowColor} emissiveIntensity={0.2} />
        </mesh>
        
        {/* Home button */}
        <mesh position={[0, -0.105, 0.011]} castShadow receiveShadow>
          <cylinderGeometry args={[0.01, 0.01, 0.001, 16]} rotation={[Math.PI/2, 0, 0]} />
          <meshStandardMaterial color="#222222" />
        </mesh>
        
        {/* Camera */}
        <mesh position={[0, 0.1, 0.011]} castShadow receiveShadow>
          <cylinderGeometry args={[0.004, 0.004, 0.001, 16]} rotation={[Math.PI/2, 0, 0]} />
          <meshStandardMaterial color="#333333" />
        </mesh>
      </mesh>
      
      {/* Screen Content - separate from the tablet body to ensure proper rendering */}
      <Html
        transform
        zIndexRange={[100, 0]}
        position={[0, 0.09, 0.02]}
        rotation={[0.3, 0, 0]}
        distanceFactor={0.15}
        style={{
          width: '500px',
          height: '300px',
          background: 'rgba(10, 10, 40, 0.95)',
          border: '3px solid #222',
          borderRadius: '8px',
          color: 'white',
          padding: '10px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          pointerEvents: 'auto',
        }}
      >
        <QuizScreen />
      </Html>
      
      {/* Add a subtle glow effect around the tablet */}
      <pointLight
        position={[0, 0.1, 0.1]}
        intensity={0.15}
        distance={0.5}
        color={screenGlowColor}
      />
    </group>
  );
};

export default QuizDisplay; 