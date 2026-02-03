import React from 'react';
import { Link } from 'react-router-dom';
import './OurTeam.css';

function OurTeam() {
  const teamMembers = [
    { 
      name: 'K. Rohan', 
      role: 'Project Lead',
      bio: 'Leading the development and vision of LifeLink Blood Bank system.',
      photoPlaceholder: 'photo1.jpg'
    },
    { 
      name: 'G. Girindra', 
      role: 'Full Stack Developer',
      bio: 'Specializing in backend architecture and database design.',
      photoPlaceholder: 'photo2.jpg'
    },
    { 
      name: 'L. Gaveshna', 
      role: 'Frontend Developer',
      bio: 'Crafting intuitive user interfaces and seamless user experiences.',
      photoPlaceholder: 'photo3.jpg'
    },
    { 
      name: 'S. Dinesh', 
      role: 'System Architect',
      bio: 'Ensuring system reliability, security, and optimal performance.',
      photoPlaceholder: 'photo4.jpg'
    }
  ];

  return (
    <div className="our-team-page">
      <Link to="/" className="back-home-btn">
        <span>←</span> Back to Home
      </Link>

      <div className="team-hero">
        <h1 className="team-title">
          <span className="title-icon">🩸</span>
          Meet Our Team
        </h1>
        <p className="team-subtitle">People Behind LifeLink</p>
      </div>

      <div className="team-description">
        <div className="description-card">
          <p className="description-text">
            We are a multidisciplinary team committed to building LifeLink, a smart and reliable blood bank management system designed to save lives. Our goal is to simplify blood donation, improve accessibility, and ensure timely support for patients through a secure and user-friendly digital platform. By combining technical excellence with a strong sense of social responsibility, we strive to make blood availability faster, safer, and more efficient for everyone.

          </p>
          <p className="description-edit-note">
            This project reflects our shared vision of leveraging technology to address real-world healthcare challenges and create meaningful social impact.

          </p>
        </div>
      </div>

      <div className="team-members-container">
        {teamMembers.map((member, index) => (
          <div key={index} className={`team-member-row ${index % 2 === 0 ? 'row-left' : 'row-right'}`}>
            <div className="member-photo-container">
              <div className="member-photo-placeholder">
                <p className="photo-text">Photo</p>
                <p className="photo-filename">{member.photoPlaceholder}</p>
              </div>
            </div>
            <div className="member-info-container">
              <h2 className="member-name">{member.name}</h2>
              <h3 className="member-role">{member.role}</h3>
              <p className="member-bio">{member.bio}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="team-footer">
        <p>Together, we turn technology into life-saving impact.
</p>
      </div>
    </div>
  );
}

export default OurTeam;
