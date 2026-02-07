import React from 'react';

function ChatCTAButtons({ buttons, ctaConfig }) {
  return (
    <div className="chat-cta-buttons">
      {buttons.map((btnKey) => {
        const btn = ctaConfig[btnKey];
        return (
          <a
            key={btnKey}
            href={btn.link}
            className={`chat-cta-btn ${btn.type}`}
          >
            {btn.label}
          </a>
        );
      })}
    </div>
  );
}

export default ChatCTAButtons;
