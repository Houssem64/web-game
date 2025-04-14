import React from 'react';

/**
 * Simple point crosshair component
 */
const Crosshair = () => {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      pointerEvents: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999 // Ensure it's always on top
    }}>
      {/* Simple white dot crosshair */}
      <div style={{
        width: '3px',
        height: '3px',
        backgroundColor: 'white',
        borderRadius: '50%',
        boxShadow: '0 0 1px white', // Subtle glow effect
        position: 'relative'  // Ensure it's in the stacking context
      }}></div>
    </div>
  );
};

export default Crosshair; 