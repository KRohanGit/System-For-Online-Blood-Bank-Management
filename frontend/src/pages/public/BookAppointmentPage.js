import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { appointmentAPI } from '../../services/communityApi';
import './BookAppointmentPage.css';

export default function BookAppointmentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const hospital = location.state?.hospital;
  
  const [formData, setFormData] = useState({
    bloodGroup: '',
    scheduledDate: '',
    scheduledTime: '10:00',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  if (!hospital) {
    navigate('/hospitals');
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await appointmentAPI.createAppointment({
        hospitalId: hospital._id,
        ...formData
      });
      alert('Appointment booked successfully!');
      navigate('/appointments/my-appointments');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to book appointment');
      setSubmitting(false);
    }
  };

  return (
    <div className="book-appointment-page">
      <header className="page-header">
        <button className="back-button" onClick={() => navigate(-1)}>← Back</button>
        <h1>Book Appointment</h1>
      </header>

      <div className="form-container">
        <div className="hospital-info-card">
          <h2>🏥 {hospital.hospitalName}</h2>
          <p>{hospital.address}, {hospital.city}</p>
          <p>📞 {hospital.phone}</p>
        </div>

        <form onSubmit={handleSubmit} className="appointment-form">
          <div className="form-group">
            <label>Blood Group *</label>
            <select value={formData.bloodGroup} onChange={(e) => setFormData({...formData, bloodGroup: e.target.value})} required>
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
            <label>Preferred Date *</label>
            <input type="date" value={formData.scheduledDate} onChange={(e) => setFormData({...formData, scheduledDate: e.target.value})} min={new Date().toISOString().split('T')[0]} required />
          </div>

          <div className="form-group">
            <label>Preferred Time *</label>
            <select value={formData.scheduledTime} onChange={(e) => setFormData({...formData, scheduledTime: e.target.value})} required>
              <option value="09:00">09:00 AM</option>
              <option value="10:00">10:00 AM</option>
              <option value="11:00">11:00 AM</option>
              <option value="12:00">12:00 PM</option>
              <option value="14:00">02:00 PM</option>
              <option value="15:00">03:00 PM</option>
              <option value="16:00">04:00 PM</option>
              <option value="17:00">05:00 PM</option>
            </select>
          </div>

          <div className="form-group">
            <label>Additional Notes</label>
            <textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} rows={4} placeholder="Any special requests or medical information..." />
          </div>

          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Booking...' : 'Confirm Appointment'}
          </button>
        </form>
      </div>
    </div>
  );
}
