import React, { useState, useEffect } from 'react';
import CampOversightCard from '../../components/doctor/CampOversightCard';
import doctorClinicalAPI from '../../services/doctorClinicalAPI';
import './CampOversightPage.css';

/**
 * Blood Camp Medical Oversight Page
 * Doctor reviews and approves blood donation camps
 */
const CampOversightPage = () => {
  const [camps, setCamps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState('upcoming');

  useEffect(() => {
    fetchCamps();
  }, [phase]);

  const fetchCamps = async () => {
    try {
      setLoading(true);
      const response = await doctorClinicalAPI.getCampsForOversight({ phase });
      if (response.success) {
        setCamps(response.data.camps || []);
      }
    } catch (error) {
      console.error('Error fetching camps:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOversight = (campId, action) => {
    if (action === 'view') {
      alert(`Viewing camp details for: ${campId}\n\nDetailed camp view coming soon!`);
    } else {
      alert(`Camp oversight action: ${action} for camp: ${campId}\n\nOversight submission form coming soon!`);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">Loading camps...</div>
      </div>
    );
  }

  return (
    <div className="camp-oversight-page">
      <div className="page-header">
        <h1>⛺ Blood Camp Medical Oversight</h1>
        <p>Review and approve blood donation camps</p>
      </div>

      <div className="phase-selector">
        <button 
          className={phase === 'upcoming' ? 'active' : ''}
          onClick={() => setPhase('upcoming')}
        >
          📅 Upcoming Camps
        </button>
        <button 
          className={phase === 'ongoing' ? 'active' : ''}
          onClick={() => setPhase('ongoing')}
        >
          🔄 Ongoing Camps
        </button>
        <button 
          className={phase === 'completed' ? 'active' : ''}
          onClick={() => setPhase('completed')}
        >
          ✅ Completed Camps
        </button>
      </div>

      <div className="camps-list">
        {camps.length === 0 ? (
          <div className="no-camps">
            <p>No {phase} camps assigned to you</p>
          </div>
        ) : (
          camps.map(camp => (
            <CampOversightCard
              key={camp._id}
              camp={camp}
              onOversight={handleOversight}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default CampOversightPage;
