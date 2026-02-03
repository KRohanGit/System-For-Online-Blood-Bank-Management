import React from 'react';
import { useNavigate } from 'react-router-dom';
import './QuickActionCard.css';

const QuickActionCard = ({ icon, title, description, path, color }) => {
  const navigate = useNavigate();

  return (
    <div 
      className="quick-action-card"
      onClick={() => navigate(path)}
      style={{ borderLeftColor: color }}
    >
      <div className="card-icon" style={{ color }}>
        {icon}
      </div>
      <div className="card-info">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <div className="card-arrow">→</div>
    </div>
  );
};

export default QuickActionCard;
