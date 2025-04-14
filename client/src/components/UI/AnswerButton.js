import React from 'react';
import './UI.css';

// Button color definitions with more vibrant colors and gradients
const BUTTON_COLORS = {
  A: {
    background: "linear-gradient(to bottom, #ff5a5a, #d32f2f)", // Red
    hover: "linear-gradient(to bottom, #ff6b6b, #e33e3e)",
    active: "linear-gradient(to bottom, #c62828, #b71c1c)" 
  },
  B: {
    background: "linear-gradient(to bottom, #4a90e2, #1976d2)", // Blue
    hover: "linear-gradient(to bottom, #5c9ee5, #2185e5)",
    active: "linear-gradient(to bottom, #1565c0, #0d47a1)"
  },
  C: {
    background: "linear-gradient(to bottom, #4caf50, #388e3c)", // Green
    hover: "linear-gradient(to bottom, #5dbe60, #43a047)",
    active: "linear-gradient(to bottom, #2e7d32, #1b5e20)"
  },
  D: {
    background: "linear-gradient(to bottom, #ffc107, #ffa000)", // Amber/Orange
    hover: "linear-gradient(to bottom, #ffca28, #ffb300)",
    active: "linear-gradient(to bottom, #ff8f00, #ff6f00)"
  }
};

const AnswerButton = ({ letter, text, selected, disabled, onClick }) => {
  // Handle click with simple logging
  const handleClick = () => {
    console.log(`AnswerButton ${letter} clicked`);
    
    if (disabled) {
      console.log(`Button ${letter} is disabled, ignoring click`);
      return;
    }
    
    // Call the onClick handler directly
    if (typeof onClick === 'function') {
      onClick();
    }
  };

  // Generate button styles
  const getButtonStyle = () => {
    const baseStyle = {
      display: 'flex',
      alignItems: 'center',
      width: '100%',
      padding: '14px',
      marginBottom: '12px',
      border: 'none',
      borderRadius: '8px',
      cursor: disabled ? 'default' : 'pointer',
      fontSize: '110%',
      position: 'relative',
      transition: 'all 0.15s ease-in-out',
      fontWeight: selected ? 'bold' : 'normal',
      color: 'white',
      textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.25)',
      opacity: disabled && !selected ? 0.8 : 1,
      background: BUTTON_COLORS[letter]?.background || BUTTON_COLORS.A.background,
      pointerEvents: 'auto'
    };

    if (selected) {
      return {
        ...baseStyle,
        background: BUTTON_COLORS[letter]?.active || BUTTON_COLORS.A.active,
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3), inset 0 0 10px rgba(255, 255, 255, 0.3)',
        transform: 'scale(1.02)'
      };
    }

    return baseStyle;
  };

  // Generate letter icon style
  const getLetterStyle = () => {
    return {
      backgroundColor: 'rgba(255, 255, 255, 0.25)',
      color: 'white',
      borderRadius: '50%',
      width: '2rem',
      height: '2rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: '14px',
      fontWeight: 'bold',
      boxShadow: 'inset 0 0 5px rgba(0, 0, 0, 0.2)',
    };
  };

  // Clean up debug logging
  React.useEffect(() => {
    console.log(`AnswerButton ${letter} rendered: ${selected ? 'selected' : 'not selected'}`);
  }, [letter, selected]);

  return (
    <button 
      style={getButtonStyle()}
      onClick={handleClick}
      disabled={false}
      data-answer={letter}
      className={`answer-button ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
      type="button"
    >
      <div style={getLetterStyle()}>{letter}</div>
      <div style={{ 
        flex: 1, 
        textAlign: 'left', 
        overflow: 'hidden', 
        textOverflow: 'ellipsis',
      }}>
        {text}
      </div>
    </button>
  );
};

export default AnswerButton; 