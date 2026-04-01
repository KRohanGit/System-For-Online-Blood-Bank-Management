import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import config from '../../config/config';
import TopNavbar from '../../components/layout/TopNavbar';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import '../../styles/admin.css';

function DonorManagement() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDonor, setSelectedDonor] = useState(null);
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [newDonor, setNewDonor] = useState({
    name: '',
    email: '',
    phone: '',
    bloodGroup: '',
    address: ''
  });

  const API_URL = config?.API_URL || process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  const formatDate = (value) => {
    if (!value) return 'N/A';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'N/A';
    return parsed.toLocaleDateString();
  };

  useEffect(() => {
    fetchDonors();
  }, []);

  const fetchDonors = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/donations/donors`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = response.data;
      const donorList = data.data?.donors || data.donors || data.data || [];
      setDonors(donorList.map(d => ({
        id: d.id || d._id || d.donorId,
        _id: d._id || d.id,
        name: d.name || d.donorName || d.fullName || d.email,
        email: d.email || '',
        phone: d.phone || '',
        bloodGroup: d.bloodGroup || 'Unknown',
        lastDonation: d.lastDonation || d.lastDonationDate || '',
        totalDonations: d.totalDonations || d.donationCount || 0,
        status: d.status || 'active',
        eligibleDate: d.eligibleDate || d.nextEligibleDate || '',
        address: d.address || d.city || '',
        hasCredentials: d.hasCredentials || true
      })));
    } catch (error) {
      console.error('Error fetching donors:', error);
      setDonors([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredDonors = donors
    .filter((donor) => (filter === 'all' ? true : donor.status === filter))
    .filter((donor) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        String(donor.id || '').toLowerCase().includes(q) ||
        String(donor.name || '').toLowerCase().includes(q) ||
        String(donor.email || '').toLowerCase().includes(q) ||
        String(donor.phone || '').toLowerCase().includes(q) ||
        String(donor.bloodGroup || '').toLowerCase().includes(q)
      );
    });

  const stats = {
    total: donors.length,
    active: donors.filter(d => d.status === 'active').length,
    inactive: donors.filter(d => d.status === 'inactive').length,
    totalDonations: donors.reduce((sum, d) => sum + d.totalDonations, 0)
  };

  const viewDonorDetails = (donor) => {
    setSelectedDonor(donor);
    setShowDetailModal(true);
  };

  const sendCredentials = async (donor) => {
    try {
      const token = localStorage.getItem('token');

      // Check if this is resending (donor already has credentials) or new send
      const isResending = donor.hasCredentials;
      
      let response;
      if (isResending) {
        // Resend credentials to existing donor
        response = await axios.post(
          `${API_URL}/hospital/donor/${donor.id}/resend-credentials`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
      } else {
        // Create new donor account
        const tempPassword = `Donor@${Math.random().toString(36).slice(-6)}`;
        response = await axios.post(
          `${API_URL}/hospital/donor`,
          {
            email: donor.email,
            password: tempPassword,
            donorName: donor.name,
            phone: donor.phone,
            bloodGroup: donor.bloodGroup
          },
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
      }

      if (response.data.success) {
        const { credentials, emailSent, emailMode } = response.data.data;
        const isTestMode = emailMode === 'ethereal';
        
        alert(
          (isResending ? '🔄 Credentials Resent Successfully!' : '✓ Donor Account Created Successfully!') + '\n\n' +
          `Email: ${credentials.email}\n` +
          `OTP: ${credentials.otp}\n` +
          `Valid for: 15 minutes\n\n` +
          (emailSent 
            ? isTestMode
              ? `📧 Email generated in TEST mode (Ethereal).\n` +
                `It will not arrive in real mailbox until SMTP is configured.`
              : `📧 Credentials email sent successfully!\n` +
                `Donor will receive login OTP in their mailbox.`
            : `⚠ Email delivery status: Pending\n` +
              `Please share credentials manually if needed.`
          ) +
          `\n\nDonor will be prompted to change password on first login.`
        );
        
        // Update local state to show credentials are issued
        donor.hasCredentials = true;
        fetchDonors(); // Refresh donor list
      }
    } catch (error) {
      console.error('Send credentials error:', error);
      const errorCode = error.response?.data?.code;
      const errorMsg = error.response?.data?.message;
      
      if (errorCode === 'EMAIL_EXISTS') {
        alert(`⚠ Account Already Exists\n\nAn account with this email already exists.\n\nPlease use "Resend Credentials" instead.`);
      } else if (errorCode === 'PHONE_EXISTS') {
        alert(`⚠ Phone Number Already Registered\n\nAn account with this phone already exists.`);
      } else {
        alert(`Error: ${errorMsg || 'Failed to send credentials'}`);
      }
    }
  };

  const toggleDonorStatus = async (donor) => {
    const newStatus = donor.status === 'active' ? 'inactive' : 'active';
    try {
      const token = localStorage.getItem('token');
      
      // Call backend to update donor status
      const response = await axios.put(
        `${API_URL}/hospital/donor/${donor.id}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.status === 200) {
        // Update local state only for THIS donor
        setDonors(prev => prev.map(d => 
          String(d.id) === String(donor.id) ? { ...d, status: newStatus } : d
        ));
        alert(`✓ Donor ${donor.name} status changed to ${newStatus}`);
      }
    } catch (error) {
      console.error('Error toggling donor status:', error);
      alert(`✗ Failed to update donor status: ${error.response?.data?.message || error.message}`);
      // Refresh to show current state
      fetchDonors();
    }
  };

  const deleteDonor = async (donor) => {
    const confirmed = window.confirm(
      `Delete donor ${donor.name}?\n\nThis will remove donor access for this hospital.`
    );

    if (!confirmed) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/hospital/donor/${donor.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert(`✓ Donor ${donor.name} deleted successfully`);
      if (selectedDonor && String(selectedDonor.id) === String(donor.id)) {
        setShowDetailModal(false);
        setSelectedDonor(null);
      }
      fetchDonors();
    } catch (error) {
      console.error('Error deleting donor:', error);
      alert(`✗ Failed to delete donor: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleAddDonor = async () => {
    if (!newDonor.name || !newDonor.email || !newDonor.phone || !newDonor.bloodGroup) {
      alert('Please fill in all required fields');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newDonor.email)) {
      alert('Please enter a valid email address');
      return;
    }

    // Validate phone format
    if (newDonor.phone.length < 10) {
      alert('Phone number must be at least 10 digits');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const tempPassword = `Donor@${Math.random().toString(36).slice(-6)}`;
      const response = await axios.post(`${API_URL}/hospital/donor`, {
        email: newDonor.email,
        password: tempPassword,
        donorName: newDonor.name,
        phone: newDonor.phone,
        bloodGroup: newDonor.bloodGroup
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const { emailSent, emailMode } = response.data.data;
      const isTestMode = emailMode === 'ethereal';
      alert(
        `✓ Donor ${newDonor.name} added successfully!\n\n` +
        `Email: ${newDonor.email}\n` +
        `Temporary Password: ${tempPassword}\n\n` +
        (emailSent 
          ? isTestMode
            ? `📧 Email generated in TEST mode (Ethereal).\n` +
              `It will not arrive in real mailbox until SMTP is configured.`
            : `📧 Credentials email sent successfully!\n` +
              `Donor will receive login OTP in their mailbox.`
          : `⚠ Email delivery status: Pending\n` +
            `Please share credentials manually if needed.`
        )
      );
      setShowAddModal(false);
      setNewDonor({ name: '', email: '', phone: '', bloodGroup: '', address: '' });
      fetchDonors();
    } catch (error) {
      console.error('Error adding donor:', error);
      const errorCode = error.response?.data?.code;
      const errorMsg = error.response?.data?.message;
      
      if (errorCode === 'EMAIL_EXISTS') {
        alert(`⚠ Account Already Exists\n\nAn account with email \"${newDonor.email}\" already exists in the system.\n\nPlease use a different email address or contact support.`);
      } else if (errorCode === 'PHONE_EXISTS') {
        alert(`⚠ Phone Number Already Registered\n\nAn account with phone \"${newDonor.phone}\" already exists in the system.\n\nPlease use a different phone number.`);
      } else {
        alert(`Error: ${errorMsg || 'Failed to add donor'}`);
      }
    }
  };

  return (
    <div className="donor-management-page">
      <TopNavbar toggleSidebar={() => {}} hospitalName="Hospital Admin - Donor Management" />
      
      <div className="donor-management-container">
        <div className="page-header">
          <button className="back-button" onClick={() => navigate('/admin/dashboard')}>
            ← Back to Dashboard
          </button>
          <div className="page-title-section">
            <h1>🩸 Donor Management</h1>
            <p>Manage donor registrations and donation history</p>
          </div>
          <button 
            className="btn-primary btn-lg"
            onClick={() => setShowAddModal(true)}
          >
            + Add New Donor
          </button>
        </div>

        {/* Enhanced Stats Cards */}
        <div className="stats-grid-enhanced">
          <div className="stat-card-enhanced">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <p className="stat-label">Total Donors</p>
              <h3 className="stat-value">{stats.total}</h3>
            </div>
            <div className="stat-trend">
              <span className="trend-positive">↑ 0%</span>
            </div>
          </div>

          <div className="stat-card-enhanced stat-card-success">
            <div className="stat-icon">✓</div>
            <div className="stat-content">
              <p className="stat-label">Active Donors</p>
              <h3 className="stat-value">{stats.active}</h3>
            </div>
            <div className="stat-trend">
              <span className="trend-positive">Available</span>
            </div>
          </div>

          <div className="stat-card-enhanced stat-card-danger">
            <div className="stat-icon">⏸</div>
            <div className="stat-content">
              <p className="stat-label">Inactive Donors</p>
              <h3 className="stat-value">{stats.inactive}</h3>
            </div>
            <div className="stat-trend">
              <span className="trend-neutral">Paused</span>
            </div>
          </div>

          <div className="stat-card-enhanced stat-card-info">
            <div className="stat-icon">🩹</div>
            <div className="stat-content">
              <p className="stat-label">Total Donations</p>
              <h3 className="stat-value">{stats.totalDonations}</h3>
            </div>
            <div className="stat-trend">
              <span className="trend-neutral">lifetime</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="filters-bar">
          <div className="filter-tabs">
            <button 
              className={filter === 'all' ? 'active' : ''}
              onClick={() => setFilter('all')}
            >
              All ({donors.length})
            </button>
            <button 
              className={filter === 'active' ? 'active' : ''}
              onClick={() => setFilter('active')}
            >
              Active ({stats.active})
            </button>
            <button 
              className={filter === 'inactive' ? 'active' : ''}
              onClick={() => setFilter('inactive')}
            >
              Inactive ({stats.inactive})
            </button>
          </div>
          <input
            type="search"
            placeholder="Search by name, blood group, email, phone, donor ID..."
            className="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Donors Table */}
        <div className="data-table-container">
          {loading ? (
            <div className="empty-state" style={{ padding: '32px 16px' }}>
              <div className="empty-icon">⏳</div>
              <p className="empty-text">Loading donors...</p>
            </div>
          ) : null}

          {!loading && filteredDonors.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px 16px' }}>
              <div className="empty-icon">🔍</div>
              <p className="empty-text">No donors found</p>
              <p className="empty-subtext">Try changing filters or search keywords</p>
            </div>
          ) : null}

          {!loading && filteredDonors.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Donor ID</th>
                <th>Name</th>
                <th>Blood Group</th>
                <th>Last Donation</th>
                <th>Total Donations</th>
                <th>Next Eligible</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDonors.map(donor => (
                <tr key={donor.id}>
                  <td><strong>{donor.id}</strong></td>
                  <td>
                    <div className="user-cell">
                      <div className="user-avatar">{donor.name.charAt(0)}</div>
                      <div>
                        <div className="user-name">{donor.name}</div>
                        <div className="user-meta">{donor.email}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className="blood-group-badge">{donor.bloodGroup}</span></td>
                  <td>{formatDate(donor.lastDonation)}</td>
                  <td><strong>{donor.totalDonations}</strong></td>
                  <td>{formatDate(donor.eligibleDate)}</td>
                  <td><StatusBadge status={donor.status} /></td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="btn-sm btn-primary"
                        onClick={() => viewDonorDetails(donor)}
                      >
                        View
                      </button>
                      <button
                        className="btn-sm btn-primary"
                        onClick={() => sendCredentials(donor)}
                      >
                        {donor.hasCredentials ? 'Resend' : 'Send'}
                      </button>
                      <button 
                        className={`btn-sm ${donor.status === 'active' ? 'btn-danger' : 'btn-success'}`}
                        onClick={() => toggleDonorStatus(donor)}
                      >
                        {donor.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        className="btn-sm btn-danger"
                        onClick={() => deleteDonor(donor)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          ) : null}
        </div>

        {/* Donor Detail Modal */}
        <Modal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          title="Donor Details"
        >
          {selectedDonor && (
            <div className="donor-details">
              <div className="detail-section">
                <h4>Personal Information</h4>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">Name:</span>
                    <span className="detail-value">{selectedDonor.name}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Donor ID:</span>
                    <span className="detail-value">{selectedDonor.id}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Blood Group:</span>
                    <span className="blood-group-badge">{selectedDonor.bloodGroup}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Status:</span>
                    <StatusBadge status={selectedDonor.status} />
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Email:</span>
                    <span className="detail-value">{selectedDonor.email}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Phone:</span>
                    <span className="detail-value">{selectedDonor.phone}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Credentials:</span>
                    <span className="detail-value">{selectedDonor.hasCredentials ? 'Issued' : 'Not Issued'}</span>
                  </div>
                  <div className="detail-item full-width">
                    <span className="detail-label">Address:</span>
                    <span className="detail-value">{selectedDonor.address}</span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h4>Donation History</h4>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">Total Donations:</span>
                    <span className="detail-value"><strong>{selectedDonor.totalDonations}</strong></span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Last Donation:</span>
                    <span className="detail-value">{formatDate(selectedDonor.lastDonation)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Next Eligible:</span>
                    <span className="detail-value">{formatDate(selectedDonor.eligibleDate)}</span>
                  </div>
                </div>
              </div>

              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setShowDetailModal(false)}>
                  Close
                </button>
                {!selectedDonor.hasCredentials && (
                  <button 
                    className="btn-primary"
                    onClick={() => {
                      sendCredentials(selectedDonor);
                      setShowDetailModal(false);
                    }}
                  >
                    Send Credentials
                  </button>
                )}
                {selectedDonor.hasCredentials && (
                  <button 
                    className="btn-primary"
                    onClick={() => {
                      sendCredentials(selectedDonor);
                      setShowDetailModal(false);
                    }}
                  >
                    🔄 Resend Credentials
                  </button>
                )}
                <button 
                  className="btn-primary"
                  onClick={() => {
                    setShowDetailModal(false);
                    navigate('/admin/blood-requests');
                  }}
                >
                  View Full History
                </button>
                <button
                  className="btn-danger"
                  onClick={() => deleteDonor(selectedDonor)}
                >
                  Delete Donor
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* Add Donor Modal */}
        <Modal
          isOpen={showAddModal}
          onClose={() => {
            setShowAddModal(false);
            setNewDonor({
              name: '',
              email: '',
              phone: '',
              bloodGroup: '',
              address: ''
            });
          }}
          title="Add New Donor"
        >
          <div className="form-container">
            <div className="form-grid">
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={newDonor.name}
                  onChange={(e) => setNewDonor({ ...newDonor, name: e.target.value })}
                  placeholder="Enter donor name"
                />
              </div>

              <div className="form-group">
                <label>Blood Group *</label>
                <select
                  className="form-select"
                  value={newDonor.bloodGroup}
                  onChange={(e) => setNewDonor({ ...newDonor, bloodGroup: e.target.value })}
                >
                  <option value="">Select Blood Group</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>

              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  className="form-input"
                  value={newDonor.email}
                  onChange={(e) => setNewDonor({ ...newDonor, email: e.target.value })}
                  placeholder="donor@email.com"
                />
              </div>

              <div className="form-group">
                <label>Phone Number *</label>
                <input
                  type="tel"
                  className="form-input"
                  value={newDonor.phone}
                  onChange={(e) => setNewDonor({ ...newDonor, phone: e.target.value })}
                  placeholder="+1 234-567-8900"
                />
              </div>

              <div className="form-group full-width">
                <label>Address</label>
                <textarea
                  className="form-textarea"
                  rows="3"
                  value={newDonor.address}
                  onChange={(e) => setNewDonor({ ...newDonor, address: e.target.value })}
                  placeholder="Enter full address"
                />
              </div>
            </div>

            <div className="modal-actions">
              <button 
                className="btn-secondary"
                onClick={() => setShowAddModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn-primary"
                onClick={handleAddDonor}
              >
                Add Donor
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}

export default DonorManagement;
