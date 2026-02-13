import React from 'react';
import BloodUnitRow from './BloodUnitRow';

const BloodUnitsTable = ({ 
  bloodUnits, 
  loading, 
  totalUnits, 
  filters,
  onReserve, 
  onIssue, 
  onViewLifecycle, 
  onDelete,
  onPageChange
}) => {
  return (
    <div className="blood-units-section">
      <div className="section-header">
        <h2>All Blood Units ({totalUnits})</h2>
      </div>

      {loading ? (
        <div className="loading">Loading blood units...</div>
      ) : bloodUnits.length === 0 ? (
        <div className="no-data">No blood units found</div>
      ) : (
        <>
          <table className="blood-units-table">
            <thead>
              <tr>
                <th>Unit ID</th>
                <th>Blood Group</th>
                <th>Storage Type</th>
                <th>Location</th>
                <th>Collection Date</th>
                <th>Expiry Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bloodUnits.map((unit) => (
                <BloodUnitRow
                  key={unit._id}
                  unit={unit}
                  onReserve={onReserve}
                  onIssue={onIssue}
                  onViewLifecycle={onViewLifecycle}
                  onDelete={onDelete}
                />
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="pagination">
            <button
              disabled={filters.page === 1}
              onClick={() => onPageChange(filters.page - 1)}
            >
              Previous
            </button>
            <span>
              Page {filters.page} of {Math.ceil(totalUnits / filters.limit) || 1}
            </span>
            <button
              disabled={filters.page >= Math.ceil(totalUnits / filters.limit)}
              onClick={() => onPageChange(filters.page + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default BloodUnitsTable;
