import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { appointmentAPI } from '../../services/communityApi';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import './MyAppointmentsPage.css';

export default function MyAppointmentsPage() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchAppointments();
  }, [filter]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await appointmentAPI.getMyAppointments(filter === 'all' ? '' : filter);
      setAppointments(response.data.appointments);
    } catch (err) {
      console.error('Error fetching appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id) => {
    const reason = prompt('Please provide a reason for cancellation:');
    if (!reason) return;
    try {
      await appointmentAPI.cancelAppointment(id, reason);
      fetchAppointments();
    } catch (err) {
      alert('Failed to cancel appointment');
    }
  };

  const getStatusColor = (status) => {
    const colors = { scheduled: 'status-scheduled', confirmed: 'status-confirmed', completed: 'status-completed', cancelled: 'status-cancelled', missed: 'status-missed' };
    return colors[status] || 'status-scheduled';
  };

  return (
    <div className="my-appointments-page">
      <header className="page-header">
        <button className="back-button" onClick={() => navigate(-1)}>← Back</button>
        <h1>My Appointments</h1>
      </header>

      <div className="filter-bar">
        <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All</button>
        <button className={filter === 'scheduled' ? 'active' : ''} onClick={() => setFilter('scheduled')}>Scheduled</button>
        <button className={filter === 'confirmed' ? 'active' : ''} onClick={() => setFilter('confirmed')}>Confirmed</button>
        <button className={filter === 'completed' ? 'active' : ''} onClick={() => setFilter('completed')}>Completed</button>
        <button className={filter === 'cancelled' ? 'active' : ''} onClick={() => setFilter('cancelled')}>Cancelled</button>
      </div>

      <div className="appointments-container">
        {loading && <LoadingSpinner message="Loading appointments..." />}
        {!loading && appointments.length === 0 && (
          <EmptyState icon="📅" title="No appointments" message="You haven't booked any appointments yet" />
        )}
        {!loading && appointments.length > 0 && (
          <div className="appointments-list">
            {appointments.map(apt => (
              <div key={apt._id} className="appointment-card">
                <div className="apt-header">
                  <h3>🏥 {apt.hospitalInfo.name}</h3>
                  <span className={`status-badge ${getStatusColor(apt.status)}`}>{apt.status}</span>
                </div>
                <div className="apt-details">
                  <p><strong>Blood Group:</strong> <span className="blood-badge">{apt.bloodGroup}</span></p>
                  <p><strong>Date:</strong> {new Date(apt.scheduledDate).toLocaleDateString()}</p>
                  <p><strong>Time:</strong> {apt.scheduledTime}</p>
                  <p><strong>Location:</strong> {apt.hospitalInfo.address}</p>
                  <p><strong>Contact:</strong> {apt.hospitalInfo.phone}</p>
                  {apt.notes && <p><strong>Notes:</strong> {apt.notes}</p>}
                  {apt.cancellationReason && <p className="cancel-reason"><strong>Cancellation Reason:</strong> {apt.cancellationReason}</p>}
                </div>
                {(apt.status === 'scheduled' || apt.status === 'confirmed') && (
                  <button onClick={() => handleCancel(apt._id)} className="btn-danger">Cancel Appointment</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
