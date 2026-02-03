import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './What.css';

gsap.registerPlugin(ScrollTrigger);

function What() {
  const sectionRef = useRef(null);
  const cardsRef = useRef([]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      cardsRef.current.forEach((card, index) => {
        gsap.from(card, {
          scrollTrigger: {
            trigger: card,
            start: 'top 80%',
            end: 'bottom 60%',
            toggleActions: 'play none none reverse'
          },
          y: 50,
          opacity: 0,
          duration: 0.8,
          delay: index * 0.2
        });
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const addToRefs = (el) => {
    if (el && !cardsRef.current.includes(el)) {
      cardsRef.current.push(el);
    }
  };

  return (
    <section id="about" className="about-section" ref={sectionRef}>
      <div className="about-container">
        <div className="section-header">
          <h2 className="section-title">About LifeLink Blood Bank</h2>
          <p className="section-subtitle">
            A revolutionary platform connecting the blood donation ecosystem
          </p>
        </div>

        <div className="about-content">
          <div className="about-card" ref={addToRefs}>
            <div className="card-icon">🏥</div>
            <h3>For Hospitals</h3>
            <p>
              Manage blood inventory efficiently, create donor accounts, 
              and coordinate with verified doctors. Real-time tracking of 
              blood requests and donations.
            </p>
          </div>

          <div className="about-card" ref={addToRefs}>
            <div className="card-icon">🧑‍⚕️</div>
            <h3>For Doctors</h3>
            <p>
              Verify donor eligibility, approve blood requests, and ensure 
              patient safety. Join after medical certificate verification 
              for secure operations.
            </p>
          </div>

          <div className="about-card" ref={addToRefs}>
            <div className="card-icon">🩸</div>
            <h3>For Donors</h3>
            <p>
              Register through your hospital, view donation requests, 
              track your donation history, and make a life-saving impact 
              in your community.
            </p>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-item" ref={addToRefs}>
            <div className="stat-number">24/7</div>
            <div className="stat-label">Platform Availability</div>
          </div>
          <div className="stat-item" ref={addToRefs}>
            <div className="stat-number">100%</div>
            <div className="stat-label">Verified Medical Staff</div>
          </div>
          <div className="stat-item" ref={addToRefs}>
            <div className="stat-number">Secure</div>
            <div className="stat-label">Data Protection</div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default What;
