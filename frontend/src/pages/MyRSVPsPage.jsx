import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import QRModal from '../components/QRModal';
import api from '../api/client';
import {
  Ticket,
  Calendar,
  Clock,
  MapPin,
  Globe,
  QrCode,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

export default function MyRSVPsPage() {
  const { user } = useAuth();
  const [rsvps, setRsvps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);

  useEffect(() => {
    async function loadMyRSVPs() {
      if (!user) return;
      setLoading(true);
      setError(null);
      try {
        const data = await api.getMyRSVPs();
        setRsvps(data);
      } catch (err) {
        setError(err.message || 'Failed to fetch your RSVPs');
      } finally {
        setLoading(false);
      }
    }
    loadMyRSVPs();
  }, [user]);

  if (!user) {
    return (
      <div className="container" style={{ padding: '80px 0', textAlign: 'center' }}>
        <h2 style={{ marginBottom: 12 }}>Sign In Required</h2>
        <p style={{ color: '#94a3b8', marginBottom: 20 }}>
          Please sign in to view your registered event tickets and RSVPs.
        </p>
        <Link to="/auth" className="btn btn-primary">
          Sign In
        </Link>
      </div>
    );
  }

  const handleOpenTicketQR = (rsvp) => {
    setSelectedTicket(rsvp);
    setShowQRModal(true);
  };

  return (
    <div style={{ padding: '36px 0 80px' }}>
      <div className="container">
        
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '0.8rem',
              color: '#818cf8',
              fontWeight: 600,
              textTransform: 'uppercase',
              marginBottom: 6,
            }}
          >
            <Sparkles size={14} /> Attendee Pass Portal
          </div>
          <h1 style={{ fontSize: '2.2rem' }}>My Registered Events & Tickets</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>
            Access your fast-pass venue QR entry codes and manage your RSVP responses.
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: '14px 18px',
              borderRadius: '10px',
              background: 'rgba(244, 63, 94, 0.15)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              color: '#fda4af',
              marginBottom: '24px',
            }}
          >
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
            <div className="live-pulse" style={{ width: 14, height: 14, marginBottom: 12 }} />
            <div>Loading your event passes...</div>
          </div>
        ) : rsvps.length === 0 ? (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
            <Ticket size={48} color="#6366f1" style={{ margin: '0 auto 16px', opacity: 0.8 }} />
            <h3 style={{ fontSize: '1.25rem', color: '#f8fafc', marginBottom: 8 }}>No RSVPs yet</h3>
            <p style={{ maxWidth: '400px', margin: '0 auto 20px', fontSize: '0.9rem' }}>
              You have not registered for any upcoming events. Explore the event catalog to find workshops, conferences, and meetups!
            </p>
            <Link to="/events" className="btn btn-primary">
              Explore Events
            </Link>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
              gap: '24px',
            }}
          >
            {rsvps.map((rsvp) => (
              <div
                key={rsvp.id}
                className="glass-panel"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  border: rsvp.checked_in ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--border-subtle)',
                }}
              >
                {/* Card Top Banner */}
                <div
                  style={{
                    padding: '16px 20px',
                    background: 'rgba(15, 23, 42, 0.75)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className={`badge badge-${rsvp.status}`}>{rsvp.status}</span>
                    {rsvp.guests_count > 0 && (
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        +{rsvp.guests_count} guest{rsvp.guests_count > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {rsvp.checked_in ? (
                    <span style={{ color: '#34d399', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle2 size={14} /> Checked In
                    </span>
                  ) : (
                    <span style={{ color: '#64748b', fontSize: '0.78rem' }}>Admit Pass Ready</span>
                  )}
                </div>

                {/* Card Body */}
                <div style={{ padding: '20px', flex: 1 }}>
                  <h3 style={{ fontSize: '1.2rem', marginBottom: '12px' }}>{rsvp.event_name}</h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: 18 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Ticket size={15} color="#818cf8" />
                      <span>Ticket Pass ID: <b style={{ fontFamily: 'var(--font-mono)' }}>{rsvp.id.slice(0, 8)}...</b></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Calendar size={15} color="#818cf8" />
                      <span>RSVPed on: {new Date(rsvp.responded_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Digital Fast Pass Action */}
                  <button
                    className="btn btn-primary"
                    onClick={() => handleOpenTicketQR(rsvp)}
                    style={{ width: '100%', marginBottom: 10, padding: '10px' }}
                  >
                    <QrCode size={16} /> View Digital Fast-Pass QR
                  </button>
                </div>

                {/* Card Footer */}
                <div
                  style={{
                    padding: '12px 20px',
                    background: 'rgba(15, 23, 42, 0.45)',
                    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Link
                    to={`/events/${rsvp.event_id}`}
                    style={{ fontSize: '0.85rem', color: '#818cf8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    Event Details <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* QR Ticket Modal */}
        {selectedTicket && (
          <QRModal
            isOpen={showQRModal}
            onClose={() => setShowQRModal(false)}
            title={`Fast-Pass: ${selectedTicket.event_name}`}
            subtitle={`Attendee: ${user.full_name} (${selectedTicket.status.toUpperCase()})`}
            value={selectedTicket.id}
            type="ticket"
          />
        )}

      </div>
    </div>
  );
}
