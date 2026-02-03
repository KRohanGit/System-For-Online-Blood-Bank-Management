import React from 'react';

const FilterBar = ({ filters, onFilterChange, onClear }) => {
  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const statuses = ['Available', 'Reserved', 'Issued', 'Expired', 'Quarantined'];

  return (
    <div className="filter-bar">
      <div className="filter-group">
        <label>Blood Group:</label>
        <select
          value={filters.bloodGroup}
          onChange={(e) => onFilterChange({ bloodGroup: e.target.value, page: 1 })}
        >
          <option value="">All Groups</option>
          {bloodGroups.map(group => (
            <option key={group} value={group}>{group}</option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label>Status:</label>
        <select
          value={filters.status}
          onChange={(e) => onFilterChange({ status: e.target.value, page: 1 })}
        >
          <option value="">All Statuses</option>
          {statuses.map(status => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
      </div>

      <button className="btn-clear-filter" onClick={onClear}>
        Clear Filters
      </button>
    </div>
  );
};

export default FilterBar;
