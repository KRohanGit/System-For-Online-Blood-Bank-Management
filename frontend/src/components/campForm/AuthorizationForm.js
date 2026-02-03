import React from 'react';

export default function AuthorizationForm({ formData, setFormData, file, setFile }) {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      authorization: { ...prev.authorization, [name]: value }
    }));
  };

  return (
    <div className="form-section">
      <h3>Authorization & Compliance</h3>
      
      <div className="form-row">
        <div className="form-group">
          <label>Permission Status *</label>
          <select
            name="permissionStatus"
            value={formData.authorization.permissionStatus}
            onChange={handleChange}
            required
          >
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Not Required">Not Required</option>
          </select>
        </div>

        <div className="form-group">
          <label>Issuing Authority</label>
          <input
            type="text"
            name="issuingAuthority"
            value={formData.authorization.issuingAuthority}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="form-group">
        <label>Reference Letter (Optional - Will be encrypted)</label>
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={(e) => setFile(e.target.files[0])}
        />
        <small>Accepted formats: PDF, JPG, PNG. File will be encrypted using AES-256.</small>
      </div>
    </div>
  );
}
