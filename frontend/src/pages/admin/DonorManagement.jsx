import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import '../../styles/admin.css';

function DonorManagement() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDonor, setSelectedDonor] = useState(null);
  const [newDonor, setNewDonor] = useState({
    name: '',
    email: '',
    phone: '',
    bloodGroup: '',
    address: ''
  });

  const donors = [
    {
      id: 'D001',
      name: 'Rohan',
      email: 'rohan.k@email.com',
      phone: '+91 98765-43210',
      bloodGroup: 'O+',
      lastDonation: '2025-11-15',
      totalDonations: 8,
      status: 'active',
      eligibleDate: '2026-02-15',
      address: '123 MG Road, Bangalore',
      hasCredentials: false
    },
    {
      id: 'D002',
      name: 'Dinesh',
      email: 'dinesh.k@email.com',
      phone: '+91 98765-43211',
      bloodGroup: 'A+',
      lastDonation: '2025-10-20',
      totalDonations: 12,
      status: 'active',
      eligibleDate: '2026-01-20',
      address: '456 Hitech City, Hyderabad',
      hasCredentials: true
    },
    {
      id: 'D003',
      name: 'Gaveshna',
      email: 'gaveshna.l@email.com',
      phone: '+91 98765-43212',
      bloodGroup: 'B+',
      lastDonation: '2024-06-10',
      totalDonations: 5,
      status: 'inactive',
      eligibleDate: 'Eligible Now',
      address: '789 Anna Nagar, Chennai',
      hasCredentials: false
    },
    {
      id: 'D004',
      name: 'Giri G',
      email: 'giri.g@email.com',
      phone: '+91 98765-43213',
      bloodGroup: 'AB+',
      lastDonation: '2025-12-01',
      totalDonations: 15,
      status: 'active',
      eligibleDate: '2026-03-01',
      address: '321 Jubilee Hills, Hyderabad',
      hasCredentials: true
    }
  ];

  const filteredDonors = donors.filter(donor => 
    filter === 'all' ? true : donor.status === filter
  );

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

  const sendCredentials = (donor) => {
    const tempPassword = Math.random().toString(36).slice(-8);
    alert(`✅ Credentials sent to ${donor.name}\n\nEmail: ${donor.email}\nTemporary Password: ${tempPassword}\n\nDonor will be prompted to change password on first login.`);
  };

  const toggleDonorStatus = (donor) => {
    const newStatus = donor.status === 'active' ? 'inactive' : 'active';
    alert(`Donor ${donor.name} status changed to ${newStatus}`);
  };

  const handleAddDonor = () => {
    if (!newDonor.name || !newDonor.email || !newDonor.phone || !newDonor.bloodGroup) {
      alert('Please fill in all required fields');
      return;
    }

    // TODO: Replace with actual API call
    // await donorAPI.create(newDonor);
    
    alert(`✅ Donor ${newDonor.name} added successfully!`);
    setShowAddModal(false);
    setNewDonor({
      name: '',
      email: '',
      phone: '',
      bloodGroup: '',
      address: ''
    });
  };

  return (
    <DashboardLayout>
      <div className="donor-management">
        <div className="page-header">
          <button className="back-button" onClick={() => navigate('/admin/dashboard')}>
            ← Back
          </button>
          <div className="page-title-section">
            <h1>Donor Management</h1>
            <p>Manage donor registrations and donation history</p>
          </div>
          <button 
            className="btn-primary"
            onClick={() => setShowAddModal(true)}
          >
            + Add New Donor
          </button>
        </div>

        {/* Stats */}
        <div className="stats-grid-sm">
          <div className="stat-card-sm">
            <h4>Total Donors</h4>
            <p className="stat-value-lg">{stats.total}</p>
          </div>
          <div className="stat-card-sm">
            <h4>Active Donors</h4>
            <p className="stat-value-lg text-green">{stats.active}</p>
          </div>
          <div className="stat-card-sm">
            <h4>Inactive Donors</h4>
            <p className="stat-value-lg text-red">{stats.inactive}</p>
          </div>
          <div className="stat-card-sm">
            <h4>Total Donations</h4>
            <p className="stat-value-lg">{stats.totalDonations}</p>
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
          <input type="search" placeholder="Search donors..." className="search-input" />
        </div>

        {/* Donors Table */}
        <div className="data-table-container">
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
                  <td>{new Date(donor.lastDonation).toLocaleDateString()}</td>
                  <td><strong>{donor.totalDonations}</strong></td>
                  <td>{donor.eligibleDate}</td>
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
                        className={`btn-sm ${donor.status === 'active' ? 'btn-danger' : 'btn-success'}`}
                        onClick={() => toggleDonorStatus(donor)}
                      >
                        {donor.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
                    <span className="detail-value">{selectedDonor.hasCredentials ? '✅ Issued' : '❌ Not Issued'}</span>
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
                    <span className="detail-value">{new Date(selectedDonor.lastDonation).toLocaleDateString()}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Next Eligible:</span>
                    <span className="detail-value">{selectedDonor.eligibleDate}</span>
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
                <button className="btn-primary">
                  View Full History
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
    </DashboardLayout>
  );
}

export default DonorManagement;
