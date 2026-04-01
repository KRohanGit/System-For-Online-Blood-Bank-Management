import React, { useState } from 'react';
import './UsageForm.css';

const UsageForm = ({ unitId, onComplete }) => {
  const [formData, setFormData] = useState({
    hospital: '',
    ageGroup: '',
    procedure: '',
    urgency: 'scheduled',
    outcome: 'successful'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const ageGroups = [
    { value: 'newborn', label: '0-1 months (Newborn)' },
    { value: 'infant', label: '1-12 months (Infant)' },
    { value: 'toddler', label: '1-3 years (Toddler)' },
    { value: 'child', label: '3-12 years (Child)' },
    { value: 'adolescent', label: '13-18 years (Adolescent)' },
    { value: 'adult', label: '18-65 years (Adult)' },
    { value: 'senior', label: '65+ years (Senior)' }
  ];

  const procedures = [
    { value: 'surgery', label: 'Surgery' },
    { value: 'trauma', label: 'Trauma' },
    { value: 'anemia', label: 'Anemia Treatment' },
    { value: 'cancer', label: 'Cancer Treatment' },
    { value: 'transfusion', label: 'Transfusion Reaction' },
    { value: 'disease', label: 'Blood Disease' },
    { value: 'emergency', label: 'Emergency' },
    { value: 'other', label: 'Other' }
  ];

  const urgencies = [
    { value: 'emergency', label: 'Emergency (Immediate)' },
    { value: 'urgent', label: 'Urgent (Within hours)' },
    { value: 'scheduled', label: 'Scheduled (Planned)' }
  ];

  const outcomes = [
    { value: 'successful', label: 'Successful ✓' },
    { value: 'partial', label: 'Partial Transfer' },
    { value: 'failed', label: 'Failed' },
    { value: 'adverse', label: 'Adverse Reaction' },
    { value: 'unknown', label: 'Unknown' }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      if (!formData.hospital) {
        throw new Error('Please enter hospital name');
      }
      if (!formData.ageGroup) {
        throw new Error('Please select age group');
      }
      if (!formData.procedure) {
        throw new Error('Please select procedure type');
      }

      await onComplete(formData);
      setSuccess(true);
      setFormData({
        hospital: '',
        ageGroup: '',
        procedure: '',
        urgency: 'scheduled',
        outcome: 'successful'
      });
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message || 'Failed to record usage');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="usage-form-container">
      <h3>Record Blood Unit Usage (Transfusion)</h3>
      
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">Transfusion recorded successfully!</div>}

      <form onSubmit={handleSubmit} className="usage-form">
        <div className="form-section">
          <h4>Hospital Information</h4>

          <div className="form-group">
            <label htmlFor="hospital">Hospital/Facility Name *</label>
            <input
              id="hospital"
              type="text"
              name="hospital"
              placeholder="e.g., Apollo Hospital, Government Medical College"
              value={formData.hospital}
              onChange={handleInputChange}
              required
              disabled={loading}
            />
          </div>
        </div>

        <div className="form-section">
          <h4>Patient Information</h4>

          <div className="form-group">
            <label htmlFor="ageGroup">Patient Age Group *</label>
            <select
              id="ageGroup"
              name="ageGroup"
              value={formData.ageGroup}
              onChange={handleInputChange}
              required
              disabled={loading}
            >
              <option value="">Select age group...</option>
              {ageGroups.map(group => (
                <option key={group.value} value={group.value}>
                  {group.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="procedure">Procedure Type *</label>
            <select
              id="procedure"
              name="procedure"
              value={formData.procedure}
              onChange={handleInputChange}
              required
              disabled={loading}
            >
              <option value="">Select procedure...</option>
              {procedures.map(proc => (
                <option key={proc.value} value={proc.value}>
                  {proc.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-section">
          <h4>Transfusion Details</h4>

          <div className="form-group">
            <label htmlFor="urgency">Urgency Level *</label>
            <select
              id="urgency"
              name="urgency"
              value={formData.urgency}
              onChange={handleInputChange}
              disabled={loading}
            >
              {urgencies.map(urg => (
                <option key={urg.value} value={urg.value}>
                  {urg.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="outcome">Transfusion Outcome *</label>
            <select
              id="outcome"
              name="outcome"
              value={formData.outcome}
              onChange={handleInputChange}
              disabled={loading}
            >
              {outcomes.map(out => (
                <option key={out.value} value={out.value}>
                  {out.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-info">
          <p>
            <strong>Note:</strong> This record will be permanently stored on the blockchain 
            and linked to the blood unit's lifecycle. Please ensure all information is accurate.
          </p>
        </div>

        <div className="form-actions">
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Recording Transfusion...' : 'Record Transfusion'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UsageForm;
