import React, { useState, useEffect } from 'react';
import { getAdverseReactions, logAdverseReaction } from '../../services/doctorApi';
import ReactionCard from './cards/ReactionCard';
import ReactionModal from './modals/ReactionModal';
import '../../styles/AdverseReactions.css';

const AdverseReactions = () => {
  const [reactions, setReactions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReactions();
  }, []);

  const loadReactions = async () => {
    try {
      setLoading(true);
      const data = await getAdverseReactions();
      setReactions(data);
    } catch (error) {
      console.error('Load reactions error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogReaction = async (reaction) => {
    try {
      await logAdverseReaction(reaction);
      setShowModal(false);
      loadReactions();
    } catch (error) {
      console.error('Log reaction error:', error);
    }
  };

  if (loading) {
    return <div className="loading">Loading adverse reactions...</div>;
  }

  return (
    <div className="adverse-reactions">
      <div className="section-header">
        <h2>Adverse Reaction & Incident Reporting</h2>
        <div className="actions">
          <button onClick={() => setShowModal(true)} className="primary-btn">
            + Log New Reaction
          </button>
          <button onClick={loadReactions} className="refresh-btn">
            🔄 Refresh
          </button>
        </div>
      </div>

      <div className="reactions-list">
        {reactions.map(reaction => (
          <ReactionCard key={reaction._id} reaction={reaction} />
        ))}
      </div>

      {reactions.length === 0 && (
        <div className="no-data">No adverse reactions recorded</div>
      )}

      {showModal && (
        <ReactionModal
          onClose={() => setShowModal(false)}
          onSubmit={handleLogReaction}
        />
      )}
    </div>
  );
};

export default AdverseReactions;
