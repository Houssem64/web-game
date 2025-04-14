import React from 'react';

/**
 * Enhanced crosshair component for better interaction feedback
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
      {/* Crosshair with dot and subtle rings */}
      <div style={{
        position: 'relative',
        width: '12px',
        height: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {/* Inner dot */}
        <div style={{
          width: '3px', 
          height: '3px',
          backgroundColor: 'white',
          borderRadius: '50%',
          boxShadow: '0 0 2px rgba(0,0,0,0.8)',
          position: 'absolute'
        }}></div>
        
       
      </div>
    </div>
  );
};

export default Crosshair; 