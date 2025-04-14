import { useState, useEffect } from 'react';

export const useKeyboardControls = () => {
  // State for movement controls
  const [movement, setMovement] = useState({
    moveForward: false,
    moveBackward: false,
    moveLeft: false,
    moveRight: false,
    rotateLeft: false,
    rotateRight: false,
  });

  useEffect(() => {
    // Key down handler
    const handleKeyDown = (e) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          setMovement((prev) => ({ ...prev, moveForward: true }));
          break;
        case 'KeyS':
        case 'ArrowDown':
          setMovement((prev) => ({ ...prev, moveBackward: true }));
          break;
        case 'KeyA':
        case 'ArrowLeft':
          setMovement((prev) => ({ ...prev, moveLeft: true }));
          break;
        case 'KeyD':
        case 'ArrowRight':
          setMovement((prev) => ({ ...prev, moveRight: true }));
          break;
        case 'KeyQ':
          setMovement((prev) => ({ ...prev, rotateLeft: true }));
          break;
        case 'KeyE':
          setMovement((prev) => ({ ...prev, rotateRight: true }));
          break;
        default:
          break;
      }
    };

    // Key up handler
    const handleKeyUp = (e) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          setMovement((prev) => ({ ...prev, moveForward: false }));
          break;
        case 'KeyS':
        case 'ArrowDown':
          setMovement((prev) => ({ ...prev, moveBackward: false }));
          break;
        case 'KeyA':
        case 'ArrowLeft':
          setMovement((prev) => ({ ...prev, moveLeft: false }));
          break;
        case 'KeyD':
        case 'ArrowRight':
          setMovement((prev) => ({ ...prev, moveRight: false }));
          break;
        case 'KeyQ':
          setMovement((prev) => ({ ...prev, rotateLeft: false }));
          break;
        case 'KeyE':
          setMovement((prev) => ({ ...prev, rotateRight: false }));
          break;
        default:
          break;
      }
    };

    // Add event listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Clean up
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return movement;
};
