import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import QRModal from './QRModal';
import api from '../api/client';
import {
  Calendar,
  Clock,
  MapPin,
  Globe,
  Users,
  Share2,
  CheckCircle,
  HelpCircle,
  XCircle,
  Sparkles,
  ArrowRight,
  UserCheck,
} from 'lucide-react';

export default function EventCard({ event, onRSVPChanged }) {
  const { user } = useAuth();
  const { eventCounts } = useWebSocket();
  const [showQR, setShowQR] = useState(false);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [userRsvp, setUserRsvp] = useState(null); // 'going', 'maybe', 'not_going'

  // Read real-time websocket count override if available
  const liveCount = eventCounts[event.id];
  const goingCount = liveCount ? liveCount.going : (event.going_count || 0);
  const maybeCount = liveCount ? liveCount.maybe : (event.maybe_count || 0);
  const notGoingCount = liveCount ? liveCount.not_going : (event.not_going_count || 0);
  const waitlistCount = liveCount ? liveCount.waitlist : (event.waitlist_count || 0);

  const maxCapacity = event.max_capacity || 100;
  const capacityPercent = Math.min(100, Math.round((goingCount / maxCapacity) * 100));
  const isFull = goingCount >= maxCapacity;

  // Format date
  const eventDate = new Date(event.event_date);
  const formattedDate = eventDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const handleQuickRSVP = async (status) => {
    if (!user) {
      alert('Please sign in to RSVP for events!');
      return;
    }
    setRsvpLoading(true);
    try {
      // Try creating RSVP, if 409 conflict, try update
      try {
        await api.submitRSVP(event.id, status, 0);
      } catch (err) {
        if (err.status === 409 && err.message.includes('already have an RSVP')) {
          await api.updateRSVP(event.id, status, 0);
        } else {
          throw err;
        }
      }
      setUserRsvp(status);
      if (onRSVPChanged) onRSVPChanged();
    } catch (err) {
      alert(err.message || 'Failed to submit RSVP');
    } finally {
      setRsvpLoading(false);
    }
  };

  const shareUrl = `${window.location.origin}/events/${event.id}`;

  return (
    <div
      className="glass-panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'transform 0.2s ease, border-color 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = 'var(--border-subtle)';
      }}
    >
      {/* Top Banner / Type Bar */}
      <div
        style={{
          padding: '16px 20px 12px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            padding: '3px 9px',
            borderRadius: '6px',
            background: 'rgba(99, 102, 241, 0.15)',
            color: '#a5b4fc',
            border: '1px solid rgba(99, 102, 241, 0.3)',
          }}
        >
          {event.event_type || 'General'}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className={`badge badge-${isFull ? 'full' : event.status}`}>
            {isFull ? 'Capacity Full' : event.status}
          </span>
          <button
            onClick={() => setShowQR(true)}
            style={{
              padding: '5px',
              borderRadius: '6px',
              color: '#94a3b8',
              background: 'rgba(255, 255, 255, 0.04)',
            }}
            title="Share & Invite QR"
          >
            <Share2 size={15} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Link to={`/events/${event.id}`}>
          <h3
            style={{
              fontSize: '1.2rem',
              marginBottom: '10px',
              color: '#f8fafc',
              lineHeight: 1.3,
            }}
          >
            {event.event_name}
          </h3>
        </Link>

        <p
          style={{
            fontSize: '0.875rem',
            color: '#94a3b8',
            marginBottom: '18px',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            lineHeight: 1.5,
          }}
        >
          {event.description || 'Join this exciting event to connect, learn, and collaborate.'}
        </p>

        {/* Event Meta Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px', fontSize: '0.85rem', color: '#cbd5e1' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={15} color="#818cf8" />
            <span>{formattedDate}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={15} color="#818cf8" />
            <span>{event.start_time} - {event.end_time} UTC</span>
          </div>
          {event.venue ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapPin size={15} color="#34d399" />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.venue}</span>
            </div>
          ) : event.online_link ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Globe size={15} color="#38bdf8" />
              <span>Virtual Event (Online)</span>
            </div>
          ) : null}
        </div>

        {/* Real-Time Capacity Bar */}
        <div style={{ marginTop: 'auto', paddingTop: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px' }}>
            <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Users size={14} color="#818cf8" />
              <b>{goingCount}</b> / {maxCapacity} Attending
            </span>
            <span style={{ fontWeight: 600, color: capacityPercent >= 90 ? '#f87171' : '#34d399' }}>
              {capacityPercent}% filled
            </span>
          </div>

          <div className="capacity-bar">
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

          {waitlistCount > 0 && (
            <div style={{ fontSize: '0.75rem', color: '#fbbf24', marginTop: '6px', fontWeight: 500 }}>
              ⚠️ {waitlistCount} waiting in queue
            </div>
          )}
        </div>
      </div>

      {/* Bottom RSVP & Details Action Bar */}
      <div
        style={{
          padding: '14px 20px',
          background: 'rgba(15, 23, 42, 0.65)',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
        }}
      >
        {/* Quick RSVP Button Group */}
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => handleQuickRSVP('going')}
            disabled={rsvpLoading}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '0.78rem',
              fontWeight: 600,
              background: userRsvp === 'going' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.05)',
              color: userRsvp === 'going' ? '#34d399' : '#cbd5e1',
              border: `1px solid ${userRsvp === 'going' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
            title="RSVP Going"
          >
            <CheckCircle size={13} /> Going
          </button>

          <button
            onClick={() => handleQuickRSVP('maybe')}
            disabled={rsvpLoading}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              fontSize: '0.78rem',
              fontWeight: 600,
              background: userRsvp === 'maybe' ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255, 255, 255, 0.05)',
              color: userRsvp === 'maybe' ? '#fbbf24' : '#94a3b8',
              border: `1px solid ${userRsvp === 'maybe' ? 'rgba(245, 158, 11, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
            }}
            title="RSVP Maybe"
          >
            Maybe
          </button>
        </div>

        {/* View Details Link */}
        <Link
          to={`/events/${event.id}`}
          style={{
            fontSize: '0.85rem',
            fontWeight: 600,
            color: '#818cf8',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          Details <ArrowRight size={14} />
        </Link>
      </div>

      {/* QR Code Modal */}
      <QRModal
        isOpen={showQR}
        onClose={() => setShowQR(false)}
        title={event.event_name}
        subtitle="Scan or copy link to RSVP and join this event"
        value={shareUrl}
      />
    </div>
  );
}
