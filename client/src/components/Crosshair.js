import React from 'react';

/**
 * Simple point crosshair component
 */
const Crosshair = () => {
  return (
    <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-50">
      {/* Simple white dot crosshair */}
      <div className="w-1 h-1 bg-white rounded-full"></div>
      
      {/* Debug text container - initially hidden */}
      <div 
        id="crosshair-debug-text" 
        className="absolute mt-8 text-white text-sm font-mono bg-black bg-opacity-75 px-2 py-1 rounded transition-opacity duration-200"
        style={{ display: 'none' }}
      ></div>
    </div>
  );
};

export default Crosshair; 