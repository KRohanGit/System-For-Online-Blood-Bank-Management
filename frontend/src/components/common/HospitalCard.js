import React from 'react';
import './HospitalCard.css';

export default function HospitalCard({ hospital, onViewDetails, onBookAppointment }) {
  return (
    <div className="hospital-card">
      <div className="hospital-header">
        <h3>🏥 {hospital.hospitalName}</h3>
        {hospital.bloodBankAvailable && <span className="badge-success">Blood Bank</span>}
      </div>
      <div className="hospital-info">
        <p>📍 {hospital.address}, {hospital.city}</p>
        <p>📞 {hospital.phone}</p>
        {hospital.emergencyContact && <p>🚨 Emergency: {hospital.emergencyContact}</p>}
      </div>
      <div className="hospital-actions">
        <button onClick={() => onViewDetails(hospital)} className="btn-outline-sm">View Details</button>
        <button onClick={() => onBookAppointment(hospital)} className="btn-primary-sm">Book Appointment</button>
      </div>
    </div>
  );
}
