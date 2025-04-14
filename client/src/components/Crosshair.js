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
        width: '16px',
        height: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {/* Outer ring */}
        <div style={{
          width: '14px',
          height: '14px',
          border: '1.5px solid rgba(255,255,255,0.6)',
          borderRadius: '50%',
          position: 'absolute',
          boxShadow: '0 0 3px rgba(0,0,0,0.8)'
        }}></div>
        
        {/* Inner dot */}
        <div style={{
          width: '4px', 
          height: '4px',
          backgroundColor: 'white',
          borderRadius: '50%',
          boxShadow: '0 0 3px rgba(0,0,0,0.8)',
          position: 'absolute'
        }}></div>
      </div>
    </div>
  );
};

export default Crosshair; 