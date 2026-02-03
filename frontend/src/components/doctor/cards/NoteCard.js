import React from 'react';
import './NoteCard.css';

const NoteCard = ({ note }) => {
  return (
    <div className="note-card">
      <div className="note-timeline">
        <div className="timeline-dot"></div>
        <div className="timeline-line"></div>
      </div>

      <div className="note-content">
        <div className="note-header">
          <span className={`note-type ${note.entityType}`}>
            {note.entityType}
          </span>
          <span className="note-time">{new Date(note.createdAt).toLocaleString()}</span>
        </div>

        <div className="note-body">
          <h4>{note.title}</h4>
          <p className="clinical-note">{note.clinicalNote}</p>
          
          {note.entityDetails && (
            <div className="entity-details">
              <strong>Related to:</strong> {note.entityDetails}
            </div>
          )}

          {note.decision && (
            <div className={`decision-badge ${note.decision}`}>
              Decision: {note.decision}
            </div>
          )}
        </div>

        <div className="note-footer">
          <span className="doctor-name">Dr. {note.doctorName}</span>
          <span className="note-id">#{note._id.slice(-6)}</span>
        </div>
      </div>
    </div>
  );
};

export default NoteCard;
