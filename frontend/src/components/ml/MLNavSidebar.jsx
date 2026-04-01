import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ADVANCED_AI_LINKS, ML_TAB_ROUTE_PREFIX } from '../../constants/mlConstants';

export default function MLNavSidebar({ activeTab, items = [] }) {
  const navigate = useNavigate();

  return (
    <aside className="mli-nav">
      <div className="mli-nav-label">Features</div>

      {items.map(item => (
        <button
          key={item.id}
          onClick={() => navigate(`${ML_TAB_ROUTE_PREFIX}/${item.id}`)}
          className={`mli-nav-item ${activeTab === item.id ? 'mli-nav-active' : ''}`}
          style={activeTab === item.id ? { borderLeftColor: item.color, background: `${item.color}14` } : {}}
        >
          <span
            className="mli-nav-icon"
            style={activeTab === item.id ? { background: item.color } : {}}
          >
            {item.icon}
          </span>
          <div className="mli-nav-text">
            <span className="mli-nav-name">{item.label}</span>
            <span className="mli-nav-desc">{item.desc}</span>
          </div>
          {activeTab === item.id && (
            <span className="mli-nav-arrow" style={{ color: item.color }}>›</span>
          )}
        </button>
      ))}

      <div className="mli-nav-divider" />
      <div className="mli-nav-label">Advanced AI</div>

      {ADVANCED_AI_LINKS.map(item => (
        <button
          key={item.path}
          onClick={() => navigate(item.path)}
          className="mli-nav-item mli-nav-external"
        >
          <span className="mli-nav-icon mli-nav-icon-ext">{item.icon}</span>
          <div className="mli-nav-text">
            <span className="mli-nav-name">{item.label}</span>
          </div>
          <span className="mli-nav-arrow mli-ext-arrow">↗</span>
        </button>
      ))}
    </aside>
  );
}
