import React, { useState } from 'react';
import './AuditFilters.css';

const AuditFilters = ({ onFilterChange, currentFilters }) => {
  const [startDate, setStartDate] = useState(currentFilters.startDate || '');
  const [endDate, setEndDate] = useState(currentFilters.endDate || '');
  const [actionType, setActionType] = useState(currentFilters.actionType || '');

  const handleApplyFilters = () => {
    onFilterChange({
      ...(startDate && { startDate }),
      ...(endDate && { endDate }),
      ...(actionType && { actionType })
    });
  };

  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
    setActionType('');
    onFilterChange({});
  };

  return (
    <div className="audit-filters">
      <div className="filter-row">
        <div className="filter-group">
          <label>Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label>End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label>Action Type</label>
          <select value={actionType} onChange={(e) => setActionType(e.target.value)}>
            <option value="">All Actions</option>
            <option value="accepted">Accepted</option>
            <option value="overridden">Overridden</option>
            <option value="rejected">Rejected</option>
            <option value="deferred">Deferred</option>
            <option value="approved">Approved</option>
          </select>
        </div>

        <div className="filter-actions">
          <button className="btn-apply" onClick={handleApplyFilters}>
            Apply Filters
          </button>
          <button className="btn-clear" onClick={handleClearFilters}>
            Clear
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuditFilters;
