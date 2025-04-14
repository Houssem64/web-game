import React from 'react';

// Button color definitions
const BUTTON_COLORS = {
  A: {
    background: "#d32f2f", // Red
    hover: "#f44336",
    active: "#b71c1c" 
  },
  B: {
    background: "#1976d2", // Blue
    hover: "#2196f3",
    active: "#0d47a1"
  },
  C: {
    background: "#388e3c", // Green
    hover: "#4caf50",
    active: "#1b5e20"
  },
  D: {
    background: "#ffa000", // Amber/Orange
    hover: "#ffc107",
    active: "#ff8f00"
  }
};

const AnswerButton = ({ letter, text, selected, disabled, onClick }) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const buttonColor = BUTTON_COLORS[letter];
  
  // Define styles inline for prettier on-screen buttons
  const buttonStyle = {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    padding: '12px 16px',
    marginBottom: '10px',
    backgroundColor: selected ? buttonColor.active : 
                   isHovered ? buttonColor.hover : 
                   buttonColor.background,
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: disabled ? 'default' : 'pointer',
    transition: 'all 0.2s ease',
    fontSize: '110%',
    fontWeight: selected ? 'bold' : 'normal',
    opacity: disabled && !selected ? 0.7 : 1,
    transform: isHovered && !disabled ? 'scale(1.02)' : 'scale(1)',
    boxShadow: isHovered && !disabled ? '0 4px 8px rgba(0,0,0,0.3)' : 'none'
  };

  const letterStyle = {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    color: 'white',
    borderRadius: '50%',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: '12px',
    fontWeight: 'bold'
  };

  const textStyle = {
    flex: 1,
    textAlign: 'left',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  };

  // Handle click with stopping propagation
  const handleClick = (e) => {
    if (disabled) return;
    e.stopPropagation();
    onClick();
  };

  return (
    <button 
      style={buttonStyle}
      onClick={handleClick}
      disabled={disabled}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="answer-button"
      data-answer={letter}
    >
      <div style={letterStyle}>{letter}</div>
      <div style={textStyle}>{text}</div>
    </button>
  );
};

export default AnswerButton; 