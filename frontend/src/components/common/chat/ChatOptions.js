import React from 'react';

function ChatOptions({ options, onSelect }) {
  return (
    <div className="chat-options">
      {options.map((option) => (
        <button
          key={option.id}
          className="chat-option-btn"
          onClick={() => onSelect(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default ChatOptions;
