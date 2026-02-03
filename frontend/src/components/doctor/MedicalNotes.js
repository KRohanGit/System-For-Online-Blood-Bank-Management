import React, { useState, useEffect } from 'react';
import { getMedicalNotes, addMedicalNote } from '../../services/doctorApi';
import NoteCard from './cards/NoteCard';
import NoteModal from './modals/NoteModal';
import '../../styles/MedicalNotes.css';

const MedicalNotes = () => {
  const [notes, setNotes] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotes();
  }, [filter]);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const data = await getMedicalNotes(filter);
      setNotes(data);
    } catch (error) {
      console.error('Load notes error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async (note) => {
    try {
      await addMedicalNote(note);
      setShowModal(false);
      loadNotes();
    } catch (error) {
      console.error('Add note error:', error);
    }
  };

  if (loading) {
    return <div className="loading">Loading medical notes...</div>;
  }

  return (
    <div className="medical-notes">
      <div className="section-header">
        <h2>Medical Notes & Audit Trail</h2>
        <div className="actions">
          <button onClick={() => setShowModal(true)} className="primary-btn">
            + Add Clinical Note
          </button>
          <button onClick={loadNotes} className="refresh-btn">
            🔄 Refresh
          </button>
        </div>
      </div>

      <div className="filter-tabs">
        <button 
          className={filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
        >
          All Notes
        </button>
        <button 
          className={filter === 'requests' ? 'active' : ''}
          onClick={() => setFilter('requests')}
        >
          Requests
        </button>
        <button 
          className={filter === 'donors' ? 'active' : ''}
          onClick={() => setFilter('donors')}
        >
          Donors
        </button>
        <button 
          className={filter === 'units' ? 'active' : ''}
          onClick={() => setFilter('units')}
        >
          Blood Units
        </button>
      </div>

      <div className="notes-timeline">
        {notes.map(note => (
          <NoteCard key={note._id} note={note} />
        ))}
      </div>

      {notes.length === 0 && (
        <div className="no-data">No medical notes found</div>
      )}

      {showModal && (
        <NoteModal
          onClose={() => setShowModal(false)}
          onSubmit={handleAddNote}
        />
      )}
    </div>
  );
};

export default MedicalNotes;
