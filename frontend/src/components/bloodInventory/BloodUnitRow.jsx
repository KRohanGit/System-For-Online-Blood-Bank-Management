import React from 'react';
import { formatDate, getExpiryColor } from '../../services/bloodInventoryApi';

const BloodUnitRow = ({ unit, onReserve, onIssue, onViewLifecycle, onDelete }) => {
  return (
    <tr className="blood-unit-row">
      <td className="unit-id">{unit.unitId}</td>
      <td>
        <span className={`blood-group-badge blood-group-${unit.bloodGroup.replace('+', 'pos').replace('-', 'neg')}`}>
          {unit.bloodGroup}
        </span>
      </td>
      <td>{unit.storageType}</td>
      <td>
        {unit.storageLocation.fridgeId} - 
        R{unit.storageLocation.rackNumber} - 
        S{unit.storageLocation.shelfPosition}
      </td>
      <td>{formatDate(unit.collectionDate)}</td>
      <td>
        <span style={{ color: getExpiryColor(unit.expiryDate) }}>
          {formatDate(unit.expiryDate)}
        </span>
      </td>
      <td>
        <span className={`status-tag status-${unit.status.toLowerCase()}`}>
          {unit.status}
        </span>
      </td>
      <td className="actions-cell">
        {unit.status === 'Available' && (
          <>
            <button 
              className="btn-action btn-reserve"
              onClick={() => onReserve(unit._id)}
            >
              Reserve
            </button>
            <button 
              className="btn-action btn-issue"
              onClick={() => onIssue(unit._id)}
            >
              Issue
            </button>
          </>
        )}
        {unit.status === 'Reserved' && (
          <button 
            className="btn-action btn-issue"
            onClick={() => onIssue(unit._id)}
          >
            Issue
          </button>
        )}
        <button 
          className="btn-action btn-view"
          onClick={() => onViewLifecycle(unit)}
        >
          Lifecycle
        </button>
        {(unit.status === 'Expired' || unit.status === 'Quarantined') && (
          <button 
            className="btn-action btn-delete"
            onClick={() => onDelete(unit._id)}
          >
            Delete
          </button>
        )}
      </td>
    </tr>
  );
};

export default BloodUnitRow;
