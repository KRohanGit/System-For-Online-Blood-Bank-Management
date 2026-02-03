import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import '../../styles/admin.css';

function Settings() {
  const navigate = useNavigate();
  const defaultSettings = {
    hospitalName: 'City General Hospital',
    email: 'admin@admin.com',
    phone: '1234567890',
    address: 'Gitam RushiKonda Visakhapatnam, Andhra Pradesh, 530045',
    emergencyContact: '1234567890',
    // Notification Settings
    emailNotifications: true,
    smsNotifications: true,
    emergencyAlerts: true,
    lowStockAlerts: true,
    donorRegistrations: false,
    // System Settings
    autoApproveHospitals: false,
    requireDoctorCertificate: true,
    minBloodStock: 5,
    emergencyThreshold: 3
  };

  const [settings, setSettings] = useState(defaultSettings);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    // Load settings from localStorage on mount
    const savedSettings = localStorage.getItem('hospitalSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...defaultSettings, ...parsed });
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    }
  }, []);

  const handleChange = (field, value) => {
    setSettings({ ...settings, [field]: value });
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    try {
      // TODO: Replace with actual API call
      // await settingsAPI.update(settings);
      
      // Save to localStorage
      localStorage.setItem('hospitalSettings', JSON.stringify(settings));
      
      setHasUnsavedChanges(false);
      alert('✅ Settings saved successfully!');
      console.log('Saved settings:', settings);
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('❌ Failed to save settings. Please try again.');
    }
  };

  return (
    <DashboardLayout>
      <div className="settings-page">
        <div className="page-header">
          <button className="back-button" onClick={() => navigate('/admin/dashboard')}>
            ← Back
          </button>
          <div className="page-title-section">
            <h1>Settings</h1>
            <p>Manage system configuration and preferences</p>
            {hasUnsavedChanges && (
              <span className="badge badge-warning" style={{ marginLeft: '8px' }}>Unsaved Changes</span>
            )}
          </div>
          <button 
            className="btn-primary" 
            onClick={handleSave}
            disabled={!hasUnsavedChanges}
          >
            💾 Save Changes
          </button>
        </div>

        <div className="settings-container">
          {/* Hospital Information */}
          <div className="settings-section">
            <h3>🏥 Hospital Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Hospital Name</label>
                <input
                  type="text"
                  value={settings.hospitalName}
                  onChange={(e) => handleChange('hospitalName', e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={settings.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  value={settings.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Emergency Contact</label>
                <input
                  type="tel"
                  value={settings.emergencyContact}
                  onChange={(e) => handleChange('emergencyContact', e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group full-width">
                <label>Address</label>
                <textarea
                  value={settings.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  rows="2"
                  className="form-textarea"
                />
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="settings-section">
            <h3>🔔 Notification Settings</h3>
            <div className="settings-toggles">
              <div className="toggle-item">
                <div className="toggle-info">
                  <h4>Email Notifications</h4>
                  <p>Receive notifications via email</p>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.emailNotifications}
                    onChange={(e) => handleChange('emailNotifications', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="toggle-item">
                <div className="toggle-info">
                  <h4>SMS Notifications</h4>
                  <p>Receive notifications via SMS</p>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.smsNotifications}
                    onChange={(e) => handleChange('smsNotifications', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="toggle-item">
                <div className="toggle-info">
                  <h4>Emergency Alerts</h4>
                  <p>Get instant alerts for emergency blood requests</p>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.emergencyAlerts}
                    onChange={(e) => handleChange('emergencyAlerts', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="toggle-item">
                <div className="toggle-info">
                  <h4>Low Stock Alerts</h4>
                  <p>Notify when blood stock falls below threshold</p>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.lowStockAlerts}
                    onChange={(e) => handleChange('lowStockAlerts', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="toggle-item">
                <div className="toggle-info">
                  <h4>Donor Registrations</h4>
                  <p>Notify on new donor registrations</p>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.donorRegistrations}
                    onChange={(e) => handleChange('donorRegistrations', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>

          {/* System Settings */}
          <div className="settings-section">
            <h3>⚙️ System Configuration</h3>
            <div className="settings-toggles">
              <div className="toggle-item">
                <div className="toggle-info">
                  <h4>Auto-Approve Hospitals</h4>
                  <p>Automatically approve verified hospital registrations</p>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.autoApproveHospitals}
                    onChange={(e) => handleChange('autoApproveHospitals', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="toggle-item">
                <div className="toggle-info">
                  <h4>Require Doctor Certificate</h4>
                  <p>Mandate certificate upload for doctor registration</p>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.requireDoctorCertificate}
                    onChange={(e) => handleChange('requireDoctorCertificate', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Minimum Blood Stock Level (units)</label>
                <input
                  type="number"
                  min="1"
                  value={settings.minBloodStock}
                  onChange={(e) => handleChange('minBloodStock', parseInt(e.target.value))}
                  className="form-input"
                />
                <small className="form-hint">Alert when stock falls below this level</small>
              </div>

              <div className="form-group">
                <label>Emergency Threshold (units)</label>
                <input
                  type="number"
                  min="1"
                  value={settings.emergencyThreshold}
                  onChange={(e) => handleChange('emergencyThreshold', parseInt(e.target.value))}
                  className="form-input"
                />
                <small className="form-hint">Critical alert when stock falls below this</small>
              </div>
            </div>
          </div>

          {/* Security Settings */}
          <div className="settings-section">
            <h3>🔒 Security Settings</h3>
            <div className="security-actions">
              <button className="btn-secondary btn-block">
                Change Password
              </button>
              <button className="btn-secondary btn-block">
                Two-Factor Authentication
              </button>
              <button className="btn-secondary btn-block">
                View Login History
              </button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="settings-section danger-zone">
            <h3>⚠️ Danger Zone</h3>
            <div className="danger-actions">
              <div className="danger-item">
                <div className="danger-info">
                  <h4>Clear All Logs</h4>
                  <p>Permanently delete all audit logs (not recommended)</p>
                </div>
                <button className="btn-danger">Clear Logs</button>
              </div>
              <div className="danger-item">
                <div className="danger-info">
                  <h4>Reset All Settings</h4>
                  <p>Restore default system settings</p>
                </div>
                <button className="btn-danger">Reset Settings</button>
              </div>
            </div>
          </div>

          {/* Save Button (Bottom) */}
          <div className="settings-footer">
            <button className="btn-primary btn-lg" onClick={handleSave}>
              💾 Save All Changes
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default Settings;
