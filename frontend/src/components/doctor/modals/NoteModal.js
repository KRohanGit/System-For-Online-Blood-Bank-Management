import React, { useState } from 'react';
import './NoteModal.css';

const NoteModal = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    entityType: '',
    entityId: '',
    title: '',
    clinicalNote: '',
    decision: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h3>Add Medical Note</h3>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>

        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Related To *</label>
              <select name="entityType" value={formData.entityType} onChange={handleChange} required>
                <option value="">Select Type</option>
                <option value="blood_request">Blood Request</option>
                <option value="donor">Donor</option>
                <option value="blood_unit">Blood Unit</option>
                <option value="camp">Blood Camp</option>
                <option value="reaction">Adverse Reaction</option>
                <option value="general">General Note</option>
              </select>
            </div>

            {formData.entityType !== 'general' && (
              <div className="form-group">
                <label>Entity ID *</label>
                <input
                  type="text"
                  name="entityId"
                  value={formData.entityId}
                  onChange={handleChange}
                  required
                  placeholder="ID of the related entity"
                />
              </div>
            )}

            <div className="form-group">
              <label>Title *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                placeholder="Brief title for the note"
              />
            </div>

            <div className="form-group">
              <label>Clinical Note *</label>
              <textarea
                name="clinicalNote"
                value={formData.clinicalNote}
                onChange={handleChange}
                rows="6"
                required
                placeholder="Detailed clinical note, observations, and recommendations..."
              ></textarea>
            </div>

            {formData.entityType && formData.entityType !== 'general' && (
              <div className="form-group">
                <label>Decision/Outcome</label>
                <select name="decision" value={formData.decision} onChange={handleChange}>
                  <option value="">Select Decision</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="pending">Pending</option>
                  <option value="deferred">Deferred</option>
                  <option value="observation">Under Observation</option>
                </select>
              </div>
            )}

            <div className="form-actions">
              <button type="button" onClick={onClose} className="btn-cancel">Cancel</button>
              <button type="submit" className="btn-submit">Save Note</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default NoteModal;
