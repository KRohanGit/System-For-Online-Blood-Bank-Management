import React, { useState, useRef, useEffect } from 'react';
import './Chatbot.css';

const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY || '';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

const SYSTEM_CONTEXT = `You are LifeLink Assistant, a helpful AI chatbot for the LifeLink Emergency Blood Bank Management System. 
You help users with:
- Blood donation queries (eligibility, process, recovery)
- Blood group compatibility information
- Emergency blood request procedures
- Blood camp information and scheduling
- Hospital and donor coordination
- General health information related to blood donation
- Platform navigation help (how to use LifeLink features)

Keep responses concise, accurate, and friendly. If asked about medical emergencies, always advise calling emergency services first.
Do not provide specific medical diagnoses or treatment plans. Always recommend consulting a healthcare professional for medical advice.`;

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I\'m LifeLink Assistant. How can I help you today? You can ask me about blood donation, blood group compatibility, emergency procedures, or anything related to our platform.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMessage = { role: 'user', content: trimmed };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const conversationHistory = messages.slice(-10).map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      conversationHistory.push({
        role: 'user',
        parts: [{ text: trimmed }]
      });

      if (!GEMINI_API_KEY) {
        const fallbackResponse = getFallbackResponse(trimmed);
        setMessages(prev => [...prev, { role: 'assistant', content: fallbackResponse }]);
        setIsLoading(false);
        return;
      }

      const response = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: SYSTEM_CONTEXT }]
          },
          contents: conversationHistory,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 512,
            topP: 0.9
          }
        })
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'I apologize, I couldn\'t process that. Please try again.';

      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      const fallbackResponse = getFallbackResponse(trimmed);
      setMessages(prev => [...prev, { role: 'assistant', content: fallbackResponse }]);
    } finally {
      setIsLoading(false);
    }
  };

  const getFallbackResponse = (query) => {
    const q = query.toLowerCase();

    if (q.includes('blood group') || q.includes('blood type') || q.includes('compatibility')) {
      return 'Blood Group Compatibility:\n\n' +
        '**Universal Donor:** O- can donate to all blood types\n' +
        '**Universal Recipient:** AB+ can receive from all blood types\n\n' +
        '| Blood Type | Can Donate To | Can Receive From |\n' +
        '|---|---|---|\n' +
        '| O- | All types | O- |\n' +
        '| O+ | O+, A+, B+, AB+ | O+, O- |\n' +
        '| A- | A-, A+, AB-, AB+ | A-, O- |\n' +
        '| A+ | A+, AB+ | A+, A-, O+, O- |\n' +
        '| B- | B-, B+, AB-, AB+ | B-, O- |\n' +
        '| B+ | B+, AB+ | B+, B-, O+, O- |\n' +
        '| AB- | AB-, AB+ | AB-, A-, B-, O- |\n' +
        '| AB+ | AB+ | All types |';
    }

    if (q.includes('eligib') || q.includes('can i donate') || q.includes('donate blood')) {
      return 'General Blood Donation Eligibility:\n\n' +
        '- **Age:** 18-65 years\n' +
        '- **Weight:** Minimum 50 kg (110 lbs)\n' +
        '- **Hemoglobin:** At least 12.5 g/dL\n' +
        '- **Gap between donations:** Minimum 3 months (whole blood)\n' +
        '- **Good general health** with no active infections\n' +
        '- **No recent tattoos or piercings** (wait 6-12 months)\n\n' +
        'For a detailed assessment, please consult with a doctor at your nearest blood bank.';
    }

    if (q.includes('emergency') || q.includes('urgent')) {
      return 'For emergency blood requests:\n\n' +
        '1. **Hospital Admins** can create emergency requests from the dashboard\n' +
        '2. Set the urgency level (Critical/High/Medium)\n' +
        '3. The system automatically notifies nearby hospitals with matching inventory\n' +
        '4. Real-time tracking is available for all emergency requests\n\n' +
        'If this is a medical emergency, please call your local emergency services immediately.';
    }

    if (q.includes('camp') || q.includes('drive')) {
      return 'Blood Camps on LifeLink:\n\n' +
        '- **View Camps:** Browse upcoming blood camps in your area\n' +
        '- **Book Appointment:** Reserve your slot at any camp\n' +
        '- **Organize a Camp:** Public users can propose new blood drives\n' +
        '- **Track Your Donations:** View history and certificates after donating\n\n' +
        'Check the Blood Camps section for camps near you!';
    }

    if (q.includes('register') || q.includes('sign up') || q.includes('account')) {
      return 'LifeLink Registration Options:\n\n' +
        '- **Hospital Admin:** Register your hospital with your license document\n' +
        '- **Doctor:** Register with your medical certificate for verification\n' +
        '- **Public User:** Sign up with ID proof to access blood bank search, camps, and community\n' +
        '- **Donor:** Accounts are created by hospitals — contact your hospital\n\n' +
        'Visit the Sign Up page to get started!';
    }

    if (q.includes('hello') || q.includes('hi') || q.includes('hey')) {
      return 'Hello! Welcome to LifeLink. I can help you with:\n\n' +
        '- Blood donation eligibility\n' +
        '- Blood group compatibility\n' +
        '- Emergency blood request procedures\n' +
        '- Blood camp information\n' +
        '- Platform navigation\n\n' +
        'What would you like to know?';
    }

    return 'I can help you with blood donation queries, blood group compatibility, emergency procedures, blood camp information, and LifeLink platform navigation. Could you please rephrase your question?';
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([
      { role: 'assistant', content: 'Chat cleared. How can I help you?' }
    ]);
  };

  return (
    <div className="chatbot-wrapper">
      {isOpen && (
        <div className="chatbot-container">
          <div className="chatbot-header">
            <div className="chatbot-header-info">
              <span className="chatbot-avatar">🩸</span>
              <div>
                <h3>LifeLink Assistant</h3>
                <span className="chatbot-status">Online</span>
              </div>
            </div>
            <div className="chatbot-header-actions">
              <button onClick={clearChat} className="chatbot-clear-btn" title="Clear chat">
                🗑️
              </button>
              <button onClick={() => setIsOpen(false)} className="chatbot-close-btn" title="Close">
                ✕
              </button>
            </div>
          </div>

          <div className="chatbot-messages">
            {messages.map((msg, idx) => (
              <div key={idx} className={`chatbot-message ${msg.role}`}>
                {msg.role === 'assistant' && <span className="msg-avatar">🩸</span>}
                <div className="msg-bubble">
                  {msg.content.split('\n').map((line, i) => (
                    <React.Fragment key={i}>
                      {line.startsWith('**') && line.endsWith('**') ? (
                        <strong>{line.replace(/\*\*/g, '')}</strong>
                      ) : line.startsWith('- ') ? (
                        <div style={{ paddingLeft: '10px' }}>{line}</div>
                      ) : (
                        line
                      )}
                      {i < msg.content.split('\n').length - 1 && <br />}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="chatbot-message assistant">
                <span className="msg-avatar">🩸</span>
                <div className="msg-bubble typing">
                  <span className="dot"></span>
                  <span className="dot"></span>
                  <span className="dot"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chatbot-input-area">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              disabled={isLoading}
            />
            <button onClick={sendMessage} disabled={isLoading || !input.trim()} className="chatbot-send-btn">
              ➤
            </button>
          </div>
        </div>
      )}

      <button className="chatbot-toggle" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? '✕' : '💬'}
      </button>
    </div>
  );
};

export default Chatbot;
