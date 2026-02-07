import React, { useState, useEffect, useRef } from 'react';
import ChatHeader from './ChatHeader';
import ChatDisclaimer from './ChatDisclaimer';
import ChatMessages from './ChatMessages';
import ChatOptions from './ChatOptions';
import ChatCTAButtons from './ChatCTAButtons';
import { 
  WELCOME_MESSAGE, 
  DISCLAIMER, 
  CHAT_OPTIONS, 
  RESPONSES, 
  CTA_BUTTONS 
} from './chatConstants';
import './ChatModal.css';

function ChatModal({ isOpen, onClose }) {
  const [messages, setMessages] = useState([]);
  const [showOptions, setShowOptions] = useState(true);
  const [currentCTAs, setCurrentCTAs] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setMessages([{ text: WELCOME_MESSAGE, type: 'bot' }]);
      setShowOptions(true);
      setCurrentCTAs([]);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleOptionSelect = (optionId) => {
    const option = CHAT_OPTIONS.find(opt => opt.id === optionId);
    setMessages(prev => [...prev, { text: option.label, type: 'user' }]);
    
    setTimeout(() => {
      const response = RESPONSES[optionId];
      setMessages(prev => [...prev, { text: response.text, type: 'bot' }]);
      setCurrentCTAs(response.ctas);
      setShowOptions(false);
    }, 500);
  };

  const handleReset = () => {
    setMessages([{ text: WELCOME_MESSAGE, type: 'bot' }]);
    setShowOptions(true);
    setCurrentCTAs([]);
  };

  if (!isOpen) return null;

  return (
    <div className="chat-modal-overlay" onClick={onClose}>
      <div className="chat-modal" onClick={(e) => e.stopPropagation()}>
        <ChatHeader onClose={onClose} />
        <ChatDisclaimer text={DISCLAIMER} />
        <ChatMessages messages={messages} />
        <div ref={messagesEndRef} />
        {showOptions && <ChatOptions options={CHAT_OPTIONS} onSelect={handleOptionSelect} />}
        {currentCTAs.length > 0 && (
          <>
            <ChatCTAButtons buttons={currentCTAs} ctaConfig={CTA_BUTTONS} />
            <button className="chat-reset-btn" onClick={handleReset}>
              Start Over
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default ChatModal;
