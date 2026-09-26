import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import api from '../api/client';
import {
  QrCode,
  Search,
  CheckCircle2,
  XCircle,
  Users,
  Radio,
  Sparkles,
  RefreshCw,
  UserCheck,
  AlertCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function CheckInKioskPage() {
  const { user, isOrganizer } = useAuth();
  const { subscribeToEvent, unsubscribeFromEvent } = useWebSocket();

  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [scanInput, setScanInput] = useState('');
  const [lastCheckIn, setLastCheckIn] = useState(null);
  const [message, setMessage] = useState(null);

  // Load organizer's events
  useEffect(() => {
    async function loadEvents() {
      try {
        const data = await api.getEvents();
        setEvents(data);
        if (data.length > 0 && !selectedEventId) {
          setSelectedEventId(data[0].id);
        }
      } catch {}
    }
    if (isOrganizer) {
      loadEvents();
    }
  }, [isOrganizer]);

  // Subscribe to WebSocket for selected event
  useEffect(() => {
    if (selectedEventId) {
      subscribeToEvent(selectedEventId);
      loadAttendees(selectedEventId);
    }
    return () => {
      if (selectedEventId) unsubscribeFromEvent(selectedEventId);
    };
  }, [selectedEventId]);

  const loadAttendees = async (eventId) => {
    setLoading(true);
    try {
      const data = await api.getEventRSVPs(eventId);
      setAttendees(data);
    } catch {
      setAttendees([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePerformCheckIn = async (rsvpOrUserId) => {
    if (!selectedEventId || !rsvpOrUserId) return;
    setMessage(null);
    try {
      const updated = await api.checkInAttendee(selectedEventId, rsvpOrUserId);
      setAttendees((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));

      setLastCheckIn(updated);
      if (updated.checked_in) {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
        });
        setMessage({
          type: 'success',
          text: `Verified! Welcome, ${updated.user_name || 'Attendee'}!`,
        });
      } else {
        setMessage({
          type: 'info',
          text: `Check-in revoked for ${updated.user_name || 'Attendee'}.`,
        });
      }
      setScanInput('');
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.message || 'Check-in failed. Please verify the ticket or ID.',
      });
    }
  };

  const handleScanSubmit = (e) => {
    e.preventDefault();
    if (!scanInput.trim()) return;
    handlePerformCheckIn(scanInput.trim());
  };

  const selectedEvent = events.find((e) => e.id === selectedEventId);
  const goingAttendees = attendees.filter((a) => a.status === 'going');
  const checkedInCount = attendees.filter((a) => a.checked_in).length;

  const filteredAttendees = attendees.filter((a) => {
    const q = searchQuery.toLowerCase();
    return (
      (a.user_name && a.user_name.toLowerCase().includes(q)) ||
      (a.user_email && a.user_email.toLowerCase().includes(q)) ||
      (a.id && a.id.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ padding: '36px 0 80px' }}>
      <div className="container">
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              borderRadius: '999px',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#34d399',
              fontSize: '0.85rem',
              fontWeight: 600,
              marginBottom: '12px',
            }}
          >
            <QrCode size={16} /> Venue Fast-Pass Check-In Kiosk
          </div>
          <h1 style={{ fontSize: '2.3rem', marginBottom: '8px' }}>Attendee Venue Scanner</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>
            Instant QR ticket validation, real-time headcounts, and verified door admissions.
          </p>
        </div>

        {/* Event Selector & Kiosk Stats Card */}
        <div
          className="glass-panel"
          style={{
            padding: '24px',
            marginBottom: '32px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 20,
          }}
        >
          <div style={{ flex: '1 1 300px' }}>
            <label className="form-label" style={{ marginBottom: 6 }}>
              Select Active Event:
            </label>
            <select
              className="form-select"
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              style={{ fontSize: '1rem', fontWeight: 600 }}
            >
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.event_name} ({new Date(e.event_date).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 16 }}>
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                padding: '12px 20px',
                borderRadius: '12px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#34d399' }}>{checkedInCount}</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>
                Checked In
              </div>
            </div>

            <div
              style={{
                background: 'rgba(99, 102, 241, 0.12)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                padding: '12px 20px',
                borderRadius: '12px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#818cf8' }}>{goingAttendees.length}</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>
                Confirmed Going
              </div>
            </div>
          </div>
        </div>

        {/* Scanner Input / Manual Lookup Box */}
        <div className="glass-panel" style={{ padding: '28px', marginBottom: '32px' }}>
          <h3 style={{ fontSize: '1.15rem', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <QrCode size={20} color="#818cf8" /> Scan QR / Enter Ticket Code or Attendee ID
          </h3>

          <form onSubmit={handleScanSubmit} style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <input
              type="text"
              placeholder="Scan barcode/QR string, or enter attendee user ID (e.g. att-001)..."
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              className="form-input"
              style={{ fontSize: '1rem', height: '48px', fontFamily: 'var(--font-mono)' }}
              autoFocus
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '0 24px', fontSize: '0.95rem' }}>
              <UserCheck size={18} /> Verify & Check In
            </button>
          </form>

          {/* Feedback Message */}
          {message && (
            <div
              style={{
                padding: '14px 18px',
                borderRadius: '10px',
                background:
                  message.type === 'success'
                    ? 'rgba(16, 185, 129, 0.2)'
                    : message.type === 'error'
                    ? 'rgba(244, 63, 94, 0.2)'
                    : 'rgba(99, 102, 241, 0.2)',
                border: `1px solid ${
                  message.type === 'success'
                    ? 'rgba(16, 185, 129, 0.4)'
                    : message.type === 'error'
                    ? 'rgba(244, 63, 94, 0.4)'
                    : 'rgba(99, 102, 241, 0.4)'
                }`,
                color: message.type === 'success' ? '#34d399' : message.type === 'error' ? '#fda4af' : '#a5b4fc',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontWeight: 600,
              }}
            >
              {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
              <span>{message.text}</span>
            </div>
          )}
        </div>

        {/* Live Attendee Directory */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 14,
              marginBottom: '20px',
            }}
          >
            <div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: 4 }}>Live Guest Roster</h3>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                Showing {filteredAttendees.length} attendee records
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ position: 'relative', width: '280px' }}>
                <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 12, top: 12 }} />
                <input
                  type="text"
                  placeholder="Search guest name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: 36, height: 38, fontSize: '0.85rem' }}
                />
              </div>

              <button
                className="btn btn-secondary"
                onClick={() => loadAttendees(selectedEventId)}
                style={{ padding: '8px 12px' }}
                title="Refresh Roster"
              >
                <RefreshCw size={15} />
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Loading attendee roster...</div>
          ) : filteredAttendees.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>No attendees found</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', textAlign: 'left' }}>
                    <th style={{ padding: '12px 14px', color: '#94a3b8' }}>Guest Name</th>
                    <th style={{ padding: '12px 14px', color: '#94a3b8' }}>RSVP Status</th>
                    <th style={{ padding: '12px 14px', color: '#94a3b8' }}>Guests</th>
                    <th style={{ padding: '12px 14px', color: '#94a3b8' }}>Check-in Status</th>
                    <th style={{ padding: '12px 14px', color: '#94a3b8', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAttendees.map((att) => (
                    <tr
                      key={att.id}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        background: att.checked_in ? 'rgba(16, 185, 129, 0.04)' : 'transparent',
                        transition: 'background 0.15s',
                      }}
                    >
                      <td style={{ padding: '14px' }}>
                        <div style={{ fontWeight: 600, color: '#f8fafc' }}>{att.user_name || 'Attendee'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          {att.user_email} • <span style={{ fontFamily: 'var(--font-mono)' }}>{att.user_id}</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px' }}>
                        <span className={`badge badge-${att.status}`}>{att.status}</span>
                      </td>
                      <td style={{ padding: '14px' }}>
                        {att.guests_count > 0 ? `+${att.guests_count}` : '0'}
                      </td>
                      <td style={{ padding: '14px' }}>
                        {att.checked_in ? (
                          <span style={{ color: '#34d399', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                            <CheckCircle2 size={16} /> Verified Check-In
                          </span>
                        ) : (
                          <span style={{ color: '#64748b' }}>Awaiting Arrival</span>
                        )}
                      </td>
                      <td style={{ padding: '14px', textAlign: 'right' }}>
                        <button
                          className={att.checked_in ? 'btn btn-secondary' : 'btn btn-success'}
                          onClick={() => handlePerformCheckIn(att.id)}
                          style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                          disabled={att.status !== 'going'}
                        >
                          {att.checked_in ? 'Undo Check-In' : 'Admit & Check In'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
