import React from 'react';

const BloodInventoryTabs = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'overview', icon: '📊', label: 'Overview' },
    { id: 'expiry', icon: '⏰', label: 'Expiry Watch' },
    { id: 'fifo', icon: '🔄', label: 'FIFO Suggestions' }
  ];

  return (
    <div className="page-tabs">
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={activeTab === tab.id ? 'tab active' : 'tab'}
          onClick={() => setActiveTab(tab.id)}
        >
          {tab.icon} {tab.label}
        </button>
      ))}
    </div>
  );
};

export default BloodInventoryTabs;
