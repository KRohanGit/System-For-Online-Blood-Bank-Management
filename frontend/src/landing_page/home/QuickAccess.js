import React from 'react';
import { useNavigate } from 'react-router-dom';
import './QuickAccess.css';

export default function QuickAccess() {
  const navigate = useNavigate();

  const cards = [
    {
      icon: '💬',
      title: 'Community',
      description: 'Join discussions and see blood requests',
      path: '/community',
      color: '#e74c3c'
    },
    {
      icon: '🏥',
      title: 'Hospitals',
      description: 'Find nearby blood banks and hospitals',
      path: '/hospitals',
      color: '#3498db'
    },
    {
      icon: '📅',
      title: 'Blood Camps',
      description: 'View and organize blood donation camps',
      path: '/blood-camps',
      color: '#2ecc71'
    }
  ];

  return (
    <section className="quick-access">
      <div className="quick-access-container">
        <h2 className="quick-access-title">Quick Access</h2>
        <div className="cards-grid">
          {cards.map((card, index) => (
            <div 
              key={index}
              className="access-card"
              onClick={() => navigate(card.path)}
              style={{ '--card-color': card.color }}
            >
              <div className="card-icon">{card.icon}</div>
              <h3 className="card-title">{card.title}</h3>
              <p className="card-description">{card.description}</p>
              <button className="card-button">
                Explore →
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
