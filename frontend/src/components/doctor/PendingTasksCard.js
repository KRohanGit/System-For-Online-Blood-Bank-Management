import React from 'react';
import './PendingTasksCard.css';

/**
 * Pending Tasks Overview
 * Shows counts of items requiring doctor attention
 */
const PendingTasksCard = ({ pending = {} }) => {
  const tasks = [
    {
      key: 'validations',
      label: 'Blood Unit Validations',
      icon: '🩸',
      color: '#e74c3c',
      count: pending.validations || 0
    },
    {
      key: 'consults',
      label: 'Emergency Consults',
      icon: '🚑',
      color: '#e67e22',
      count: pending.consults || 0
    },
    {
      key: 'advisories',
      label: 'Active Advisories',
      icon: '📋',
      color: '#3498db',
      count: pending.advisories || 0
    },
    {
      key: 'camps',
      label: 'Upcoming Camps',
      icon: '⛺',
      color: '#27ae60',
      count: pending.camps || 0
    }
  ];

  const totalPending = tasks.reduce((sum, task) => sum + task.count, 0);

  return (
    <div className="pending-tasks-card">
      <div className="tasks-header">
        <h3>📊 Pending Tasks</h3>
        {totalPending > 0 && (
          <span className="total-badge">{totalPending} Total</span>
        )}
      </div>
      
      <div className="tasks-grid">
        {tasks.map(task => (
          <div 
            key={task.key} 
            className="task-item"
            style={{ borderTopColor: task.color }}
          >
            <div className="task-icon">{task.icon}</div>
            <div className="task-details">
              <div className="task-count" style={{ color: task.color }}>
                {task.count}
              </div>
              <div className="task-label">{task.label}</div>
            </div>
          </div>
        ))}
      </div>

      {totalPending === 0 && (
        <div className="no-tasks">
          <p>✓ All caught up! No pending tasks.</p>
        </div>
      )}
    </div>
  );
};

export default PendingTasksCard;
