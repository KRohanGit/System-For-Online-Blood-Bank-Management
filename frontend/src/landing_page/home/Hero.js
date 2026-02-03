import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import './Hero.css';

function Hero() {
  const heroRef = useRef(null);
  const titleRef = useRef(null);
  const subtitleRef = useRef(null);
  const ctaRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      tl.from(titleRef.current, {
        y: 100,
        opacity: 0,
        duration: 1,
        delay: 0.3
      })
      .from(subtitleRef.current, {
        y: 50,
        opacity: 0,
        duration: 0.8
      }, '-=0.5')
      .from(ctaRef.current, {
        y: 30,
        opacity: 0,
        duration: 0.6
      }, '-=0.4');
    }, heroRef);

    return () => ctx.revert();
  }, []);

  return (
    <section className="hero" ref={heroRef}>
      <div className="hero-container">
        <div className="hero-content">
          <h1 className="hero-title" ref={titleRef}>
            Save Lives Through
            <span className="highlight"> Blood Donation</span>
          </h1>
          <p className="hero-subtitle" ref={subtitleRef}>
            Connect donors, hospitals, and doctors in a seamless platform. 
            Every drop counts in saving lives.
          </p>
          <div className="hero-cta" ref={ctaRef}>
            <Link to="/signup" className="cta-btn primary">
              Get Started
            </Link>
            <button 
              className="cta-btn secondary"
              onClick={() => document.getElementById('about').scrollIntoView({ behavior: 'smooth' })}
            >
              Learn More
            </button>
          </div>
        </div>
        <div className="hero-visual">
          <div className="blood-drop">
            <span className="drop-icon">🩸</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
