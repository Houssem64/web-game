import React from 'react';
import './UI.css';

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
  // Handle click with stopping propagation
  const handleClick = (e) => {
    if (disabled) return;
    e.stopPropagation();
    onClick();
  };

  // Determine button class based on letter
  const buttonClass = `answer-button answer-button-${letter.toLowerCase()} ${selected ? 'selected' : ''}`;

  return (
    <button 
      className={buttonClass}
      onClick={handleClick}
      disabled={disabled}
      data-answer={letter}
    >
      <div className="answer-letter">{letter}</div>
      <div className="answer-text">{text}</div>
    </button>
  );
};

export default AnswerButton; 