import React from 'react';

function ChatHeader({ onClose }) {
  return (
    <div className="chat-header">
      <span className="chat-title">LifeLink Help Assistant</span>
      <button className="chat-close" onClick={onClose}>×</button>
    </div>
  );
}

export default ChatHeader;
