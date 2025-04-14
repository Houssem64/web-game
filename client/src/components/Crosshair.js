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
      zIndex: 50
    }}>
      {/* Simple white dot crosshair */}
      <div style={{
        width: '1px',
        height: '1px',
        backgroundColor: 'white',
        borderRadius: '50%'
      }}></div>
    </div>
  );
};

export default Crosshair; 