import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getAllUnits,
  getStockOverview,
  addUnit,
  reserveUnit,
  issueUnit,
  deleteUnit
} from '../../services/bloodInventoryApi';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StockCard from '../../components/bloodInventory/StockCard';
import BloodUnitRow from '../../components/bloodInventory/BloodUnitRow';
import FilterBar from '../../components/bloodInventory/FilterBar';
import AddUnitForm from '../../components/bloodInventory/AddUnitForm';
import Modal from '../../components/common/Modal';
import LifecycleViewer from '../../components/bloodInventory/LifecycleViewer';
import ExpiryWatch from '../../components/bloodInventory/ExpiryWatch';
import EmergencyReleaseModal from '../../components/bloodInventory/EmergencyReleaseModal';
import FIFOSuggestionsPanel from '../../components/bloodInventory/FIFOSuggestionsPanel';
import '../../styles/blood-inventory.css';
import '../../styles/stock-card.css';
import '../../styles/blood-unit-row.css';
import '../../styles/filter-bar.css';
import '../../styles/add-unit-form.css';

const BloodInventoryPage = () => {
  // State management
  const [stockOverview, setStockOverview] = useState([]);
  const [bloodUnits, setBloodUnits] = useState([]);
  const [filters, setFilters] = useState({
    bloodGroup: '',
    status: '',
    page: 1,
    limit: 20
  });
  const [totalUnits, setTotalUnits] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLifecycleModal, setShowLifecycleModal] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState(null);

  // Fetch stock overview on mount
  useEffect(() => {
    fetchStockOverview();
  }, []);

  // Fetch blood units when filters change
  useEffect(() => {
    if (activeTab === 'overview') {
      fetchBloodUnits();
    }
  }, [filters, activeTab]);

  const fetchStockOverview = async () => {
    try {
      setError(null);
      const data = await getStockOverview();
      setStockOverview(data.stockOverview || []);
    } catch (error) {
      console.error('Failed to fetch stock overview:', error);
      setError('Failed to load stock overview. Using default view.');
      // Set default stock overview if API fails
      setStockOverview([
        { bloodGroup: 'A+', available: 0, reserved: 0, total: 0, status: 'critical' },
        { bloodGroup: 'A-', available: 0, reserved: 0, total: 0, status: 'critical' },
        { bloodGroup: 'B+', available: 0, reserved: 0, total: 0, status: 'critical' },
        { bloodGroup: 'B-', available: 0, reserved: 0, total: 0, status: 'critical' },
        { bloodGroup: 'AB+', available: 0, reserved: 0, total: 0, status: 'critical' },
        { bloodGroup: 'AB-', available: 0, reserved: 0, total: 0, status: 'critical' },
        { bloodGroup: 'O+', available: 0, reserved: 0, total: 0, status: 'critical' },
        { bloodGroup: 'O-', available: 0, reserved: 0, total: 0, status: 'critical' }
      ]);
    }
  };

  const fetchBloodUnits = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllUnits(filters);
      setBloodUnits(data.units || []);
      setTotalUnits(data.total || 0);
    } catch (error) {
      console.error('Failed to fetch blood units:', error);
      setError('Failed to load blood units. Please check your connection and try again.');
      setBloodUnits([]);
      setTotalUnits(0);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUnit = async (unitData) => {
    setLoading(true);
    try {
      await addUnit(unitData);
      setShowAddModal(false);
      fetchStockOverview();
      fetchBloodUnits();
      alert('Blood unit added successfully!');
    } catch (error) {
      alert('Failed to add unit: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReserve = async (unitId) => {
    const patientId = prompt('Enter Patient ID:');
    if (!patientId) return;

    try {
      await reserveUnit(unitId, patientId);
      fetchBloodUnits();
      alert('Unit reserved successfully!');
    } catch (error) {
      alert('Failed to reserve: ' + error.message);
    }
  };

  const handleIssue = async (unitId) => {
    const patientId = prompt('Enter Patient ID:');
    if (!patientId) return;

    try {
      await issueUnit(unitId, patientId);
      fetchBloodUnits();
      fetchStockOverview();
      alert('Unit issued successfully!');
    } catch (error) {
      alert('Failed to issue: ' + error.message);
    }
  };

  const handleDelete = async (unitId) => {
    if (!window.confirm('Are you sure you want to delete this unit?')) return;

    try {
      await deleteUnit(unitId);
      fetchBloodUnits();
      fetchStockOverview();
      alert('Unit deleted successfully!');
    } catch (error) {
      alert('Failed to delete: ' + error.message);
    }
  };

  const handleViewLifecycle = (unit) => {
    setSelectedUnit(unit);
    setShowLifecycleModal(true);
  };

  const handleFilterChange = (newFilters) => {
    setFilters({ ...filters, ...newFilters });
  };

  const handleClearFilters = () => {
    setFilters({ bloodGroup: '', status: '', page: 1, limit: 20 });
  };

  const handlePageChange = (newPage) => {
    setFilters({ ...filters, page: newPage });
  };

  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <div className="blood-inventory-page">
        <div className="page-header">
          <button className="back-button" onClick={() => navigate('/admin/dashboard')}>
            ← Back
          </button>
          <div className="page-title-section">
            <h1>Blood Inventory Management</h1>
            <p className="page-subtitle">Manage blood units, track inventory, and monitor stock levels</p>
          </div>
          <div className="header-actions">
          <button 
            className="btn-emergency"
            onClick={() => setShowEmergencyModal(true)}
          >
            🚨 Emergency Release
          </button>
          <button 
            className="btn-primary"
            onClick={() => setShowAddModal(true)}
          >
            + Add Blood Unit
          </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="alert alert-warning" style={{ marginBottom: '20px' }}>
            ⚠️ {error}
          </div>
        )}

      {/* Tab Navigation */}
      <div className="page-tabs">
        <button 
          className={activeTab === 'overview' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview
        </button>
        <button 
          className={activeTab === 'expiry' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('expiry')}
        >
          ⏰ Expiry Watch
        </button>
        <button 
          className={activeTab === 'fifo' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('fifo')}
        >
          🔄 FIFO Suggestions
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <>
          {/* Stock Overview Grid */}
          <div className="stock-overview-section">
            <h2>Stock Overview</h2>
            <div className="stock-grid">
              {stockOverview.map((stock) => (
                <StockCard
                  key={stock.bloodGroup}
                  bloodGroup={stock.bloodGroup}
                  units={stock.availableUnits}
                  status={stock.status}
                  expiringSoon={stock.expiringSoon}
                  lastUpdated={stock.lastUpdated}
                  onAction={() => {
                    setFilters({ ...filters, bloodGroup: stock.bloodGroup, page: 1 });
                  }}
                />
              ))}
            </div>
          </div>

          {/* Filter Bar */}
          <FilterBar
            filters={filters}
            onFilterChange={handleFilterChange}
            onClear={handleClearFilters}
          />

          {/* Blood Units Table */}
          <div className="blood-units-section">
            <div className="section-header">
              <h2>All Blood Units ({totalUnits})</h2>
            </div>

            {loading ? (
              <div className="loading">Loading blood units...</div>
            ) : bloodUnits.length === 0 ? (
              <div className="no-data">No blood units found</div>
            ) : (
              <>
                <table className="blood-units-table">
                  <thead>
                    <tr>
                      <th>Unit ID</th>
                      <th>Blood Group</th>
                      <th>Storage Type</th>
                      <th>Location</th>
                      <th>Collection Date</th>
                      <th>Expiry Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bloodUnits.map((unit) => (
                      <BloodUnitRow
                        key={unit._id}
                        unit={unit}
                        onReserve={handleReserve}
                        onIssue={handleIssue}
                        onViewLifecycle={handleViewLifecycle}
                        onDelete={handleDelete}
                      />
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                <div className="pagination">
                  <button
                    disabled={filters.page === 1}
                    onClick={() => handlePageChange(filters.page - 1)}
                  >
                    Previous
                  </button>
                  <span>
                    Page {filters.page} of {Math.ceil(totalUnits / filters.limit)}
                  </span>
                  <button
                    disabled={filters.page >= Math.ceil(totalUnits / filters.limit)}
                    onClick={() => handlePageChange(filters.page + 1)}
                  >
                    Next
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {activeTab === 'expiry' && <ExpiryWatch />}

      {activeTab === 'fifo' && (
        <FIFOSuggestionsPanel
          onIssue={handleIssue}
          onReserve={handleReserve}
          refresh={filters.page}
        />
      )}
      </div>

      {/* Add Unit Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Blood Unit"
        size="large"
      >
        <AddUnitForm
          onSubmit={handleAddUnit}
          onCancel={() => setShowAddModal(false)}
          loading={loading}
        />
      </Modal>

      {/* Lifecycle Modal */}
      <Modal
        isOpen={showLifecycleModal}
        onClose={() => setShowLifecycleModal(false)}
        title=""
        size="large"
      >
        <LifecycleViewer
          unit={selectedUnit}
          onClose={() => setShowLifecycleModal(false)}
        />
      </Modal>

      {/* Emergency Release Modal */}
      <Modal
        isOpen={showEmergencyModal}
        onClose={() => setShowEmergencyModal(false)}
        title=""
        size="medium"
      >
        <EmergencyReleaseModal
          onSuccess={() => {
            fetchStockOverview();
            fetchBloodUnits();
          }}
          onClose={() => setShowEmergencyModal(false)}
        />
      </Modal>
    </DashboardLayout>
  );
};

export default BloodInventoryPage;
