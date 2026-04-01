import React, { useEffect, useMemo, useState } from 'react';
import {
  requestEmergencyDonorChain,
  respondEmergencyDonorChain,
  getMyEmergencyChainRequests,
  getMyPendingDonorChainActions,
  getEmergencyChainRequestById
} from '../../services/publicUserApi';
import { connectSocket, onEvent } from '../../services/socketService';
import './PeerEmergencyDonorChain.css';

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const urgencies = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const toTimeline = (request) => Array.isArray(request?.timeline) ? request.timeline.slice().sort((a, b) => new Date(a.ts) - new Date(b.ts)) : [];

export default function PeerEmergencyDonorChain() {
  const [form, setForm] = useState({
    bloodGroup: 'O+',
    urgency: 'HIGH',
    unitsNeeded: 1,
    location: { lat: '', lng: '', address: '' }
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [myRequests, setMyRequests] = useState([]);
  const [pendingAsDonor, setPendingAsDonor] = useState([]);
  const [activeRequestId, setActiveRequestId] = useState(null);
  const [liveUpdate, setLiveUpdate] = useState(null);
  const [error, setError] = useState('');

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  }, []);

  const userId = user.id || user._id;
  const userRole = user.role || 'PUBLIC_USER';

  const refreshData = async () => {
    const [myReqRes, pendingRes] = await Promise.all([
      getMyEmergencyChainRequests(),
      getMyPendingDonorChainActions()
    ]);

    if (myReqRes?.success) {
      setMyRequests(myReqRes.data || []);
      if (!activeRequestId && myReqRes.data?.length) {
        setActiveRequestId(myReqRes.data[0]._id);
      }
    }

    if (pendingRes?.success) {
      setPendingAsDonor(pendingRes.data || []);
    }
  };

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      bloodGroup: user?.bloodGroup || prev.bloodGroup
    }));
  }, [user]);

  useEffect(() => {
    refreshData();

    if (userId) {
      connectSocket(userId, userRole);
      const unsub = onEvent('donor_chain_update', async (payload) => {
        setLiveUpdate(payload || null);
        if (payload?.requestId) {
          setActiveRequestId(payload.requestId);
        }
        await refreshData();
      });

      return () => {
        unsub();
      };
    }

    return () => {};
  }, [userId, userRole]);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported in this browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((prev) => ({
          ...prev,
          location: {
            ...prev.location,
            lat: Number(position.coords.latitude.toFixed(6)),
            lng: Number(position.coords.longitude.toFixed(6))
          }
        }));
        setError('');
      },
      () => {
        setError('Unable to detect location. Please enter coordinates manually.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const submitRequest = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const payload = {
        bloodGroup: form.bloodGroup,
        urgency: form.urgency,
        unitsNeeded: Number(form.unitsNeeded),
        location: {
          lat: Number(form.location.lat),
          lng: Number(form.location.lng),
          address: form.location.address || ''
        }
      };

      if (!Number.isFinite(payload.location.lat) || !Number.isFinite(payload.location.lng)) {
        throw new Error('Please provide valid latitude and longitude.');
      }

      const response = await requestEmergencyDonorChain(payload);
      if (!response?.success) {
        throw new Error(response?.message || 'Failed to create emergency request');
      }

      const requestId = response?.data?._id;
      if (requestId) {
        setActiveRequestId(requestId);
        const details = await getEmergencyChainRequestById(requestId);
        if (details?.success) {
          setLiveUpdate({
            requestId,
            status: details.data.status,
            aiMessage: details.data.aiMessage,
            timeline: details.data.timeline,
            responses: details.data.responses
          });
        }
      }

      await refreshData();
    } catch (err) {
      setError(err.message || 'Unable to create request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const respondAsDonor = async (requestId, decision) => {
    setError('');
    const response = await respondEmergencyDonorChain(requestId, decision);
    if (!response?.success) {
      setError(response?.message || 'Failed to submit response.');
      return;
    }
    await refreshData();
  };

  const activeRequest = useMemo(() => {
    if (activeRequestId) {
      return myRequests.find((item) => String(item._id) === String(activeRequestId)) || null;
    }
    return myRequests[0] || null;
  }, [activeRequestId, myRequests]);

  const chainTimeline = useMemo(() => {
    if (liveUpdate?.requestId && String(liveUpdate.requestId) === String(activeRequest?._id)) {
      return toTimeline({ timeline: liveUpdate.timeline });
    }
    return toTimeline(activeRequest);
  }, [liveUpdate, activeRequest]);

  return (
    <div className="p2p-chain-shell">
      <div className="p2p-chain-header">
        <h2>Peer-to-Peer Emergency Donor Chain</h2>
        <p>Decentralized emergency donor matching with AI ranking and real-time chain updates.</p>
      </div>

      {error && <div className="p2p-chain-error">{error}</div>}

      <div className="p2p-chain-grid">
        <div className="p2p-chain-card">
          <h3>Create Emergency Request</h3>
          <form onSubmit={submitRequest} className="p2p-chain-form">
            <div className="p2p-row">
              <label>Blood Group</label>
              <select value={form.bloodGroup} onChange={(e) => setForm((prev) => ({ ...prev, bloodGroup: e.target.value }))}>
                {bloodGroups.map((group) => (
                  <option key={group} value={group}>{group}</option>
                ))}
              </select>
            </div>

            <div className="p2p-row">
              <label>Urgency</label>
              <select value={form.urgency} onChange={(e) => setForm((prev) => ({ ...prev, urgency: e.target.value }))}>
                {urgencies.map((urgency) => (
                  <option key={urgency} value={urgency}>{urgency}</option>
                ))}
              </select>
            </div>

            <div className="p2p-row">
              <label>Units Needed</label>
              <input
                type="number"
                min={1}
                max={20}
                value={form.unitsNeeded}
                onChange={(e) => setForm((prev) => ({ ...prev, unitsNeeded: e.target.value }))}
              />
            </div>

            <div className="p2p-row split">
              <div>
                <label>Latitude</label>
                <input
                  type="number"
                  value={form.location.lat}
                  onChange={(e) => setForm((prev) => ({ ...prev, location: { ...prev.location, lat: e.target.value } }))}
                />
              </div>
              <div>
                <label>Longitude</label>
                <input
                  type="number"
                  value={form.location.lng}
                  onChange={(e) => setForm((prev) => ({ ...prev, location: { ...prev.location, lng: e.target.value } }))}
                />
              </div>
            </div>

            <div className="p2p-row">
              <label>Address</label>
              <input
                type="text"
                value={form.location.address}
                onChange={(e) => setForm((prev) => ({ ...prev, location: { ...prev.location, address: e.target.value } }))}
                placeholder="Optional landmark or address"
              />
            </div>

            <div className="p2p-form-actions">
              <button type="button" onClick={detectLocation} className="p2p-button secondary">Use Current Location</button>
              <button type="submit" className="p2p-button primary" disabled={isSubmitting}>
                {isSubmitting ? 'Starting chain...' : 'Start Donor Chain'}
              </button>
            </div>
          </form>
        </div>

        <div className="p2p-chain-card">
          <h3>AI Chain Status</h3>
          <div className="p2p-ai-message">{liveUpdate?.aiMessage || activeRequest?.aiMessage || 'Finding best donors...'}</div>
          <div className="p2p-summary-row">
            <span>Status</span>
            <strong>{liveUpdate?.status || activeRequest?.status || 'IDLE'}</strong>
          </div>
          <div className="p2p-summary-row">
            <span>Responses</span>
            <strong>{(liveUpdate?.responses || activeRequest?.responses || []).length}</strong>
          </div>
          <div className="p2p-summary-row">
            <span>Current Request</span>
            <strong>{activeRequest ? String(activeRequest._id).slice(-8) : '-'}</strong>
          </div>
          {!!myRequests.length && (
            <div className="p2p-request-switcher">
              {myRequests.slice(0, 5).map((request) => (
                <button
                  key={request._id}
                  className={`p2p-chip ${String(activeRequestId) === String(request._id) ? 'active' : ''}`}
                  onClick={() => setActiveRequestId(request._id)}
                >
                  {request.bloodGroup} | {request.status}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="p2p-chain-card">
        <h3>Pending Donor Actions</h3>
        {!pendingAsDonor.length ? (
          <div className="p2p-muted">No active donor prompts right now.</div>
        ) : (
          <div className="p2p-donor-actions">
            {pendingAsDonor.map((pending) => (
              <div key={pending._id} className="p2p-donor-action-card">
                <div>
                  <strong>{pending.bloodGroup}</strong> | {pending.unitsNeeded} unit(s) | {pending.urgency}
                </div>
                <div className="p2p-action-buttons">
                  <button className="p2p-button accept" onClick={() => respondAsDonor(pending._id, 'ACCEPT')}>Accept</button>
                  <button className="p2p-button reject" onClick={() => respondAsDonor(pending._id, 'REJECT')}>Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p2p-chain-card">
        <h3>Live Response Timeline</h3>
        {!chainTimeline.length ? (
          <div className="p2p-muted">Timeline will appear when a request is active.</div>
        ) : (
          <div className="p2p-timeline">
            {chainTimeline.map((entry, index) => (
              <div key={`${entry.status}-${entry.ts}-${index}`} className="p2p-timeline-entry">
                <div className="p2p-dot" />
                <div>
                  <div className="p2p-timeline-status">{entry.status}</div>
                  <div className="p2p-timeline-message">{entry.message}</div>
                  <div className="p2p-timeline-time">{new Date(entry.ts).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
