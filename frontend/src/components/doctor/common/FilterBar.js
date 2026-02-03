import React from 'react';
import './FilterBar.css';

const FilterBar = ({ filters = [], onFilterChange }) => {
  // If no filters provided, return nothing
  if (!filters || filters.length === 0) {
    return null;
  }

  return (
    <div className="filter-bar">
      {filters.map((filter, index) => (
        <div key={index} className="filter-group">
          {filter.type === 'select' && (
            <>
              <label>{filter.label}:</label>
              <select
                name={filter.name}
                value={filter.value}
                onChange={(e) => onFilterChange(filter.name, e.target.value)}
              >
                {filter.options.map((option, optIndex) => (
                  <option key={optIndex} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </>
          )}

          {filter.type === 'search' && (
            <>
              <label>{filter.label}:</label>
              <input
                type="text"
                name={filter.name}
                value={filter.value}
                onChange={(e) => onFilterChange(filter.name, e.target.value)}
                placeholder={filter.placeholder}
              />
            </>
          )}

          {filter.type === 'date' && (
            <>
              <label>{filter.label}:</label>
              <input
                type="date"
                name={filter.name}
                value={filter.value}
                onChange={(e) => onFilterChange(filter.name, e.target.value)}
              />
            </>
          )}

          {filter.type === 'checkbox' && (
            <label className="checkbox-label">
              <input
                type="checkbox"
                name={filter.name}
                checked={filter.value}
                onChange={(e) => onFilterChange(filter.name, e.target.checked)}
              />
              {filter.label}
            </label>
          )}
        </div>
      ))}
    </div>
  );
};

export default FilterBar;
