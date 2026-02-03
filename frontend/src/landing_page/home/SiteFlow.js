import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './SiteFlow.css';

gsap.registerPlugin(ScrollTrigger);

function SiteFlow() {
  const sectionRef = useRef(null);
  const stepsRef = useRef([]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      stepsRef.current.forEach((step, index) => {
        gsap.from(step, {
          scrollTrigger: {
            trigger: step,
            start: 'top 75%',
            toggleActions: 'play none none reverse'
          },
          x: index % 2 === 0 ? -100 : 100,
          opacity: 0,
          duration: 1,
          ease: 'power3.out'
        });
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const addToRefs = (el) => {
    if (el && !stepsRef.current.includes(el)) {
      stepsRef.current.push(el);
    }
  };

  return (
    <section id="how-it-works" className="flow-section" ref={sectionRef}>
      <div className="flow-container">
        <div className="section-header">
          <h2 className="section-title">How It Works</h2>
          <p className="section-subtitle">
            Simple steps to join our life-saving community
          </p>
        </div>

        <div className="flow-content">
          <div className="flow-step" ref={addToRefs}>
            <div className="step-number">1</div>
            <div className="step-content">
              <h3>Choose Your Role</h3>
              <p>
                Select whether you're joining as a Hospital, Doctor, or Donor. 
                Each role has a tailored experience designed for maximum efficiency.
              </p>
            </div>
          </div>

          <div className="flow-step" ref={addToRefs}>
            <div className="step-number">2</div>
            <div className="step-content">
              <h3>Complete Registration</h3>
              <p>
                <strong>Hospitals:</strong> Upload license, create admin account<br/>
                <strong>Doctors:</strong> Submit medical certificate for verification<br/>
                <strong>Donors:</strong> Sign in with hospital-provided credentials
              </p>
            </div>
          </div>

          <div className="flow-step" ref={addToRefs}>
            <div className="step-number">3</div>
            <div className="step-content">
              <h3>Verification Process</h3>
              <p>
                Our secure verification system ensures all medical professionals 
                are authenticated. Hospitals and doctors go through document 
                verification for platform integrity.
              </p>
            </div>
          </div>

          <div className="flow-step" ref={addToRefs}>
            <div className="step-number">4</div>
            <div className="step-content">
              <h3>Access Dashboard</h3>
              <p>
                Once verified, access your personalized dashboard to manage 
                blood requests, donations, inventory, and coordinate with other 
                members of the platform.
              </p>
            </div>
          </div>

          <div className="flow-step" ref={addToRefs}>
            <div className="step-number">5</div>
            <div className="step-content">
              <h3>Save Lives</h3>
              <p>
                Start making an impact! Coordinate donations, approve requests, 
                manage inventory, and be part of a system that saves lives 
                every single day.
              </p>
            </div>
          </div>
        </div>

        <div className="role-comparison">
          <h3>Role-Based Features</h3>
          <div className="comparison-grid">
            <div className="comparison-card">
              <h4>🏥 Hospital</h4>
              <ul>
                <li>Manage blood inventory</li>
                <li>Create donor accounts</li>
                <li>Coordinate with doctors</li>
                <li>Track all donations</li>
                <li>Generate reports</li>
              </ul>
            </div>
            <div className="comparison-card">
              <h4>🧑‍⚕️ Doctor</h4>
              <ul>
                <li>View blood requests</li>
                <li>Verify donor eligibility</li>
                <li>Approve donations</li>
                <li>Patient coordination</li>
                <li>Medical oversight</li>
              </ul>
            </div>
            <div className="comparison-card">
              <h4>🩸 Donor</h4>
              <ul>
                <li>View requests</li>
                <li>Donation history</li>
                <li>Eligibility status</li>
                <li>Schedule donations</li>
                <li>Impact tracking</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default SiteFlow;
