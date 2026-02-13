import React from 'react';

const DonorEligibilityInfo = ({ lastDonationDate, nextEligibleDate }) => {
  return (
    <div className="eligibility-section">
      <div className="info-card">
        <h3>Last Donation</h3>
        <p className="info-value">
          {lastDonationDate
            ? new Date(lastDonationDate).toLocaleDateString()
            : 'No donations yet'}
        </p>
      </div>

      <div className="info-card">
        <h3>Next Eligible Date</h3>
        <p className="info-value">
          {nextEligibleDate
            ? new Date(nextEligibleDate).toLocaleDateString()
            : 'You can donate anytime'}
        </p>
        <small className="info-note">Donations are allowed every 90 days</small>
      </div>
    </div>
  );
};

export default DonorEligibilityInfo;
