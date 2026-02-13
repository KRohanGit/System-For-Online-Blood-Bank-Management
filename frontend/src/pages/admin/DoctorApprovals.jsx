import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import Loader from '../../components/common/Loader';
import { doctorAPI } from '../../services/api';
import '../../styles/admin.css';

function DoctorApprovals() {
  const pageRef = useRef(null);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState([
    {
      _id: '1',
      fullName: 'Dinesh S',
      email: 'dinesh.s@hospital.com',
      licenseNumber: 'MED2021001',
      specialization: 'Hematology',
      certificateFilePath: null,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      verificationStatus: 'pending'
    },
    {
      _id: '2',
      fullName: 'Rohan.k',
      email: 'rohan.k@gitam.edu',
      licenseNumber: 'MED2019045',
      specialization: 'Emergency Medicine',
      certificateFilePath: null,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      verificationStatus: 'approved',
      approvedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
    },
    {
      _id: '3',
      fullName: 'Gaveshna L',
      email: 'gaveshna.l@kgh.in',
      licenseNumber: 'MED2022103',
      specialization: 'Pediatric Surgery',
      certificateFilePath: null,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      verificationStatus: 'pending'
    },
    {
      _id: '4',
      fullName: 'Giri G',
      email: 'giri.g@carehospital.com',
      licenseNumber: 'MED2015078',
      specialization: 'General Surgery',
      certificateFilePath: null,
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      verificationStatus: 'approved',
      approvedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
    }
  ]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [filter, setFilter] = useState('pending');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchDoctors();
  }, []);

  useEffect(() => {
    if (!loading && pageRef.current) {
      const ctx = gsap.context(() => {
        gsap.from('.tabs', {
          y: 20,
          opacity: 0,
          duration: 0.5,
          ease: 'power3.out'
        });
        gsap.from('.data-table-container', {
          y: 30,
          opacity: 0,
          duration: 0.6,
          delay: 0.2,
          ease: 'power3.out'
        });
      }, pageRef);
      return () => ctx.revert();
    }
  }, [loading]);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      // Using dummy data already initialized in state
      // If you want to fetch real data from API, uncomment below:
      // const response = await doctorAPI.getPendingDoctors();
      // setDoctors(response.data?.doctors || []);
    } catch (error) {
      console.error('Error fetching doctors:', error);
      alert('Failed to fetch doctors. Please try again.');
    } finally {
      // Short delay to show loading animation
      setTimeout(() => setLoading(false), 500);
    }
  };

  const filteredDoctors = doctors.filter(doc => {
    if (filter === 'all') return true;
    return doc.verificationStatus === filter;
  });

  const handleApprove = async (doctor) => {
    if (!window.confirm(`Approve Dr. ${doctor.fullName}?`)) return;
    
    try {
      setSubmitting(true);
      // Update local state
      setDoctors(prevDoctors => 
        prevDoctors.map(d => 
          d._id === doctor._id 
            ? { ...d, verificationStatus: 'approved', approvedAt: new Date() }
            : d
        )
      );
      alert(`✅ Dr. ${doctor.fullName} has been approved!`);
      
      // If you want to call API, uncomment below:
      // await doctorAPI.verifyDoctor(doctor._id, 'approved');
    } catch (error) {
      console.error('Error approving doctor:', error);
      alert('Failed to approve doctor. Please try again.');
    } finally {
      setTimeout(() => setSubmitting(false), 300);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }
    
    try {
      setSubmitting(true);
      // Update local state
      setDoctors(prevDoctors => 
        prevDoctors.map(d => 
          d._id === selectedDoctor._id 
            ? { ...d, verificationStatus: 'rejected', rejectionReason, rejectedAt: new Date() }
            : d
        )
      );
      alert(`❌ Dr. ${selectedDoctor.fullName} has been rejected.`);
      setShowRejectModal(false);
      setRejectionReason('');
      setSelectedDoctor(null);
      
      // If you want to call API, uncomment below:
      // await doctorAPI.verifyDoctor(selectedDoctor._id, 'rejected', rejectionReason);
    } catch (error) {
      console.error('Error rejecting doctor:', error);
      alert('Failed to reject doctor. Please try again.');
    } finally {
      setTimeout(() => setSubmitting(false), 300);
    }
  };

  const openRejectModal = (doctor) => {
    setSelectedDoctor(doctor);
    setShowRejectModal(true);
  };

  const viewCertificate = (doctor) => {
    if (doctor.certificateFilePath) {
      const fileUrl = `http://localhost:5000/${doctor.certificateFilePath}`;
      window.open(fileUrl, '_blank');
    } else {
      alert('No certificate available');
    }
  };

  if (loading) {
    return <Loader text="Loading doctors..." />;
  }

  return (
    <DashboardLayout>
      <div className="doctor-approvals" ref={pageRef}>
        {/* Header */}
        <div className="page-header">
          <button className="back-button" onClick={() => navigate('/admin/dashboard')}>
            ← Back
          </button>
          <div className="page-title-section">
            <h1>Doctor Approvals</h1>
            <p>Review and verify doctor registration requests</p>
          </div>
        </div>

        {/* Filters */}
        <div className="tabs">
          <button 
            className={`tab ${filter === 'pending' ? 'active' : ''}`}
            onClick={() => setFilter('pending')}
          >
            Pending ({doctors.filter(d => d.verificationStatus === 'pending').length})
          </button>
          <button 
            className={`tab ${filter === 'approved' ? 'active' : ''}`}
            onClick={() => setFilter('approved')}
          >
            Approved ({doctors.filter(d => d.verificationStatus === 'approved').length})
          </button>
          <button 
            className={`tab ${filter === 'rejected' ? 'active' : ''}`}
            onClick={() => setFilter('rejected')}
          >
            Rejected ({doctors.filter(d => d.verificationStatus === 'rejected').length})
          </button>
          <button 
            className={`tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({doctors.length})
          </button>
        </div>

        {/* Doctors Table */}
        <div className="data-table-container">
          {filteredDoctors.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Doctor Name</th>
                  <th>Email</th>
                  <th>License Number</th>
                  <th>Specialization</th>
                  <th>Certificate</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDoctors.map((doctor) => (
                  <tr key={doctor._id}>
                    <td>{doctor.fullName}</td>
                    <td>{doctor.email}</td>
                    <td>{doctor.licenseNumber}</td>
                    <td>{doctor.specialization}</td>
                    <td>
                      <button 
                        className="btn-sm btn-outline" 
                        onClick={() => viewCertificate(doctor)}
                      >
                        👁️ View
                      </button>
                    </td>
                    <td>{new Date(doctor.createdAt).toLocaleDateString()}</td>
                    <td>
                      <StatusBadge status={doctor.verificationStatus} />
                    </td>
                    <td>
                      <div className="table-actions">
                        {doctor.verificationStatus === 'pending' && (
                          <>
                            <button 
                              className="btn-sm btn-success"
                              onClick={() => handleApprove(doctor)}
                              disabled={submitting}
                            >
                              ✅ Approve
                            </button>
                            <button 
                              className="btn-sm btn-danger"
                              onClick={() => openRejectModal(doctor)}
                              disabled={submitting}
                            >
                              ❌ Reject
                            </button>
                          </>
                        )}
                        {doctor.verificationStatus === 'rejected' && doctor.rejectionReason && (
                          <span className="rejection-reason" title={doctor.rejectionReason}>
                            Reason: {doctor.rejectionReason.substring(0, 30)}...
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
              <p>No {filter !== 'all' ? filter : ''} doctors found</p>
            </div>
          )}
        </div>

        {/* Rejection Modal */}
        {showRejectModal && (
          <Modal
            isOpen={showRejectModal}
            onClose={() => {
              setShowRejectModal(false);
              setRejectionReason('');
              setSelectedDoctor(null);
            }}
            size="small"
          >
            <div className="modal-header">
              <h2>Reject Doctor Application</h2>
              <button 
                className="modal-close"
                onClick={() => setShowRejectModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>Provide a reason for rejecting Dr. {selectedDoctor?.fullName}'s application:</p>
              <textarea
                className="form-textarea"
                rows="4"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter rejection reason..."
                style={{ width: '100%', marginTop: '12px' }}
              />
            </div>
            <div className="modal-footer">
              <button 
                className="btn-secondary"
                onClick={() => setShowRejectModal(false)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button 
                className="btn-danger"
                onClick={handleReject}
                disabled={submitting || !rejectionReason.trim()}
              >
                {submitting ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </Modal>
        )}
      </div>
    </DashboardLayout>
  );
}

export default DoctorApprovals;
