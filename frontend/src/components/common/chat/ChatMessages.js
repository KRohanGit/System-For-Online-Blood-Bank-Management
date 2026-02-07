import React from 'react';
import ChatMessage from './ChatMessage';

function ChatMessages({ messages }) {
  return (
    <div className="chat-messages">
      {messages.map((msg, index) => (
        <ChatMessage key={index} message={msg.text} type={msg.type} />
      ))}
    </div>
  );
}

export default ChatMessages;
