import React from 'react';
import './DonationHistoryTable.css';

const DonationHistoryTable = ({ donations }) => {
  if (!donations || donations.length === 0) {
    return (
      <div className="empty-state">
        <p>No donation history found</p>
      </div>
    );
  }

  return (
    <div className="donation-history-table">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Blood Group</th>
            <th>Volume (ml)</th>
            <th>Hospital</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {donations.map((donation, index) => (
            <tr key={donation._id || index}>
              <td>{new Date(donation.donationDate).toLocaleDateString()}</td>
              <td className="blood-group-cell">{donation.bloodGroup}</td>
              <td>{donation.volume || 450}</td>
              <td>{donation.hospitalId?.email || donation.hospital || 'N/A'}</td>
              <td>
                <span className={`status-badge ${donation.status.toLowerCase()}`}>
                  {donation.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DonationHistoryTable;
