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
        <boxGeometry args={[0.15, 0.05, 0.1]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      
      {/* Tablet body */}
      <mesh position={[0, 0.09, 0]} rotation={[0.3, 0, 0]} castShadow receiveShadow ref={screenRef}>
        <boxGeometry args={[0.5, 0.32, 0.02]} />
        <meshStandardMaterial color="#111111" />
        
        {/* Tablet screen (slightly inset from the body) */}
        <mesh position={[0, 0, 0.005]} castShadow receiveShadow>
          <boxGeometry args={[0.46, 0.28, 0.001]} />
          <meshStandardMaterial color="#000000" emissive={screenGlowColor} emissiveIntensity={0.4} />
        </mesh>
        
        {/* Home button */}
        <mesh position={[0, -0.135, 0.011]} castShadow receiveShadow>
          <cylinderGeometry args={[0.01, 0.01, 0.001, 16]} rotation={[Math.PI/2, 0, 0]} />
          <meshStandardMaterial color="#222222" />
        </mesh>
        
        {/* Camera */}
        <mesh position={[0, 0.13, 0.011]} castShadow receiveShadow>
          <cylinderGeometry args={[0.004, 0.004, 0.001, 16]} rotation={[Math.PI/2, 0, 0]} />
          <meshStandardMaterial color="#333333" />
        </mesh>
      </mesh>
      
      {/* Screen Content */}
      <Html
        transform
        zIndexRange={[100, 0]}
        position={[0, 0.125, 0.03]}
        rotation={[0.3, 0, 0]}
        distanceFactor={0.09}
        style={{
          width: '2300px',
          height: '1000px',
          background: 'rgba(10, 10, 40, 0.98)',
          border: '4px solid rgba(120, 130, 240, 0.6)',
          boxShadow: '0 0 20px rgba(100, 150, 255, 0.5)',
          borderRadius: '10px',
          color: 'white',
          padding: '20px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          pointerEvents: 'auto',
          transform: 'scaleX(-1)'
        }}
      >
        <QuizScreen />
      </Html>
      
      {/* Add a stronger glow effect around the tablet */}
      <pointLight
        position={[0, 0.1, 0.12]}
        intensity={0.35}
        distance={0.7}
        color={screenGlowColor}
      />
    </group>
  );
};

export default QuizDisplay; 