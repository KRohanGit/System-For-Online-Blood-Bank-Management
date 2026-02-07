import React from 'react';

function ChatMessage({ message, type }) {
  return (
    <div className={`chat-message ${type}`}>
      <div className="message-bubble">
        {message.split('\n').map((line, i) => (
          <React.Fragment key={i}>
            {line}
            {i < message.split('\n').length - 1 && <br />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

export default ChatMessage;
