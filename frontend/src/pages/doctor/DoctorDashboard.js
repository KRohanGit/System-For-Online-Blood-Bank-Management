import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../../services/api';
import doctorClinicalAPI from '../../services/doctorClinicalAPI';
import DoctorIdentityCard from '../../components/doctor/DoctorIdentityCard';
import EmergencyAlertBanner from '../../components/doctor/EmergencyAlertBanner';
import PendingTasksCard from '../../components/doctor/PendingTasksCard';
import AvailabilityToggle from '../../components/doctor/AvailabilityToggle';
import ClinicalLoadCard from '../../components/doctor/cards/ClinicalLoadCard';
import ClinicalDecisionLogCard from '../../components/doctor/cards/ClinicalDecisionLogCard';
import BloodUnitValidationPage from './BloodUnitValidationPage';
import EmergencyConsultsPage from './EmergencyConsultsPage';
import CampOversightPage from './CampOversightPage';
import '../../styles/DoctorDashboard.css';

const DoctorDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [profile, setProfile] = useState(null);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkVerificationAndLoadData();
  }, []);

  const checkVerificationAndLoadData = async () => {
    try {
      setLoading(true);
      const response = await authAPI.getProfile();
      
      console.log('🔍 Dashboard - Full profile response:', response);
      
      if (response.success && response.data) {
        const userData = response.data;
        
        // Check if doctor is approved - allow if EITHER isVerified OR verificationStatus is approved
        if (userData.role === 'doctor') {
          const isUserVerified = userData.isVerified;
          const profileStatus = userData.profile?.verificationStatus;
          
          console.log('🔍 Dashboard verification check:', { 
            isUserVerified, 
            profileStatus,
            hasProfile: !!userData.profile,
            fullProfile: userData.profile
          });
          
          // Doctor can access dashboard if:
          // 1. User.isVerified === true (approved at user level) OR
          // 2. DoctorProfile.verificationStatus === 'approved'
          const isApproved = (isUserVerified === true) || (profileStatus === 'approved');
          
          console.log('🔍 Approval status:', {
            isUserVerified: isUserVerified === true,
            isProfileApproved: profileStatus === 'approved',
            finalDecision: isApproved
          });
          
          if (!isApproved) {
            console.log('❌ Doctor not yet approved, redirecting to pending');
            navigate('/doctor/pending-approval');
            return;
          } else {
            console.log('✅ Doctor is approved, proceeding to load dashboard');
          }
        }
        setProfile(userData);

        // Fetch doctor overview data
        try {
          const overviewResponse = await doctorClinicalAPI.getDoctorOverview();
          if (overviewResponse.success) {
            setOverview(overviewResponse.data);
          } else {
            console.warn('⚠️ Overview API returned unsuccess, but continuing...', overviewResponse);
            // Set default overview data
            setOverview({
              pending: { validations: 0, consults: 0, advisories: 0, camps: 0 },
              availability: { status: 'on_call' },
              emergencyAlerts: []
            });
          }
        } catch (overviewError) {
          console.error('⚠️ Error fetching overview (continuing anyway):', overviewError);
          // Set default overview data so dashboard can still load
          setOverview({
            pending: { validations: 0, consults: 0, advisories: 0, camps: 0 },
            availability: { status: 'on_call' },
            emergencyAlerts: []
          });
        }
      } else {
        navigate('/signin');
      }
    } catch (error) {
      console.error('❌ Profile check error:', error);
      // Only redirect to signin if it's an auth error
      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        navigate('/signin');
      } else {
        // For other errors, show error but don't redirect
        console.error('Dashboard load error, but staying on page:', error);
        setLoading(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAvailabilityChange = async (newStatus) => {
    try {
      const response = await doctorClinicalAPI.updateAvailability({
        availabilityStatus: newStatus
      });
      
      if (response.success) {
        // Update local state
        setOverview({
          ...overview,
          availability: response.data
        });
      }
    } catch (error) {
      console.error('Update availability error:', error);
      alert('Failed to update availability');
    }
  };

  const renderContent = () => {
    switch(activeTab) {
      case 'overview':
        return (
          <div className="overview-section">
            {/* Emergency Alerts - Always at Top */}
            {overview?.emergencyAlerts && overview.emergencyAlerts.length > 0 && (
              <EmergencyAlertBanner alerts={overview.emergencyAlerts} />
            )}

            {/* Card Grid Layout */}
            <div className="dashboard-cards-grid">
              {/* Row 1: Core Operational Cards */}
              <div className="card-grid-row">
                <PendingTasksCard pending={overview?.pending} />
                <AvailabilityToggle 
                  currentStatus={overview?.availability?.status || 'off_duty'}
                  onStatusChange={handleAvailabilityChange}
                />
              </div>

              {/* Row 2: Clinical Intelligence Cards (NEW) */}
              <div className="card-grid-row">
                <ClinicalLoadCard />
                <ClinicalDecisionLogCard />
              </div>

              {/* Quick Actions Section */}
              <div className="quick-actions-section">
                <h3>⚡ Quick Actions</h3>
                <div className="quick-actions-grid">
                  <button 
                    className="quick-action-btn validation-btn"
                    onClick={() => setActiveTab('validations')}
                  >
                    <span className="action-icon">🩸</span>
                    <span className="action-label">Blood Unit Validation</span>
                    {overview?.pending?.validations > 0 && (
                      <span className="action-badge">{overview.pending.validations}</span>
                    )}
                  </button>
                  
                  <button 
                    className="quick-action-btn consults-btn"
                    onClick={() => setActiveTab('consults')}
                  >
                    <span className="action-icon">🚑</span>
                    <span className="action-label">Emergency Consults</span>
                    {overview?.pending?.consults > 0 && (
                      <span className="action-badge">{overview.pending.consults}</span>
                    )}
                  </button>
                  
                  <button 
                    className="quick-action-btn camps-btn"
                    onClick={() => setActiveTab('camps')}
                  >
                    <span className="action-icon">⛺</span>
                    <span className="action-label">Camp Oversight</span>
                    {overview?.pending?.camps > 0 && (
                      <span className="action-badge">{overview.pending.camps}</span>
                    )}
                  </button>
                  
                  <button 
                    className="quick-action-btn advisories-btn"
                    onClick={() => setActiveTab('advisories')}
                  >
                    <span className="action-icon">📋</span>
                    <span className="action-label">Clinical Advisories</span>
                    {overview?.pending?.advisories > 0 && (
                      <span className="action-badge">{overview.pending.advisories}</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      case 'validations':
        return <BloodUnitValidationPage />;
      case 'consults':
        return <EmergencyConsultsPage />;
      case 'camps':
        return <CampOversightPage />;
      case 'advisories':
        return (
          <div className="coming-soon">
            <h2>📋 Clinical Advisories</h2>
            <p>Clinical advisory system coming soon</p>
          </div>
        );
      case 'audit':
        return (
          <div className="coming-soon">
            <h2>🔍 Audit Trail</h2>
            <p>Comprehensive audit log coming soon</p>
            <small>Note: Individual decision logs are available in the Clinical Decision Log card on the Overview tab</small>
          </div>
        );
      default:
        return (
          <div className="overview-section">
            {overview?.emergencyAlerts && overview.emergencyAlerts.length > 0 && (
              <EmergencyAlertBanner alerts={overview.emergencyAlerts} />
            )}
            <div className="dashboard-cards-grid">
              <div className="card-grid-row">
                <PendingTasksCard pending={overview?.pending} />
              </div>
            </div>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="loading-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div className="loading">Loading doctor dashboard...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="error-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div>Unable to load profile. Please try logging in again.</div>
      </div>
    );
  }

  return (
    <div className="doctor-dashboard">
      <div className="dashboard-container">
        <div className="dashboard-sidebar">
          <DoctorIdentityCard 
            profile={overview?.profile || {
              name: profile?.profile?.fullName || profile?.name,
              registrationNumber: profile?.profile?.medicalRegistrationNumber,
              specialization: profile?.profile?.specialization,
              affiliatedHospitals: profile?.profile?.affiliatedHospitals || []
            }}
            availability={overview?.availability}
          />
        </div>

        <div className="dashboard-main">
          <div className="dashboard-header">
            <h1>🏥 Doctor Clinical Intelligence Dashboard</h1>
            <p className="dashboard-subtitle">Medical Validation & Blood Safety Oversight</p>
          </div>

          <div className="dashboard-navigation">
            <button 
              className={activeTab === 'overview' ? 'active' : ''}
              onClick={() => setActiveTab('overview')}
            >
              📊 Overview
            </button>
            <button 
              className={activeTab === 'validations' ? 'active' : ''}
              onClick={() => setActiveTab('validations')}
            >
              🩸 Blood Unit Validation
            </button>
            <button 
              className={activeTab === 'consults' ? 'active' : ''}
              onClick={() => setActiveTab('consults')}
            >
              🚑 Emergency Consults
            </button>
            <button 
              className={activeTab === 'camps' ? 'active' : ''}
              onClick={() => setActiveTab('camps')}
            >
              ⛺ Camp Oversight
            </button>
            <button 
              className={activeTab === 'advisories' ? 'active' : ''}
              onClick={() => setActiveTab('advisories')}
            >
              📋 Clinical Advisories
            </button>
            <button 
              className={activeTab === 'audit' ? 'active' : ''}
              onClick={() => setActiveTab('audit')}
            >
              🔍 Audit Trail
            </button>
          </div>

          <div className="dashboard-content">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard;