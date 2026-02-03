import React, { useState, useEffect } from 'react';
import { getDonorsForScreening, screenDonor } from '../../services/doctorApi';
import DonorCard from './cards/DonorCard';
import DonorScreeningModal from './modals/DonorScreeningModal';
import '../../styles/DonorScreening.css';

const DonorScreening = () => {
  const [donors, setDonors] = useState([]);
  const [filteredDonors, setFilteredDonors] = useState([]);
  const [selectedDonor, setSelectedDonor] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDonors();
  }, []);

  const loadDonors = async () => {
    try {
      setLoading(true);
      const data = await getDonorsForScreening();
      setDonors(data);
      setFilteredDonors(data);
    } catch (error) {
      console.error('Load donors error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (filter) => {
    let filtered = [...donors];
    
    if (filter.bloodGroup) {
      filtered = filtered.filter(d => d.bloodGroup === filter.bloodGroup);
    }
    
    if (filter.status) {
      filtered = filtered.filter(d => d.screeningStatus === filter.status);
    }

    setFilteredDonors(filtered);
  };

  const handleScreening = async (donorId, screening) => {
    try {
      await screenDonor(donorId, screening);
      setShowModal(false);
      setSelectedDonor(null);
      loadDonors();
    } catch (error) {
      console.error('Screening error:', error);
    }
  };

  if (loading) {
    return <div className="loading">Loading donors...</div>;
  }

  return (
    <div className="donor-screening">
      <div className="section-header">
        <h2>Donor Screening & Eligibility Approval</h2>
        <div className="actions">
          <button onClick={loadDonors} className="refresh-btn">
            🔄 Refresh
          </button>
        </div>
      </div>

      <div className="donors-grid">
        {filteredDonors.map(donor => (
          <DonorCard
            key={donor._id}
            donor={donor}
            onScreen={() => {
              setSelectedDonor(donor);
              setShowModal(true);
            }}
          />
        ))}
      </div>

      {filteredDonors.length === 0 && (
        <div className="no-data">No donors for screening</div>
      )}

      {showModal && selectedDonor && (
        <DonorScreeningModal
          donor={selectedDonor}
          onClose={() => setShowModal(false)}
          onSubmit={handleScreening}
        />
      )}
    </div>
  );
};

export default DonorScreening;
