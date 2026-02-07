import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import ChatModal from '../../components/common/chat/ChatModal';
import './Footer.css';

gsap.registerPlugin(ScrollTrigger);

function Footer() {
  const sectionRef = useRef(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.support-content', {
        scrollTrigger: {
          trigger: '.support-content',
          start: 'top 80%',
        },
        y: 50,
        opacity: 0,
        duration: 1
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <footer id="support" className="footer" ref={sectionRef}>
      <div className="footer-container">
        <div className="support-content">
          <h2>Need Support?</h2>
          <p>We're here to help you 24/7</p>
          
          <div className="contact-grid">
            <div className="contact-card">
              <div className="contact-icon">📧</div>
              <h4>Email Us</h4>
              <a href="mailto:support@lifelink.com">support@lifelink.com</a>
            </div>
            <div className="contact-card">
              <div className="contact-icon">📞</div>
              <h4>Call Us</h4>
              <a href="tel:+1234567890">+91 1234567890</a>
            </div>
            <div className="contact-card">
              <div className="contact-icon">💬</div>
              <h4>Live Chat</h4>
              <button className="chat-btn" onClick={() => setIsChatOpen(true)}>Start Chat</button>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="footer-info">
            <div className="footer-logo">
              <span className="logo-icon">🩸</span>
              <span>LifeLink Blood Bank</span>
            </div>
            <p className="footer-tagline">
              We are Making a project that can save lives by connecting blood donors.
            </p>
          </div>

          <div className="footer-links">
            <div className="link-column">
              <h4>Platform</h4>
              <a href="#about">About</a>
              <a href="#how-it-works">How It Works</a>
              <a href="/signup">Sign Up</a>
            </div>
            <div className="link-column">
              <h4>Resources</h4>
              <a href="#">FAQ</a>
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
            </div>
            <div className="link-column">
              <h4>Connect</h4>
              <a href="#">Facebook</a>
              <a href="#">Twitter</a>
              <a href="#">Instagram</a>
            </div>
          </div>
        </div>

        <div className="copyright">
          <p>&copy; 2025 Team Project(Life Link)</p>
        </div>
      </div>
      <ChatModal isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </footer>
  );
}

export default Footer;
