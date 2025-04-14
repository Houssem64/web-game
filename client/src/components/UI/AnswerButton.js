import React from 'react';

const AnswerButton = ({ letter, text, selected, disabled, onClick }) => {
  return (
    <button 
      className={`answer-button ${selected ? 'selected' : ''} ${disabled && !selected ? 'disabled' : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      <div className="answer-letter">{letter}</div>
      <div className="answer-text">{text}</div>
    </button>
  );
};

export default AnswerButton; 