import React from 'react';
import './ReactionCard.css';

const ReactionCard = ({ reaction }) => {
  return (
    <div className={`reaction-card ${reaction.severity}`}>
      <div className="card-header">
        <h4>{reaction.donorName}</h4>
        <span className={`severity-badge ${reaction.severity}`}>
          {reaction.severity}
        </span>
      </div>

      <div className="card-body">
        <div className="info-row">
          <span className="label">Reaction Type:</span>
          <span className="value">{reaction.reactionType}</span>
        </div>
        <div className="info-row">
          <span className="label">Blood Unit:</span>
          <span className="value">{reaction.bloodUnitNumber}</span>
        </div>
        <div className="info-row">
          <span className="label">Symptoms:</span>
          <span className="value">{reaction.symptoms}</span>
        </div>
        <div className="info-row">
          <span className="label">Action Taken:</span>
          <span className="value">{reaction.actionTaken}</span>
        </div>
        <div className="info-row">
          <span className="label">Unit Status:</span>
          <span className={`value ${reaction.unitMarkedUnsafe ? 'unsafe' : 'safe'}`}>
            {reaction.unitMarkedUnsafe ? 'Marked Unsafe' : 'Safe'}
          </span>
        </div>
        <div className="info-row">
          <span className="label">Reported:</span>
          <span className="value">{new Date(reaction.createdAt).toLocaleString()}</span>
        </div>
        <div className="info-row">
          <span className="label">Reported By:</span>
          <span className="value">{reaction.reportedBy}</span>
        </div>
      </div>
    </div>
  );
};

export default ReactionCard;
