import React, { useState, useEffect } from 'react';
import { getFIFOSuggestions } from '../../services/bloodInventoryApi';
import FIFOSuggestionCard from './FIFOSuggestionCard';
import './FIFOComponents.css';

const FIFOSuggestionsPanel = ({ onIssue, onReserve, refresh }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [selectedBloodGroup, setSelectedBloodGroup] = useState('');
  const [loading, setLoading] = useState(false);

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  useEffect(() => {
    if (selectedBloodGroup) {
      fetchSuggestions();
    } else {
      setSuggestions([]);
    }
  }, [selectedBloodGroup, refresh]);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const response = await getFIFOSuggestions(selectedBloodGroup);
      setSuggestions(response.data?.data || response.data || response.suggestions || []);
    } catch (error) {
      console.error('Failed to fetch FIFO suggestions:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fifo-panel">
      <div className="fifo-panel-header">
        <div>
          <h3>🔄 FIFO Suggestions</h3>
          <p>Use oldest units first to minimize waste</p>
        </div>
        
        <div className="fifo-filter">
          <label>Filter by Blood Group:</label>
          <select
            value={selectedBloodGroup}
            onChange={(e) => setSelectedBloodGroup(e.target.value)}
          >
            <option value="">All Groups</option>
            {bloodGroups.map(group => (
              <option key={group} value={group}>{group}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading suggestions...</div>
      ) : suggestions.length === 0 ? (
        <div className="no-data">
          ✅ No suggestions available
        </div>
      ) : (
        <div className="fifo-grid">
          {suggestions.map((unit, index) => (
            <FIFOSuggestionCard
              key={unit._id}
              unit={unit}
              rank={index + 1}
              onIssue={onIssue}
              onReserve={onReserve}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default FIFOSuggestionsPanel;
