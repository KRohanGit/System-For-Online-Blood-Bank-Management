import React from 'react';
import './BloodGroupSelector.css';

export default function BloodGroupSelector({ selected, onChange }) {
  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  const toggleGroup = (group) => {
    if (selected.includes(group)) {
      onChange(selected.filter(g => g !== group));
    } else {
      onChange([...selected, group]);
    }
  };

  return (
    <div className="blood-group-selector">
      <h3>Blood Groups Needed</h3>
      <div className="blood-groups-grid">
        {bloodGroups.map(group => (
          <button
            key={group}
            type="button"
            className={`blood-group-btn ${selected.includes(group) ? 'selected' : ''}`}
            onClick={() => toggleGroup(group)}
          >
            {group}
          </button>
        ))}
      </div>
    </div>
  );
}
