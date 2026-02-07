import React from 'react';
import CreateDonation from '../../components/CreateDonation';
import DonationList from '../../components/DonationList';

const DonationsPage = () => {
  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Manage Donations</h1>
      <CreateDonation />
      <DonationList />
    </div>
  );
};

export default DonationsPage;
