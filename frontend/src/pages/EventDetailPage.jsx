import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import QRModal from '../components/QRModal';
import api from '../api/client';
import {
  Calendar,
  Clock,
  MapPin,
  Globe,
  Users,
  Share2,
  CheckCircle2,
  AlertCircle,
  Megaphone,
  UserCheck,
  Sparkles,
  ArrowLeft,
  Trash2,
  Edit,
  Plus,
  Radio,
  Download,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function EventDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isOrganizer } = useAuth();
  const { subscribeToEvent, unsubscribeFromEvent, eventCounts } = useWebSocket();

  const [event, setEvent] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [userRsvp, setUserRsvp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form states
  const [rsvpStatus, setRsvpStatus] = useState('going');
  const [guestsCount, setGuestsCount] = useState(0);
  const [submittingRsvp, setSubmittingRsvp] = useState(false);

  // Announcement form
  const [annTitle, setAnnTitle] = useState('');
  const [annMessage, setAnnMessage] = useState('');
  const [postingAnn, setPostingAnn] = useState(false);
  const [showAnnModal, setShowAnnModal] = useState(false);

  // QR Modal
  const [showQR, setShowQR] = useState(false);

  // Active tab in details view (for organizer)
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'attendees' | 'announcements'
  const [attendeeSearch, setAttendeeSearch] = useState('');

  // Subscribe to real-time event channel
  useEffect(() => {
    if (id) {
      subscribeToEvent(id);
    }
    return () => {
      if (id) unsubscribeFromEvent(id);
    };
  }, [id, subscribeToEvent, unsubscribeFromEvent]);

  // Load Event Data
  const loadEventData = async () => {
    setLoading(true);
    setError(null);
    try {
      const eventData = await api.getEvent(id);
      setEvent(eventData);

      // Load announcements
      try {
        const annData = await api.getAnnouncements(id);
        setAnnouncements(annData);
      } catch {}

      // If organizer or admin, load attendee RSVPs
      if (isOrganizer) {
        try {
          const rsvpList = await api.getEventRSVPs(id);
          setAttendees(rsvpList);
        } catch {}
      }

      // Check current user's RSVP
      if (user) {
        try {
          const myRsvps = await api.getMyRSVPs();
          const existing = myRsvps.find((r) => r.event_id === id);
          if (existing) {
            setUserRsvp(existing);
            setRsvpStatus(existing.status);
            setGuestsCount(existing.guests_count || 0);
          } else {
            setUserRsvp(null);
          }
        } catch {}
      }
    } catch (err) {
      setError(err.message || 'Failed to load event details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEventData();
  }, [id, user]);

  // Merge live counts
  const liveCount = eventCounts[id];
  const goingCount = liveCount ? liveCount.going : (event?.going_count || 0);
  const maybeCount = liveCount ? liveCount.maybe : (event?.maybe_count || 0);
  const notGoingCount = liveCount ? liveCount.not_going : (event?.not_going_count || 0);
  const waitlistCount = liveCount ? liveCount.waitlist : (event?.waitlist_count || 0);
  const checkedInCount = liveCount ? (liveCount.checked_in || 0) : 0;

  const maxCapacity = event?.max_capacity || 100;
  const capacityPercent = Math.min(100, Math.round((goingCount / maxCapacity) * 100));
  const isFull = goingCount >= maxCapacity;

  // Handle RSVP Submit
  const handleRsvpSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/auth');
      return;
    }
    setSubmittingRsvp(true);
    setError(null);

    try {
      let updated;
      if (userRsvp) {
        updated = await api.updateRSVP(id, rsvpStatus, Number(guestsCount));
      } else {
        updated = await api.submitRSVP(id, rsvpStatus, Number(guestsCount));
      }
      setUserRsvp(updated);

      if (rsvpStatus === 'going') {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      }

      await loadEventData();
    } catch (err) {
      setError(err.message || 'Error updating RSVP');
    } finally {
      setSubmittingRsvp(false);
    }
  };

  // Handle Cancel RSVP
  const handleCancelRsvp = async () => {
    if (!window.confirm('Are you sure you want to cancel your RSVP?')) return;
    setSubmittingRsvp(true);
    try {
      await api.cancelRSVP(id);
      setUserRsvp(null);
      await loadEventData();
    } catch (err) {
      setError(err.message || 'Failed to cancel RSVP');
    } finally {
      setSubmittingRsvp(false);
    }
  };

  // Handle Check-In Toggle
  const handleCheckIn = async (attendee) => {
    try {
      const updated = await api.checkInAttendee(id, attendee.id);
      setAttendees((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    } catch (err) {
      alert(err.message || 'Failed to toggle check-in');
    }
  };

  // Post Announcement
  const handlePostAnnouncement = async (e) => {
    e.preventDefault();
    if (!annTitle.trim() || !annMessage.trim()) return;
    setPostingAnn(true);
    try {
      const created = await api.createAnnouncement(id, annTitle, annMessage);
      setAnnouncements((prev) => [created, ...prev]);
      setAnnTitle('');
      setAnnMessage('');
      setShowAnnModal(false);
    } catch (err) {
      alert(err.message || 'Failed to post announcement');
    } finally {
      setPostingAnn(false);
    }
  };

  // Generate .ics Calendar export
  const handleExportICS = () => {
    if (!event) return;
    const startIso = new Date(event.event_date).toISOString().replace(/-|:|\.\d+/g, '');
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `SUMMARY:${event.event_name}`,
      `DESCRIPTION:${event.description || ''}`,
      `LOCATION:${event.venue || event.online_link || ''}`,
      `DTSTART:${startIso}`,
      `DTEND:${startIso}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `${event.event_name.replace(/\s+/g, '_')}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading && !event) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0', color: '#94a3b8' }}>
        <div className="live-pulse" style={{ width: 14, height: 14, marginBottom: 12 }} />
        <div>Connecting to event channel...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container" style={{ padding: '60px 0', textAlign: 'center' }}>
        <h2 style={{ marginBottom: 12 }}>Event Not Found</h2>
        <p style={{ color: '#94a3b8', marginBottom: 20 }}>This event does not exist or may have been removed.</p>
        <Link to="/events" className="btn btn-primary">
          <ArrowLeft size={16} /> Back to Events
        </Link>
      </div>
    );
  }

  const eventDate = new Date(event.event_date);
  const formattedDate = eventDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const shareUrl = `${window.location.origin}/events/${event.id}`;
  const isOrganizerOfThis = user?.id === event.organizer_id || user?.role === 'admin';

  const filteredAttendees = attendees.filter((a) => {
    const q = attendeeSearch.toLowerCase();
    return (
      (a.user_name && a.user_name.toLowerCase().includes(q)) ||
      (a.user_email && a.user_email.toLowerCase().includes(q)) ||
      (a.status && a.status.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ padding: '30px 0 80px' }}>
      <div className="container">
        
        {/* Back Link */}
        <Link
          to="/events"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            color: '#94a3b8',
            fontSize: '0.875rem',
            marginBottom: '20px',
          }}
        >
          <ArrowLeft size={16} /> Back to All Events
        </Link>

        {/* Hero Section */}
        <div className="glass-panel" style={{ padding: '32px', marginBottom: '32px', position: 'relative' }}>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    background: 'rgba(99, 102, 241, 0.2)',
                    color: '#a5b4fc',
                    border: '1px solid rgba(99, 102, 241, 0.35)',
                  }}
                >
                  {event.event_type}
                </span>

                <span className={`badge badge-${isFull ? 'full' : event.status}`}>
                  {isFull ? 'Capacity Full' : event.status}
                </span>

                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: '0.75rem',
                    padding: '3px 8px',
                    borderRadius: '999px',
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#34d399',
                    fontWeight: 600,
                  }}
                >
                  <span className="live-pulse" style={{ width: 6, height: 6 }} />
                  Live Sync
                </span>
              </div>

              <h1 style={{ fontSize: '2.4rem', lineHeight: 1.2, marginBottom: 10 }}>
                {event.event_name}
              </h1>

              <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                Organized by <b style={{ color: '#e2e8f0' }}>{event.organizer_name || 'Organizer'}</b>
              </div>
            </div>

            {/* Top Action Buttons */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" onClick={() => setShowQR(true)} style={{ padding: '8px 14px' }}>
                <Share2 size={16} /> Share & QR
              </button>
              <button className="btn btn-secondary" onClick={handleExportICS} style={{ padding: '8px 14px' }}>
                <Download size={16} /> Add to Calendar
              </button>
            </div>
          </div>

          {/* Quick Details Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 16,
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '14px',
              padding: '20px',
              marginBottom: 24,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Calendar size={20} color="#818cf8" />
              <div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Date</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>{formattedDate}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Clock size={20} color="#818cf8" />
              <div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Time</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>{event.start_time} - {event.end_time} UTC</div>
              </div>
            </div>

            {event.venue && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <MapPin size={20} color="#34d399" />
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Venue</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>{event.venue}</div>
                </div>
              </div>
            )}

            {event.online_link && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Globe size={20} color="#38bdf8" />
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Virtual Link</div>
                  <a
                    href={event.online_link}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: '0.95rem', fontWeight: 600, color: '#38bdf8', textDecoration: 'underline' }}
                  >
                    Join Online Meeting
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div style={{ fontSize: '1rem', color: '#cbd5e1', lineHeight: 1.7 }}>
            {event.description || 'No description provided.'}
          </div>
        </div>

        {/* Real-Time Live RSVP Counter & Registration Section */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, marginBottom: 36 }}>
          
          {/* Live Capacity Card */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Radio size={18} color="#10b981" /> Real-Time RSVP Tracker
              </h3>
              <span className="live-pulse" />
            </div>

            {/* Live Counts Counters */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  borderRadius: '12px',
                  padding: '14px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#34d399' }}>{goingCount}</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>
                  Going
                </div>
              </div>

              <div
                style={{
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  borderRadius: '12px',
                  padding: '14px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fbbf24' }}>{maybeCount}</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>
                  Maybe
                </div>
              </div>

              <div
                style={{
                  background: 'rgba(244, 63, 94, 0.1)',
                  border: '1px solid rgba(244, 63, 94, 0.25)',
                  borderRadius: '12px',
                  padding: '14px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fda4af' }}>{notGoingCount}</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>
                  Not Going
                </div>
              </div>
            </div>

            {/* Capacity Progress Bar */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 6 }}>
                <span style={{ color: '#94a3b8' }}>
                  Venue Utilization (<b>{goingCount}</b> of {maxCapacity} capacity)
                </span>
                <span style={{ fontWeight: 700, color: capacityPercent >= 90 ? '#f87171' : '#34d399' }}>
                  {capacityPercent}%
                </span>
              </div>
              <div className="capacity-bar" style={{ height: 10 }}>
                <div
                  className={`capacity-bar-fill ${
                    capacityPercent >= 100
                      ? 'capacity-fill-full'
                      : capacityPercent >= 80
                      ? 'capacity-fill-warning'
                      : 'capacity-fill-normal'
                  }`}
                  style={{ width: `${capacityPercent}%` }}
                />
              </div>
            </div>

            {waitlistCount > 0 && (
              <div
                style={{
                  padding: '10px 14px',
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: '8px',
                  color: '#fbbf24',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <AlertCircle size={16} />
                <span>
                  <b>{waitlistCount}</b> attendee(s) currently on waitlist queue.
                </span>
              </div>
            )}
          </div>

          {/* Attendee RSVP Form / Status Card */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: 16 }}>Your RSVP Status</h3>

            {user ? (
              <form onSubmit={handleRsvpSubmit}>
                {userRsvp && (
                  <div
                    style={{
                      padding: '12px 16px',
                      background:
                        userRsvp.status === 'going'
                          ? 'rgba(16, 185, 129, 0.15)'
                          : userRsvp.status === 'maybe'
                          ? 'rgba(245, 158, 11, 0.15)'
                          : 'rgba(244, 63, 94, 0.15)',
                      border: `1px solid ${
                        userRsvp.status === 'going'
                          ? 'rgba(16, 185, 129, 0.3)'
                          : userRsvp.status === 'maybe'
                          ? 'rgba(245, 158, 11, 0.3)'
                          : 'rgba(244, 63, 94, 0.3)'
                      }`,
                      borderRadius: '10px',
                      marginBottom: 16,
                      fontSize: '0.9rem',
                    }}
                  >
                    You are currently marked as:{' '}
                    <b style={{ textTransform: 'capitalize' }}>{userRsvp.status.replace('_', ' ')}</b>
                    {userRsvp.guests_count > 0 && ` (+${userRsvp.guests_count} guests)`}
                    {userRsvp.checked_in && (
                      <span style={{ display: 'block', color: '#34d399', marginTop: 4, fontWeight: 600 }}>
                        ✓ Checked in at the venue
                      </span>
                    )}
                  </div>
                )}

                {/* Status Selection */}
                <div className="form-group">
                  <label className="form-label">Will you attend?</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                    <button
                      type="button"
                      onClick={() => setRsvpStatus('going')}
                      style={{
                        padding: '12px',
                        borderRadius: '10px',
                        border: `1px solid ${rsvpStatus === 'going' ? '#10b981' : 'rgba(255,255,255,0.1)'}`,
                        background: rsvpStatus === 'going' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.04)',
                        color: rsvpStatus === 'going' ? '#34d399' : '#94a3b8',
                        fontWeight: 600,
                        fontSize: '0.9rem',
                      }}
                    >
                      Going
                    </button>

                    <button
                      type="button"
                      onClick={() => setRsvpStatus('maybe')}
                      style={{
                        padding: '12px',
                        borderRadius: '10px',
                        border: `1px solid ${rsvpStatus === 'maybe' ? '#f59e0b' : 'rgba(255,255,255,0.1)'}`,
                        background: rsvpStatus === 'maybe' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255,255,255,0.04)',
                        color: rsvpStatus === 'maybe' ? '#fbbf24' : '#94a3b8',
                        fontWeight: 600,
                        fontSize: '0.9rem',
                      }}
                    >
                      Maybe
                    </button>

                    <button
                      type="button"
                      onClick={() => setRsvpStatus('not_going')}
                      style={{
                        padding: '12px',
                        borderRadius: '10px',
                        border: `1px solid ${rsvpStatus === 'not_going' ? '#f43f5e' : 'rgba(255,255,255,0.1)'}`,
                        background: rsvpStatus === 'not_going' ? 'rgba(244, 63, 94, 0.2)' : 'rgba(255,255,255,0.04)',
                        color: rsvpStatus === 'not_going' ? '#fda4af' : '#94a3b8',
                        fontWeight: 600,
                        fontSize: '0.9rem',
                      }}
                    >
                      Not Going
                    </button>
                  </div>
                </div>

                {/* Additional Guests (+1) */}
                <div className="form-group" style={{ marginBottom: 20 }}>
                  <label className="form-label">Additional Guests (+1 / +2):</label>
                  <select
                    className="form-select"
                    value={guestsCount}
                    onChange={(e) => setGuestsCount(Number(e.target.value))}
                  >
                    <option value={0}>0 (Just myself)</option>
                    <option value={1}>+1 Guest</option>
                    <option value={2}>+2 Guests</option>
                    <option value={3}>+3 Guests</option>
                  </select>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="submit" className="btn btn-primary" disabled={submittingRsvp} style={{ flex: 1 }}>
                    {submittingRsvp ? 'Saving...' : userRsvp ? 'Update RSVP' : 'Confirm RSVP'}
                  </button>

                  {userRsvp && (
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={handleCancelRsvp}
                      disabled={submittingRsvp}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <p style={{ color: '#94a3b8', marginBottom: 16 }}>Sign in to register your RSVP for this event.</p>
                <Link to="/auth" className="btn btn-primary" style={{ width: '100%' }}>
                  Sign In to RSVP
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation for Event Management & Announcements */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            marginBottom: 24,
            paddingBottom: 10,
          }}
        >
          <button
            onClick={() => setActiveTab('overview')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.9rem',
              color: activeTab === 'overview' ? '#ffffff' : '#94a3b8',
              background: activeTab === 'overview' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
              border: `1px solid ${activeTab === 'overview' ? 'rgba(99, 102, 241, 0.4)' : 'transparent'}`,
            }}
          >
            📢 Announcements ({announcements.length})
          </button>

          {isOrganizerOfThis && (
            <button
              onClick={() => setActiveTab('attendees')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.9rem',
                color: activeTab === 'attendees' ? '#ffffff' : '#94a3b8',
                background: activeTab === 'attendees' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                border: `1px solid ${activeTab === 'attendees' ? 'rgba(99, 102, 241, 0.4)' : 'transparent'}`,
              }}
            >
              👥 Attendee Check-In ({attendees.length})
            </button>
          )}
        </div>

        {/* Announcements Tab */}
        {activeTab === 'overview' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: '1.25rem' }}>Official Event Announcements</h3>
              {isOrganizerOfThis && (
                <button className="btn btn-primary" onClick={() => setShowAnnModal(true)} style={{ padding: '8px 14px' }}>
                  <Plus size={16} /> Broadcast Announcement
                </button>
              )}
            </div>

            {announcements.length === 0 ? (
              <div className="glass-panel" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                <Megaphone size={36} color="#6366f1" style={{ margin: '0 auto 12px', opacity: 0.7 }} />
                <div>No announcements published yet.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {announcements.map((ann) => (
                  <div key={ann.id} className="glass-panel" style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <h4 style={{ fontSize: '1.1rem', color: '#f8fafc' }}>{ann.title}</h4>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        {new Date(ann.created_at).toLocaleDateString()} at{' '}
                        {new Date(ann.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p style={{ color: '#cbd5e1', lineHeight: 1.6, fontSize: '0.92rem' }}>{ann.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Attendees List & Check-In Tab */}
        {activeTab === 'attendees' && isOrganizerOfThis && (
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', marginBottom: 4 }}>Live Attendee Roster</h3>
                <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                  Total Responses: <b>{attendees.length}</b> | Checked In:{' '}
                  <b style={{ color: '#34d399' }}>{attendees.filter((a) => a.checked_in).length}</b>
                </div>
              </div>

              <input
                type="text"
                placeholder="Search attendee by name or email..."
                value={attendeeSearch}
                onChange={(e) => setAttendeeSearch(e.target.value)}
                className="form-input"
                style={{ maxWidth: '300px', height: '38px', fontSize: '0.85rem' }}
              />
            </div>

            {filteredAttendees.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>No attendees match your search.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', textAlign: 'left' }}>
                      <th style={{ padding: '10px 14px', color: '#94a3b8' }}>Attendee</th>
                      <th style={{ padding: '10px 14px', color: '#94a3b8' }}>Status</th>
                      <th style={{ padding: '10px 14px', color: '#94a3b8' }}>Guests</th>
                      <th style={{ padding: '10px 14px', color: '#94a3b8' }}>Check-in Status</th>
                      <th style={{ padding: '10px 14px', color: '#94a3b8', textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAttendees.map((att) => (
                      <tr
                        key={att.id}
                        style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', transition: 'background 0.15s' }}
                      >
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 600, color: '#f8fafc' }}>{att.user_name || 'Anonymous User'}</div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{att.user_email}</div>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span className={`badge badge-${att.status}`}>{att.status}</span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          {att.guests_count > 0 ? `+${att.guests_count}` : '0'}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          {att.checked_in ? (
                            <span style={{ color: '#34d399', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <CheckCircle2 size={15} /> Checked In
                            </span>
                          ) : (
                            <span style={{ color: '#64748b' }}>Not checked in</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          <button
                            className={att.checked_in ? 'btn btn-secondary' : 'btn btn-success'}
                            onClick={() => handleCheckIn(att)}
                            style={{ padding: '5px 12px', fontSize: '0.78rem' }}
                            disabled={att.status !== 'going'}
                          >
                            {att.checked_in ? 'Revoke Check-In' : 'Check In'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Broadcast Announcement Modal */}
        {showAnnModal && (
          <div className="modal-backdrop" onClick={() => setShowAnnModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3 style={{ marginBottom: 16 }}>Broadcast Announcement</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: 20 }}>
                This message will be instantly sent to all attendees registered for this event.
              </p>

              <form onSubmit={handlePostAnnouncement}>
                <div className="form-group">
                  <label className="form-label">Announcement Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Venue Room Update / Parking Details"
                    value={annTitle}
                    onChange={(e) => setAnnTitle(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Message Content</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Provide details about the update..."
                    value={annMessage}
                    onChange={(e) => setAnnMessage(e.target.value)}
                    className="form-textarea"
                  />
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                  <button type="submit" className="btn btn-primary" disabled={postingAnn} style={{ flex: 1 }}>
                    {postingAnn ? 'Sending...' : 'Publish & Broadcast'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowAnnModal(false)}
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* QR Code Share Modal */}
        <QRModal
          isOpen={showQR}
          onClose={() => setShowQR(false)}
          title={event.event_name}
          subtitle="Scan or copy link to RSVP for this event"
          value={shareUrl}
        />

      </div>
    </div>
  );
}
